import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Accept either base64 JSON { image } or multipart form from the client
    const contentType = req.headers.get('content-type') || '';
    const backend = process.env.BACKEND_URL || 'http://localhost:5000';

    let res: Response;

    if (contentType.includes('multipart/form-data')) {
      // Proxy multipart as-is
      const formData = await req.formData();
      res = await fetch(`${backend}/detect`, {
        method: 'POST',
        body: formData as any,
      });
    } else {
      // Default JSON body with base64 image
      const body = await req.json();
      const image: string | undefined = body?.image;
      if (!image) {
        return NextResponse.json(
          { error: "Missing image. Send multipart 'image' file or JSON { image: base64 }" },
          { status: 400 }
        );
      }

      res = await fetch(`${backend}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = await res.text();
      return NextResponse.json(
        {
          error: 'Backend returned non-JSON response',
          status: res.status,
          contentType: ct,
          body: text?.slice(0, 500),
        },
        { status: res.ok ? 200 : res.status }
      );
    }

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || 'Backend error' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}
