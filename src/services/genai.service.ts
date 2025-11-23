
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GenAIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  async generatePuzzleImage(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      });

      const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (base64ImageBytes) {
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      }
      throw new Error('No image generated');
    } catch (error) {
      console.error('GenAI Image Error:', error);
      throw error;
    }
  }

  async suggestTasks(): Promise<Array<{title: string}>> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Suggest 5 simple, healthy, positive daily habits for a mobile user. Return JSON.',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The habit title" }
              }
            }
          }
        }
      });
      
      const text = response.text;
      if (text) {
        return JSON.parse(text) as Array<{title: string}>;
      }
      return [];
    } catch (e) {
      console.error("GenAI Text Error", e);
      return [];
    }
  }
}
