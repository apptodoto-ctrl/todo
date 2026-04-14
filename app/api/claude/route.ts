import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemPrompt } = await req.json();
    console.log("[Claude API] Request received, prompt length:", prompt?.length);
    const text = await askClaude(prompt, {
      systemPrompt,
      maxTokens: 2048,
    });
    console.log("[Claude API] Success, response length:", text?.length);
    return NextResponse.json({ text });
  } catch (error: unknown) {
    const err = error as Error & { status?: number; error?: { message?: string } };
    console.error("[Claude API] Error:", err.status, err.message, err.error?.message);
    return NextResponse.json(
      { error: `Error al conectar con Claude: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}
