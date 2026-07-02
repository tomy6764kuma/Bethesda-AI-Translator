import { AiProvider, TranslationRequestItem, TranslationResponseItem } from './types';
import { GlossaryEntry, AiSettings } from '../../types';
import { RecoveryService } from './recoveryService';

export class LocalLlmProvider implements AiProvider {
  name: string;

  constructor(
    private providerType: 'ollama' | 'lmstudio',
    private settings: AiSettings
  ) {
    this.name = providerType === 'ollama' ? 'Ollama (Local)' : 'LM Studio (Local)';
  }

  async translateBatch(
    items: TranslationRequestItem[],
    glossary: GlossaryEntry[],
    npcProfilesText?: string,
    onLog?: (msg: string) => void
  ): Promise<TranslationResponseItem[]> {
    const baseUrl = this.providerType === 'ollama' 
      ? (this.settings.ollama.baseUrl || 'http://localhost:11434')
      : (this.settings.lmstudio.baseUrl || 'http://localhost:1234');
    const model = this.providerType === 'ollama'
      ? this.settings.ollama.model
      : this.settings.lmstudio.model;

    const glossaryText = glossary.map(g => `${g.original} => ${g.translated}`).join('\n');
    const systemPrompt = RecoveryService.buildSystemPrompt(
      this.settings.systemPromptTemplate || '',
      this.settings.targetLanguage,
      glossaryText,
      npcProfilesText
    );
    const userPrompt = `Translate the following JSON list of texts:\n${JSON.stringify(items, null, 2)}`;

    onLog?.(`[${this.name}] Sending batch of ${items.length} items to ${baseUrl}...`);

    let endpoint = baseUrl.replace(/\/+$/, '');

    if (this.providerType === 'ollama') {
      if (!endpoint.endsWith('/api/generate') && !endpoint.endsWith('/api/chat')) {
        endpoint += '/api/chat';
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();
      const rawContent = data.message?.content || data.response;
      return RecoveryService.parseAndRepairResponse(rawContent);

    } else { // LM Studio (OpenAI-compatible local endpoint)
      if (!endpoint.endsWith('/v1/chat/completions')) {
        endpoint += '/v1/chat/completions';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'local-model',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`LM Studio API Error (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      return RecoveryService.parseAndRepairResponse(rawContent);
    }
  }

  async callLlm(prompt: string, onLog?: (msg: string) => void): Promise<string> {
    const baseUrl = this.providerType === 'ollama' 
      ? (this.settings.ollama.baseUrl || 'http://localhost:11434')
      : (this.settings.lmstudio.baseUrl || 'http://localhost:1234');
    const model = this.providerType === 'ollama'
      ? this.settings.ollama.model
      : this.settings.lmstudio.model;

    let endpoint = baseUrl.replace(/\/+$/, '');

    onLog?.(`[${this.name}] Sending general prompt to ${baseUrl}...`);

    if (this.providerType === 'ollama') {
      if (!endpoint.endsWith('/api/generate') && !endpoint.endsWith('/api/chat')) {
        endpoint += '/api/chat';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3',
          messages: [
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();
      const rawContent = data.message?.content || data.response;
      if (!rawContent) throw new Error('Ollama returned empty content.');
      return rawContent;

    } else { // LM Studio
      if (!endpoint.endsWith('/v1/chat/completions')) {
        endpoint += '/v1/chat/completions';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'local-model',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`LM Studio API Error (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error('LM Studio returned empty content.');
      return rawContent;
    }
  }
}
