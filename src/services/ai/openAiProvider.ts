import { AiProvider, TranslationRequestItem, TranslationResponseItem } from './types';
import { GlossaryEntry, AiSettings } from '../../types';
import { RecoveryService } from './recoveryService';

export class OpenAiProvider implements AiProvider {
  name = 'OpenAI / Compatible API';

  constructor(private settings: AiSettings) {}

  async translateBatch(
    items: TranslationRequestItem[],
    glossary: GlossaryEntry[],
    npcProfilesText?: string,
    onLog?: (msg: string) => void,
    systemPromptTemplateOverride?: string
  ): Promise<TranslationResponseItem[]> {
    const apiKey = this.settings.openai.apiKey;
    const model = this.settings.openai.model;
    const baseUrl = this.settings.openai.baseUrl || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('OpenAI API Key is missing. Please configure it in Settings.');
    }

    const glossaryText = glossary.map(g => `${g.original} => ${g.translated}`).join('\n');
    const systemPrompt = RecoveryService.buildSystemPrompt(
      this.settings.systemPromptTemplate || '',
      this.settings.targetLanguage,
      glossaryText,
      npcProfilesText,
      systemPromptTemplateOverride
    );
    const userPrompt = `Translate the following JSON list of texts:\n${JSON.stringify(items, null, 2)}`;

    let cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    if (!cleanBaseUrl.endsWith('/chat/completions')) {
      cleanBaseUrl += '/chat/completions';
    }

    onLog?.(`[OpenAI] Sending batch of ${items.length} items to ${model} at ${cleanBaseUrl}...`);

    const isLocal = cleanBaseUrl.includes('localhost') || cleanBaseUrl.includes('127.0.0.1');

    const requestBody: any = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    };

    // OpenAI本家のみ JSON mode を有効にする（ローカル互換APIの400エラー防止）
    if (!isLocal) {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch(cleanBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Origin': 'http://127.0.0.1'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const debugInfo = `(Model: ${model}, URL: ${cleanBaseUrl}, Prompt Chars: system=${systemPrompt.length}, user=${userPrompt.length})`;
      throw new Error(`OpenAI API Error (${response.status}): ${errorText || 'Empty Response'} ${debugInfo}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('OpenAI API returned empty content.');
    }

    onLog?.(`[OpenAI] Response received. Parsing and verifying...`);
    return RecoveryService.parseAndRepairResponse(rawContent);
  }

  async callLlm(prompt: string, onLog?: (msg: string) => void): Promise<string> {
    const apiKey = this.settings.openai.apiKey;
    const model = this.settings.openai.model;
    const baseUrl = this.settings.openai.baseUrl || 'https://api.openai.com/v1';

    if (!apiKey && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      throw new Error('OpenAI API Key is missing. Please configure it in Settings.');
    }

    let cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    if (!cleanBaseUrl.endsWith('/chat/completions')) {
      cleanBaseUrl += '/chat/completions';
    }

    onLog?.(`[OpenAI] Sending general prompt to ${model} at ${cleanBaseUrl}...`);

    const response = await fetch(cleanBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('OpenAI API returned empty content.');
    }

    return rawContent;
  }
}
