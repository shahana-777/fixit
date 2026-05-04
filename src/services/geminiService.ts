/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { Message, ConfusionType, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `You are AI Chat from Fix It, an elegant, refined, and highly intellectual learning assistant. 
Your primary purpose is to help students achieve true understanding by breaking down complex concepts into elegant, simple, and logical truths.

GUIDELINES:
1. Tone: Sophisticated yet accessible. You are like a world-class tutor who speaks with clarity and poise.
2. Explanations: Deconstruct complexity. Start from first principles.
3. ADAPTIVE LOGIC:
   - Discreetly identify if the stumbling block is CONCEPTUAL, COMPUTATIONAL (Calculation), or LINGUISTIC.
   - If intuitive barriers remain, use SHARP ANALOGIES or COMPELLING STORIES that illustrate the heart of the matter.
4. VISUAL AID: If the concept would be significantly clearer with a diagram, illustration, or visual map, provide a "visualPrompt" in the metadata. This prompt should describe a clean, educational illustration in a minimalistic, elegant style.
5. LANGUAGE: Respond strictly in the 'Preferred Response Language' specified in the prompt. If it is Hindi or Kannada, your entire explanation, including step-by-step logic and stories, must be in that language using the appropriate script (Devanagari for Hindi, Kannada script for Kannada). Keep the tone elegant and sophisticated in all languages.
6. FORMAT: Use clean, well-spaced Markdown.

CRITICAL: At the end of your response, always include a hidden metadata section in valid JSON format like this:
---METADATA---
{
  "confusionType": "concept" | "calculation" | "language" | "none",
  "briefReason": "Surgical diagnosis of the student's current barrier",
  "visualPrompt": "Detailed description of a helpful educational diagram or illustration (optional, keep null if not needed)"
}
---END---`;

export async function getEduBuddyResponse(history: Message[], newUserMessage: string, context?: string, preferredLanguage: Language = 'en-US') {
  const langMap: Record<Language, string> = {
    'en-US': 'English',
    'kn-IN': 'Kannada',
    'hi-IN': 'Hindi'
  };

  const contents = [
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model' as any,
      parts: [{ text: m.content }]
    })),
    {
      role: 'user',
      parts: [{ text: `${context ? `Context from PDF:\n${context}\n\n` : ''}Preferred Response Language: ${langMap[preferredLanguage]}\n\nStudent Question: ${newUserMessage}` }]
    }
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    const fullText = response.text || "I'm sorry, I'm having a little trouble thinking right now. Let's try again! 🌈";
    
    // Parse metadata
    const metadataMatch = fullText.match(/---METADATA---([\s\S]*?)---END---/);
    let cleanText = fullText.replace(/---METADATA---[\s\S]*?---END---/, '').trim();
    let confusionMeta = { type: ConfusionType.NONE, explanation: "All good!" };
    let visualPrompt = null;

    if (metadataMatch) {
      try {
        const parsed = JSON.parse(metadataMatch[1].trim());
        confusionMeta = {
          type: parsed.confusionType,
          explanation: parsed.briefReason
        };
        visualPrompt = parsed.visualPrompt;
      } catch (e) {
        console.error("Failed to parse metadata", e);
      }
    }

    return { text: cleanText, confusionMeta, visualPrompt: visualPrompt || null };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Oh no! My teacher-brain is a bit fuzzy. Are you connected to the internet? 🌐", confusionMeta: { type: ConfusionType.NONE, explanation: "Error" }, visualPrompt: null };
  }
}

export async function generateVisualRepresentation(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `${prompt}. Style: Clean, professional, educational diagram, minimalistic white background, elegant line art.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    const candidates = (response as any).candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
}
