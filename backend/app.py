import os
import base64
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import vision
from PIL import Image
from ultralytics import YOLO
import requests
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)
load_dotenv()

# Initialize Vision client lazily to avoid startup failure when ADC is missing
vision_client = None

# Initialize YOLOv8 once at startup (configurable via YOLO_MODEL env)
YOLO_MODEL_NAME = os.environ.get("YOLO_MODEL", "yolov8n.pt")
yolo_model = YOLO(YOLO_MODEL_NAME)

# OpenRouter configuration
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get(
    "OPENROUTER_MODEL",
    "mistralai/mistral-small-3.2-24b-instruct:free",
)

"""
Image generation removed per request: backend no longer creates or returns dish images.
"""

def generate_recipes_with_openrouter(ingredients):
    """
    Call OpenRouter to generate recipe ideas from a list of ingredients.
    Returns a list of recipes: [{name, description, cooking_time, instructions[]}]
    """
    if not OPENROUTER_API_KEY:
        return []
    try:
        prompt = (
            "Create 2 short recipe ideas that can be made using ONLY these ingredients if possible, "
            "or mostly them with common pantry items: " + ", ".join(ingredients) + ". "
            "Return STRICT JSON with key 'recipes' only, where each recipe has: "
            "name (string), description (string), cooking_time (string, e.g., '30 min'), "
            "and instructions (array of strings). No markdown, just plain JSON."
        )
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": "You are a helpful recipe assistant that outputs only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        resp = requests.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers, timeout=30)
        if resp.status_code != 200:
            return []
        data = resp.json()
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        # Attempt to parse JSON content
        import json
        try:
            # Strip markdown code fences if present
            txt = content.strip()
            if txt.startswith("```"):
                # Remove leading fence and optional language
                lines = txt.splitlines()
                # drop first line (``` or ```json)
                lines = lines[1:]
                # remove trailing ``` if present
                if lines and lines[-1].strip().startswith("```"):
                    lines = lines[:-1]
                txt = "\n".join(lines).strip()
            parsed = json.loads(txt)
            recipes = parsed.get("recipes")
            if isinstance(recipes, list):
                return recipes
        except Exception:
            pass
        # Fallback: return empty on parse failure
        return []
    except Exception:
        return []

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

@app.post("/ocr")
def ocr():
    try:
        global vision_client
        if vision_client is None:
            try:
                vision_client = vision.ImageAnnotatorClient()
            except Exception as e:
                return jsonify({
                    "error": "Vision client not configured. Set GOOGLE_APPLICATION_CREDENTIALS or run 'gcloud auth application-default login'",
                    "details": str(e)
                }), 503
        data = request.get_json(silent=True) or {}
        image_b64 = data.get("image")
        if not image_b64:
            return jsonify({"error": "Missing 'image' (base64 string) in request body"}), 400

        # Support data URLs (e.g., data:image/png;base64,....)
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        try:
            content = base64.b64decode(image_b64)
        except Exception:
            return jsonify({"error": "Invalid base64 image"}), 400

        image = vision.Image(content=content)
        response = vision_client.text_detection(image=image)

        if response.error.message:
            return jsonify({"error": response.error.message}), 502

        full = response.full_text_annotation
        text = full.text if full and getattr(full, 'text', None) else ""

        blocks = []
        if full and getattr(full, 'pages', None):
            for page in full.pages:
                for block in getattr(page, 'blocks', []) or []:
                    block_text_parts = []
                    for paragraph in getattr(block, 'paragraphs', []) or []:
                        for word in getattr(paragraph, 'words', []) or []:
                            word_text = ''.join((s.text or '') for s in getattr(word, 'symbols', []) or [])
                            if word_text:
                                block_text_parts.append(word_text)
                    block_text = ' '.join(block_text_parts)
                    blocks.append({
                        "text": block_text,
                        "confidence": getattr(block, 'confidence', None)
                    })

        return jsonify({"text": text, "blocks": blocks})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/detect")
def detect():
    """
    Accepts an image and returns YOLOv8 detections.
    - Preferred: multipart/form-data with key 'image' (or 'file').
    - Also supports JSON body { "image": "data:image/...;base64,...." }.
    Response: { detections: [ {label, confidence, box: [x1,y1,x2,y2]} ], width, height }
    """
    try:
        img_bytes = None

        # 1) multipart/form-data
        if request.files:
            f = request.files.get("image") or request.files.get("file")
            if f:
                img_bytes = f.read()

        # 2) JSON base64
        if img_bytes is None:
            data = request.get_json(silent=True) or {}
            image_b64 = data.get("image")
            if image_b64:
                if "," in image_b64:
                    image_b64 = image_b64.split(",", 1)[1]
                try:
                    img_bytes = base64.b64decode(image_b64)
                except Exception:
                    return jsonify({"error": "Invalid base64 image"}), 400

        if img_bytes is None:
            return jsonify({"error": "No image provided. Send as multipart 'image' or JSON 'image' base64"}), 400

        # Load into PIL
        pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
        width, height = pil_img.size

        # Inference
        results = yolo_model.predict(source=pil_img, verbose=False)
        detections = []
        if results:
            r0 = results[0]
            boxes = getattr(r0, 'boxes', None)
            names = getattr(r0, 'names', None) or yolo_model.names
            if boxes is not None:
                try:
                    xyxy = boxes.xyxy.cpu().numpy()
                    conf = boxes.conf.cpu().numpy()
                    cls = boxes.cls.cpu().numpy().astype(int)
                except Exception:
                    xyxy, conf, cls = [], [], []

                for i in range(len(xyxy)):
                    x1, y1, x2, y2 = [float(v) for v in xyxy[i]]
                    label = names[int(cls[i])] if names is not None else str(int(cls[i]))
                    detections.append({
                        "label": label,
                        "confidence": float(conf[i]),
                        "box": [x1, y1, x2, y2]
                    })

        return jsonify({
            "detections": detections,
            "width": width,
            "height": height
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/analyze")
def analyze():
    """
    Minimal analyze endpoint to keep the UI working.
    Accepts JSON { image: base64 or data URL }.
    Uses YOLO to detect objects and treats labels as 'ingredients'.
    Returns a structured response compatible with the UI.
    """
    try:
        data = request.get_json(silent=True) or {}
        image_b64 = data.get("image")
        if not image_b64:
            return jsonify({"error": "Missing 'image' (base64 string) in request body"}), 400

        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(image_b64)
        except Exception:
            return jsonify({"error": "Invalid base64 image"}), 400

        pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")

        # Run YOLO to get candidate ingredients (labels)
        results = yolo_model.predict(source=pil_img, verbose=False)
        labels = []
        if results:
            r0 = results[0]
            boxes = getattr(r0, 'boxes', None)
            names = getattr(r0, 'names', None) or yolo_model.names
            if boxes is not None and getattr(boxes, 'cls', None) is not None:
                try:
                    cls = boxes.cls.cpu().numpy().astype(int)
                except Exception:
                    cls = []
                for c in cls:
                    label = names[int(c)] if names is not None else str(int(c))
                    labels.append(label)

        # Unique, title-cased ingredients
        ingredients = sorted({str(l).strip().title() for l in labels if str(l).strip()})

        # Realistic shelf life data for common ingredients
        SHELF_LIFE_DATA = {
            # Fruits
            'Apple': {'days': 30, 'storage': 'Refrigerator'},
            'Banana': {'days': 5, 'storage': 'Room temperature'},
            'Orange': {'days': 14, 'storage': 'Refrigerator'},
            'Tomato': {'days': 7, 'storage': 'Room temperature'},
            'Strawberry': {'days': 3, 'storage': 'Refrigerator'},
            'Lemon': {'days': 14, 'storage': 'Refrigerator'},
            'Avocado': {'days': 5, 'storage': 'Room temperature'},
            'Grapes': {'days': 7, 'storage': 'Refrigerator'},
            'Mango': {'days': 5, 'storage': 'Room temperature'},
            'Pineapple': {'days': 5, 'storage': 'Refrigerator'},
            
            # Vegetables
            'Carrot': {'days': 21, 'storage': 'Refrigerator'},
            'Broccoli': {'days': 7, 'storage': 'Refrigerator'},
            'Spinach': {'days': 5, 'storage': 'Refrigerator'},
            'Potato': {'days': 60, 'storage': 'Cool, dark place'},
            'Onion': {'days': 30, 'storage': 'Cool, dark place'},
            'Garlic': {'days': 90, 'storage': 'Cool, dark place'},
            'Bell Pepper': {'days': 7, 'storage': 'Refrigerator'},
            'Cucumber': {'days': 7, 'storage': 'Refrigerator'},
            'Lettuce': {'days': 7, 'storage': 'Refrigerator'},
            'Mushroom': {'days': 5, 'storage': 'Refrigerator'},
            
            # Dairy & Eggs
            'Milk': {'days': 7, 'storage': 'Refrigerator'},
            'Cheese': {'days': 14, 'storage': 'Refrigerator'},
            'Yogurt': {'days': 14, 'storage': 'Refrigerator'},
            'Butter': {'days': 30, 'storage': 'Refrigerator'},
            'Egg': {'days': 28, 'storage': 'Refrigerator'},
            
            # Meats
            'Chicken': {'days': 2, 'storage': 'Refrigerator'},
            'Beef': {'days': 3, 'storage': 'Refrigerator'},
            'Pork': {'days': 3, 'storage': 'Refrigerator'},
            'Fish': {'days': 2, 'storage': 'Refrigerator'},
            'Shrimp': {'days': 2, 'storage': 'Refrigerator'},
            
            # Herbs
            'Basil': {'days': 5, 'storage': 'Refrigerator'},
            'Cilantro': {'days': 7, 'storage': 'Refrigerator'},
            'Parsley': {'days': 7, 'storage': 'Refrigerator'},
            'Mint': {'days': 7, 'storage': 'Refrigerator'},
            'Thyme': {'days': 10, 'storage': 'Refrigerator'},
        }
        
        # Default shelf life for unknown ingredients
        DEFAULT_SHELF_LIFE = {'days': 7, 'storage': 'Refrigerator'}
        
        # Look up shelf life for each ingredient, case-insensitive
        shelf_life = {}
        for ing in ingredients:
            # Try exact match first, then case-insensitive match
            shelf_info = SHELF_LIFE_DATA.get(ing) or next(
                (v for k, v in SHELF_LIFE_DATA.items() if k.lower() == ing.lower()),
                DEFAULT_SHELF_LIFE
            )
            shelf_life[ing] = shelf_info

        # Generate recipes via OpenRouter if we have ingredients and API key
        recipes = []
        if not ingredients:
            recipes = []
        else:
            # Call OpenRouter to generate recipes from detected ingredients
            recipes = generate_recipes_with_openrouter(ingredients)
            
            # Fallback to a simple recipe if OpenRouter fails or returns no recipes
            if not recipes:
                recipes = [
                    {
                        "name": "Fresh " + " ".join(ingredients[:2]).title() + " Dish",
                        "description": f"A simple dish using {', '.join(ingredients[:3])} and common pantry items.",
                        "cooking_time": "15 min",
                        "instructions": [
                            "Wash and prep ingredients.",
                            "Combine in a pan with oil and seasonings.",
                            "Cook until done and serve.",
                        ],
                    }
                ]

        return jsonify({
            "ingredients": ingredients,
            "shelf_life": shelf_life,
            "recipes": recipes
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/recipes")
def recipes_endpoint():
    """
    Accepts JSON { "ingredients": ["Tomato", "Basil", ...] }
    Returns { recipes: [...] } generated via OpenRouter.
    Does not run detection; for direct testing.
    """
    try:
        data = request.get_json(silent=True) or {}
        ing_list = data.get("ingredients")
        if not isinstance(ing_list, list) or not all(isinstance(x, str) for x in ing_list):
            return jsonify({"error": "Provide 'ingredients' as an array of strings"}), 400

        # Normalize: unique, title-case, non-empty
        ingredients = sorted({s.strip().title() for s in ing_list if isinstance(s, str) and s.strip()})
        if not ingredients:
            return jsonify({"error": "No valid ingredients provided"}), 400

        recipes = generate_recipes_with_openrouter(ingredients) or []
        if not recipes:
            # Minimal fallback
            recipes = [
                {
                    "name": "Pantry-Friendly Mix",
                    "description": "A simple dish using provided ingredients and common pantry items.",
                    "cooking_time": "15 min",
                    "instructions": [
                        "Prep all ingredients.",
                        "Season and combine in a pan.",
                        "Cook until flavors meld and serve.",
                    ],
                }
            ]

        return jsonify({"recipes": recipes})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
