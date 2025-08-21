"use client";

import React, { useCallback, useRef, useState } from "react";

export default function HomePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [det, setDet] = useState<any>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSize, setImgSize] = useState<{w:number; h:number}>({ w: 0, h: 0 });
  const [manualIngs, setManualIngs] = useState("");
  const [manualRecipes, setManualRecipes] = useState<any[] | null>(null);

  const onFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(String(e.target?.result));
      setResult(null);
      setDet(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onGenerateRecipes = async () => {
    setLoading(true);
    setError(null);
    setManualRecipes(null);
    try {
      const ingredients = manualIngs
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (ingredients.length === 0) {
        setError("Enter comma-separated ingredients first.");
        return;
      }
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Recipe generation failed");
      setManualRecipes(data.recipes || []);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) onFile(files[0]);
  };

  const onAnalyze = async () => {
    if (!selectedImage) {
      setError("Please choose an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setDet(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: selectedImage }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const onDetect = async () => {
    if (!selectedImage) {
      setError("Please choose an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setDet(null);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: selectedImage }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Detection failed");
      setDet(data);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <header style={{ textAlign: "center", color: "#5a3e2b", margin: "30px 0" }}>
        <h1 style={{ fontSize: 36, margin: 0, color: "#4a2f1a" }}>Creative Cookbook Companion</h1>
        <p style={{ marginTop: 6, color: "#8b5e3c" }}>Upload a photo of your ingredients and discover recipes</p>
      </header>

      <section style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Generate Recipes from Ingredients (no image)</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="e.g., tomato, basil, garlic, olive oil, pasta"
            value={manualIngs}
            onChange={(e) => setManualIngs(e.target.value)}
            style={{ flex: 1, minWidth: 260, padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <button
            onClick={onGenerateRecipes}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg,#c3f0ca,#a3e635)",
              color: "#234e52",
              border: 0,
              padding: "10px 16px",
              borderRadius: 999,
              fontSize: 14,
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? "Generating..." : "Generate Recipes"}
          </button>
        </div>
      </section>

      <section style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginBottom: 24 }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => document.getElementById("fileInput")?.click()}
          style={{
            border: "3px dashed #d69e2e",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            background: "#fffbea",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 18, color: "#555", marginBottom: 12 }}>
            Drag & drop your ingredient photo here or click to choose
          </div>
          <button
            style={{
              background: "linear-gradient(135deg,#f6e05e,#fbd38d)",
              color: "#5a3e2b",
              border: 0,
              padding: "12px 22px",
              borderRadius: 999,
              fontSize: 16,
            }}
          >
            Choose Photo
          </button>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </div>
      </section>

      {selectedImage && (
        <section style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginBottom: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                ref={imgRef}
                src={selectedImage}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 12 }}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  setImgSize({ w: el.clientWidth, h: el.clientHeight });
                }}
              />
              {det?.detections?.length > 0 && det?.width && det?.height && (
                det.detections.map((d: any, i: number) => {
                  const sx = imgSize.w && det.width ? imgSize.w / det.width : 1;
                  const sy = imgSize.h && det.height ? imgSize.h / det.height : 1;
                  const [x1, y1, x2, y2] = d.box;
                  const left = x1 * sx;
                  const top = y1 * sy;
                  const w = (x2 - x1) * sx;
                  const h = (y2 - y1) * sy;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left,
                        top,
                        width: w,
                        height: h,
                        border: "2px solid #b7791f",
                        borderRadius: 6,
                        boxShadow: "0 0 0 2px rgba(183,121,31,0.2)",
                        pointerEvents: "none",
                      }}
                    >
                      <div style={{
                        position: "absolute",
                        left: 0,
                        top: -24,
                        background: "#b7791f",
                        color: "#fff9db",
                        padding: "2px 6px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {d.label} {(d.confidence*100).toFixed(1)}%
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={onAnalyze}
                disabled={loading}
                style={{
                  marginTop: 16,
                  background: "linear-gradient(135deg,#f6d365,#fda085)",
                  color: "#5a3e2b",
                  border: 0,
                  padding: "12px 20px",
                  borderRadius: 999,
                  fontSize: 16,
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? "Analyzing..." : "Analyze Ingredients"}
              </button>
              <button
                onClick={onDetect}
                disabled={loading}
                style={{
                  marginTop: 16,
                  background: "linear-gradient(135deg,#f6e05e,#fbd38d)",
                  color: "#5a3e2b",
                  border: 0,
                  padding: "12px 20px",
                  borderRadius: 999,
                  fontSize: 16,
                  opacity: loading ? 0.8 : 1,
                }}
              >
                {loading ? "Detecting..." : "Detect Objects"}
              </button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div style={{ background: "#ff6b6b", color: "#fff", padding: 16, borderRadius: 8, marginBottom: 16 }}>{error}</div>
      )}

      {det?.detections && det.detections.length > 0 && (
        <section style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Detections</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {det.detections.map((d: any, i: number) => (
              <span key={i} style={{ background: "#fff3c4", color: "#8b5e3c", padding: "6px 10px", borderRadius: 999, fontSize: 12 }}>
                {d.label} ({(d.confidence*100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </section>
      )}

      {result && (
        <section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginBottom: 24 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0 }}>Identified Ingredients</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.ingredients.map((ing: string, i: number) => (
                  <span key={i} style={{ background: "linear-gradient(135deg,#f6e05e,#fbd38d)", color: "#5a3e2b", padding: "6px 12px", borderRadius: 999, fontSize: 12 }}>
                    {ing}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
              <h3 style={{ marginTop: 0 }}>Shelf Life Information</h3>
              <div>
                {Object.entries(result.shelf_life).map(([ing, info]: any, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "#f8f9ff", padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <span>{ing}</span>
                    <span style={{ color: "#8b5e3c", fontWeight: 600 }}>{info.days} days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0 }}>Creative Recipes</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 16 }}>
              {result.recipes.map((rec: any, idx: number) => (
                <div key={idx} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                  <div style={{ padding: 16 }}>
                    <h4 style={{ margin: "0 0 8px" }}>{rec.name}</h4>
                    <p style={{ margin: "0 0 12px", color: "#555" }}>{rec.description}</p>
                    <div style={{ display: "inline-block", background: "#fff3c4", color: "#786c3b", padding: "6px 12px", borderRadius: 999, fontSize: 12, marginBottom: 8 }}>
                      {rec.cooking_time}
                    </div>
                    <ol style={{ paddingLeft: 18, margin: 0 }}>
                      {rec.instructions.map((ins: string, i: number) => (
                        <li key={i} style={{ marginBottom: 6 }}>{ins}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {manualRecipes && manualRecipes.length > 0 && (
        <section style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Recipes from Provided Ingredients</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 16 }}>
            {manualRecipes.map((rec: any, idx: number) => (
              <div key={idx} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                <div style={{ padding: 16 }}>
                  <h4 style={{ margin: "0 0 8px" }}>{rec.name}</h4>
                  <p style={{ margin: "0 0 12px", color: "#555" }}>
                    {rec.description}
                  </p>
                  <div style={{ display: "inline-block", background: "#fff3c4", color: "#786c3b", padding: "6px 12px", borderRadius: 999, fontSize: 12, marginBottom: 8 }}>
                    {rec.cooking_time}
                  </div>
                  <ol style={{ paddingLeft: 18, margin: 0 }}>
                    {rec.instructions?.map((ins: string, i: number) => (
                      <li key={i} style={{ marginBottom: 6 }}>{ins}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
