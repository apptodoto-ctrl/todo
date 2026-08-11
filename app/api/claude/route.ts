import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";
import { getSessionInfo, unauthorized } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const session = await getSessionInfo();
  if (!session) return unauthorized();
  try {
    const { prompt, systemPrompt } = await req.json();
    const text = await askClaude(prompt, {
      systemPrompt,
      maxTokens: 2048,
    });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Claude API error:", error);
    return NextResponse.json(
      { error: "Error al conectar con Claude. Verifica la API key." },
      { status: 500 }
    );
  }
}
