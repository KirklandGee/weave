// src/app/api/llm/chat/stream/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Read the raw JSON body
  const body = await request.text();

  const backend = process.env.BACKEND_URL ?? 'http://localhost:8000';
  console.log('📤 proxying to:', `${backend}/llm/chat/stream`);

  const upstream = await fetch(`${backend}/llm/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!upstream.ok) {
    console.error('⚠️ upstream error', upstream.status);
    return new NextResponse(null, { status: upstream.status });
  }

  console.log('📥 got headers:', upstream.headers.get('transfer-encoding'));

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type':   upstream.headers.get('content-type') || 'text/plain',
      'Cache-Control':  'no-cache',
      'Connection':     'keep-alive',
    },
  });
}