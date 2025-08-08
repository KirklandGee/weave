// src/app/api/agent/execute/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';

export async function POST(req: Request) {

  const { userId, getToken } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read the raw JSON body
  const body = await req.text();

  const backend = process.env.BACKEND_URL ?? 'http://localhost:8000';
  // Get the token properly
  const token = await getToken();
  
  const upstream = await fetch(`${backend}/agent/execute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body,
  });

  if (!upstream.ok) {
    console.error('⚠️ upstream error', upstream.status);
    return new NextResponse(null, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}