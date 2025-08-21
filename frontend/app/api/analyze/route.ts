import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const image: string | undefined = body?.image;
    if (!image) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 });
    }

    const backend = process.env.BACKEND_URL || 'http://localhost:5000';

    const res = await fetch(`${backend}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const textBody = await res.text();
      return NextResponse.json(
        {
          error: 'Backend returned non-JSON response',
          status: res.status,
          body: textBody.slice(0, 500),
        },
        { status: 502 }
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
