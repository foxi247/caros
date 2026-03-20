import axios from "axios";

// ─── NVIDIA API (OpenAI-compatible) ──────────────────────────────────────────
//
// Model: meta/llama-3.3-70b-instruct
// Endpoint: https://integrate.api.nvidia.com/v1
//
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

type LLMOptions = {
  messages: LLMMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
};

export async function invokeLLM(options: LLMOptions): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NVIDIA_API_KEY is not set. Add it to your .env file."
    );
  }

  const response = await axios.post(
    `${NVIDIA_BASE_URL}/chat/completions`,
    {
      model: NVIDIA_MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      top_p: options.topP ?? 0.7,
      max_tokens: options.maxTokens ?? 1024,
      stream: false,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 60_000,
    }
  );

  return response.data.choices[0].message.content as string;
}

// ─── Carousel Generation ──────────────────────────────────────────────────────

export type CarouselGenerationInput = {
  niche: string;
  tone: string;
  language: string;
  targetAudience: string;
};

export type GeneratedSlide = {
  slideNumber: number;
  heading: string;
  content: string;
  visualDescription: string;
  colorScheme: string;
  textAlignment: "left" | "center" | "right";
};

export type GeneratedCarousel = {
  title: string;
  caption: string;
  slides: GeneratedSlide[];
};

export async function generateCarouselContent(
  input: CarouselGenerationInput
): Promise<GeneratedCarousel> {
  const systemPrompt = `You are a professional Instagram carousel content creator.
Create engaging, viral-worthy carousel posts with 5-8 slides.
IMPORTANT: Respond with valid JSON ONLY. No markdown, no code blocks, no explanation.
The JSON must match this exact structure:
{
  "title": "carousel title",
  "caption": "instagram caption with hashtags (800-1200 chars)",
  "slides": [
    {
      "slideNumber": 1,
      "heading": "short slide heading",
      "content": "slide body text (2-4 sentences)",
      "visualDescription": "brief visual design note",
      "colorScheme": "primary: #hex, secondary: #hex, text: #hex",
      "textAlignment": "center"
    }
  ]
}`;

  const userPrompt = `Create an Instagram carousel post for:
- Niche/Topic: ${input.niche}
- Tone of voice: ${input.tone}
- Language: ${input.language}
- Target audience: ${input.targetAudience}

Generate 6 engaging slides. Return ONLY the JSON object.`;

  const raw = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    topP: 0.7,
    maxTokens: 2048,
  });

  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as GeneratedCarousel;
  } catch {
    // Try to extract JSON object from the response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as GeneratedCarousel;
    }
    throw new Error(
      "AI returned invalid JSON. Please try again."
    );
  }
}
