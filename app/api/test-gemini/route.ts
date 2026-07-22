import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || apiKey.trim().length < 5) {
      return NextResponse.json({ success: false, message: 'Please enter a valid API key' });
    }

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Hello' }] }],
            }),
          }
        );

        if (res.ok) {
          return NextResponse.json({ success: true, model, message: 'Gemini API Key is valid & working!' });
        }

        const data = await res.json();
        if (data?.error?.message?.includes('API key not valid')) {
          return NextResponse.json({
            success: false,
            message: 'Invalid API Key. Please get a free API key from https://aistudio.google.com',
          });
        }
      } catch { }
    }

    return NextResponse.json({
      success: false,
      message: 'Gemini API Key validation failed. Check your key at https://aistudio.google.com',
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Validation error' });
  }
}
