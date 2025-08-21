import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const image: string | undefined = body?.image;
    if (!image) {
      return NextResponse.json({ error: 'Missing image (base64 string expected as body.image)' }, { status: 400 });
    }

    const backend = process.env.BACKEND_URL || 'http://localhost:5000';

    const res = await fetch(`${backend}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || 'Backend error' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}
