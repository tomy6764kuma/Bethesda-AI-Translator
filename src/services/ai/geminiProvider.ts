import { AiProvider, TranslationRequestItem, TranslationResponseItem } from './types';
import { GlossaryEntry, AiSettings } from '../../types';
import { RecoveryService } from './recoveryService';

export class GeminiProvider implements AiProvider {
  name = 'Google Gemini';

  constructor(private settings: AiSettings) {}

  async translateBatch(
    items: TranslationRequestItem[],
    glossary: GlossaryEntry[],
    npcProfilesText?: string,
    onLog?: (msg: string) => void
  ): Promise<TranslationResponseItem[]> {
    const apiKey = this.settings.gemini.apiKey;
    const model = this.settings.gemini.model;

    if (!apiKey) {
      throw new Error('Gemini API Key is missing. Please configure it in Settings.');
    }

    const glossaryText = glossary.map(g => `${g.original} => ${g.translated}`).join('\n');
    const systemPrompt = RecoveryService.buildSystemPrompt(
      this.settings.systemPromptTemplate || '',
      this.settings.targetLanguage,
      glossaryText,
      npcProfilesText
    );

    const userPrompt = `Translate the following JSON list of texts:\n${JSON.stringify(items, null, 2)}`;

    onLog?.(`[Gemini] Sending batch of ${items.length} items to ${model}...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error('Gemini API returned empty content.');
    }

    onLog?.(`[Gemini] Response received. Parsing and verifying...`);
    return RecoveryService.parseAndRepairResponse(rawContent);
  }

  async callLlm(prompt: string, onLog?: (msg: string) => void): Promise<string> {
    const apiKey = this.settings.gemini.apiKey;
    const model = this.settings.gemini.model;

    if (!apiKey) {
      throw new Error('Gemini API Key is missing. Please configure it in Settings.');
    }

    onLog?.(`[Gemini] Sending general prompt to ${model}...`);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error('Gemini API returned empty content.');
    }

    return rawContent;
  }
}
