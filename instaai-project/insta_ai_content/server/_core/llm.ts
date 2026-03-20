import axios from "axios";

type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

type LLMOptions = {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export async function invokeLLM(options: LLMOptions): Promise<string> {
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL || "https://api.openai.com/v1";

  const response = await axios.post(
    `${apiUrl}/chat/completions`,
    {
      model: options.model || "gpt-4o",
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return response.data.choices[0].message.content;
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
Always respond with valid JSON only, no markdown code blocks.
The JSON must match this exact structure:
{
  "title": "carousel title",
  "caption": "instagram caption with hashtags (1000-1500 chars)",
  "slides": [
    {
      "slideNumber": 1,
      "heading": "slide heading",
      "content": "slide text content",
      "visualDescription": "description for visual design",
      "colorScheme": "primary: #hex, secondary: #hex, text: #hex",
      "textAlignment": "center"
    }
  ]
}`;

  const userPrompt = `Create an Instagram carousel for:
- Niche/Topic: ${input.niche}
- Tone of voice: ${input.tone}
- Language: ${input.language}
- Target audience: ${input.targetAudience}

Generate 6-8 engaging slides. Make them visually descriptive and compelling.`;

  const raw = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    maxTokens: 4000,
  });

  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as GeneratedCarousel;
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }
}
