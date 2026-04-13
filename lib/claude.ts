import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in environment variables");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Sends a message to Claude and returns the text response.
 * Only call this from Server Components, Route Handlers, or Server Actions.
 */
export async function askClaude(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  const {
    model = "claude-sonnet-4-6",
    maxTokens = 1024,
    systemPrompt,
  } = options ?? {};

  const message = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    ...(systemPrompt && { system: systemPrompt }),
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return block.text;
}
