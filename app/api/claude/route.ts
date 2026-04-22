import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";

export async function POST(req: NextRequest) {
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
