import { GoogleGenAI, Type, GenerateContentResponse, Modality, ThinkingLevel } from "@google/genai";

// We'll initialize this dynamically to ensure we use the latest API key
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export const PRO_IMAGE_MODEL = "gemini-3-pro-image-preview";
export const FLASH_IMAGE_MODEL = "gemini-2.5-flash-image";
export const VIDEO_MODEL = "veo-3.1-fast-generate-preview";

export interface GenerationStyle {
  id: string;
  name: string;
  promptSuffix: string;
  description: string;
}

export const GENERATION_STYLES: GenerationStyle[] = [
  {
    id: "cinematic",
    name: "Cinematic",
    promptSuffix: "cinematic lighting, high-end commercial look, shallow depth of field, 8k resolution, professional product photography",
    description: "High-end commercial feel with dramatic lighting."
  },
  {
    id: "minimalist",
    name: "Minimalist",
    promptSuffix: "clean white background, soft shadows, minimalist aesthetic, Apple-style product photography, sharp focus",
    description: "Clean, modern, and focused on the product."
  },
  {
    id: "vibrant",
    name: "Vibrant Pop",
    promptSuffix: "vibrant colors, dynamic composition, pop art influence, energetic lighting, high contrast",
    description: "Bold colors and high energy for social media."
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    promptSuffix: "natural environment, cozy atmosphere, realistic setting, soft natural light, authentic feel",
    description: "Product in a real-world, relatable context."
  },
  {
    id: "futuristic",
    name: "Futuristic Tech",
    promptSuffix: "neon accents, dark background, holographic elements, sci-fi aesthetic, sleek and high-tech",
    description: "Sleek, tech-focused look with neon vibes."
  }
];

export async function generateProductRecommendations(
  assets: { product?: string; model?: string; costume?: string; ornament?: string }, 
  style: GenerationStyle,
  productPrompt?: string
) {
  const ai = getAI();
  
  const parts: any[] = [];
  let assetDescription = "";
  
  if (assets.product) {
    parts.push({ inlineData: { data: assets.product.split(',')[1], mimeType: "image/png" } });
    assetDescription += "the provided product image, ";
  }
  if (assets.model) {
    parts.push({ inlineData: { data: assets.model.split(',')[1], mimeType: "image/png" } });
    assetDescription += "the provided model, ";
  }
  if (assets.costume) {
    parts.push({ inlineData: { data: assets.costume.split(',')[1], mimeType: "image/png" } });
    assetDescription += "the specific costume/clothing, ";
  }
  if (assets.ornament) {
    parts.push({ inlineData: { data: assets.ornament.split(',')[1], mimeType: "image/png" } });
    assetDescription += "the additional ornament/background element, ";
  }

  const contextText = productPrompt ? `\nPRODUCT CONTEXT & CONCEPT: ${productPrompt}\n` : "";

  const prompts = [
    `ACT AS A WORLD-CLASS ADVERTISING PHOTOGRAPHER. Create a MASTERPIECE ad concept using ${assetDescription || "the product"}. ${contextText}
    The composition should be a high-end commercial shot. 
    Style: ${style.name}. ${style.promptSuffix}. 
    If a model is provided, they should be interacting naturally with the product. 
    If a costume is provided, the model MUST wear it. 
    The lighting should be dramatic and professional.`,

    `ACT AS A VIRAL CONTENT CREATOR. Create a dynamic, high-energy social media ad frame using ${assetDescription || "the product"}. ${contextText}
    Style: ${style.name}. ${style.promptSuffix}. 
    Focus on a "scroll-stopping" visual composition that highlights the product's appeal. 
    Use creative angles and vibrant atmosphere.`,

    `ACT AS A LIFESTYLE MAGAZINE EDITOR. Create an authentic, relatable lifestyle ad concept using ${assetDescription || "the product"}. ${contextText}
    Style: ${style.name}. ${style.promptSuffix}. 
    The setting should feel real and aspirational. 
    The product should be the hero of the scene in a natural environment.`,

    `ACT AS A FUTURISTIC BRAND DESIGNER. Create a sleek, ultra-modern tech ad concept using ${assetDescription || "the product"}. ${contextText}
    Style: ${style.name}. ${style.promptSuffix}. 
    Use abstract elements, clean lines, and sophisticated lighting to make the product look like a premium innovation.`
  ];

  const generationPromises = prompts.map(promptText => 
    ai.models.generateContent({
      model: FLASH_IMAGE_MODEL,
      contents: {
        parts: [...parts, { text: promptText }]
      }
    })
  );

  const results = await Promise.all(generationPromises);
  const images: string[] = [];

  for (const response of results) {
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    }
  }

  return images;
}

export async function generateTTS(script: string, voice: string = 'Kore') {
  const ai = getAI();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: script }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice as any },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
}

export async function generateVideo(imageBase64: string, prompt: string) {
  // Veo requires user-provided API key
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY; 
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  let operation = await ai.models.generateVideos({
    model: VIDEO_MODEL,
    prompt: prompt,
    image: {
      imageBytes: imageBase64.split(',')[1],
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16' 
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  
  const response = await fetch(downloadLink!, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey!,
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
