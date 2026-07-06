import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { AiProvider, TranslationRequestItem, TranslationResponseItem } from './types';
import { GlossaryEntry, AiSettings } from '../../types';
import { RecoveryService } from './recoveryService';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
const safeFetch = isTauri ? tauriFetch : window.fetch;

export class LocalLlmProvider implements AiProvider {
  name: string;

  constructor(
    private providerType: 'ollama' | 'lmstudio' | 'llamacpp',
    private settings: AiSettings
  ) {
    this.name = providerType === 'ollama' 
      ? 'Ollama (Local)' 
      : providerType === 'lmstudio' 
      ? 'LM Studio (Local)' 
      : 'llama.cpp (Local)';
  }

  async translateBatch(
    items: TranslationRequestItem[],
    glossary: GlossaryEntry[],
    npcProfilesText?: string,
    onLog?: (msg: string) => void,
    systemPromptTemplateOverride?: string
  ): Promise<TranslationResponseItem[]> {
    const baseUrl = this.providerType === 'ollama' 
      ? (this.settings.ollama.baseUrl || 'http://127.0.0.1:11434')
      : this.providerType === 'lmstudio'
      ? (this.settings.lmstudio.baseUrl || 'http://localhost:1234')
      : (this.settings.llamacpp.baseUrl || 'http://localhost:8080');

    const model = this.providerType === 'ollama'
      ? this.settings.ollama.model
      : this.providerType === 'lmstudio'
      ? this.settings.lmstudio.model
      : this.settings.llamacpp.model;

    const glossaryText = glossary.map(g => `${g.original} => ${g.translated}`).join('\n');
    const systemPrompt = RecoveryService.buildSystemPrompt(
      this.settings.systemPromptTemplate || '',
      this.settings.targetLanguage,
      glossaryText,
      npcProfilesText,
      systemPromptTemplateOverride
    );
    const userPrompt = `Translate the following JSON list of texts:\n${JSON.stringify(items, null, 2)}`;

    onLog?.(`[${this.name}] Sending batch of ${items.length} items to ${baseUrl}...`);

    let endpoint = baseUrl.replace(/\/+$/, '');

    if (this.providerType === 'ollama') {
      if (!endpoint.endsWith('/api/generate') && !endpoint.endsWith('/api/chat')) {
        endpoint += '/api/chat';
      }
      
      const response = await safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1'
        },
        body: JSON.stringify({
          model: model || 'llama3',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error (${response.status}): ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error('Ollama response body is empty.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let rawContent = '';
      let buffer = '';
      let lastLogTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const content = data.message?.content || data.response || '';
            if (content) {
              rawContent += content;
              
              const now = Date.now();
              if (now - lastLogTime > 1500) {
                onLog?.(`[Ollama Streaming] Generating: ${rawContent.length} chars...`);
                lastLogTime = now;
              }
            }
          } catch (e) {
            // Ignore incomplete JSON chunks
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          const content = data.message?.content || data.response || '';
          if (content) {
            rawContent += content;
          }
        } catch (e) {}
      }

      onLog?.(`[Ollama] Stream completed. Total generated: ${rawContent.length} chars.`);
      try {
        return RecoveryService.parseAndRepairResponse(rawContent);
      } catch (parseErr) {
        onLog?.(`[Ollama Error Debug] Raw response from Ollama:\n${rawContent}`);
        throw parseErr;
      }

    } else { // LM Studio & llama.cpp (OpenAI-compatible endpoints)
      if (!endpoint.endsWith('/v1/chat/completions')) {
        endpoint += '/v1/chat/completions';
      }

      const response = await safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1'
        },
        body: JSON.stringify({
          model: model || 'local-model',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`${this.name} API Error (${response.status}): ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error(`${this.name} response body is empty.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let rawContent = '';
      let buffer = '';
      let lastLogTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            const jsonText = trimmed.substring(6);
            try {
              const data = JSON.parse(jsonText);
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                rawContent += content;

                const now = Date.now();
                if (now - lastLogTime > 1500) {
                  onLog?.(`[${this.name} Streaming] Generating: ${rawContent.length} chars...`);
                  lastLogTime = now;
                }
              }
            } catch (e) {
              // Ignore incomplete JSON chunks
            }
          }
        }
      }

      onLog?.(`[${this.name}] Stream completed. Total generated: ${rawContent.length} chars.`);
      try {
        return RecoveryService.parseAndRepairResponse(rawContent);
      } catch (parseErr) {
        onLog?.(`[${this.name} Error Debug] Raw response:\n${rawContent}`);
        throw parseErr;
      }
    }
  }

  async callLlm(prompt: string, onLog?: (msg: string) => void): Promise<string> {
    const baseUrl = this.providerType === 'ollama' 
      ? (this.settings.ollama.baseUrl || 'http://127.0.0.1:11434')
      : this.providerType === 'lmstudio'
      ? (this.settings.lmstudio.baseUrl || 'http://localhost:1234')
      : (this.settings.llamacpp.baseUrl || 'http://localhost:8080');

    const model = this.providerType === 'ollama'
      ? this.settings.ollama.model
      : this.providerType === 'lmstudio'
      ? this.settings.lmstudio.model
      : this.settings.llamacpp.model;

    let endpoint = baseUrl.replace(/\/+$/, '');

    onLog?.(`[${this.name}] Sending general prompt to ${baseUrl}...`);

    if (this.providerType === 'ollama') {
      if (!endpoint.endsWith('/api/generate') && !endpoint.endsWith('/api/chat')) {
        endpoint += '/api/chat';
      }

      const response = await safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1'
        },
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

    } else { // LM Studio & llama.cpp
      if (!endpoint.endsWith('/v1/chat/completions')) {
        endpoint += '/v1/chat/completions';
      }

      const response = await safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://127.0.0.1'
        },
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
