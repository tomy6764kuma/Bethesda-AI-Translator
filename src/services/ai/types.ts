import { TranslationString, GlossaryEntry } from '../../types';

export interface TranslationRequestItem {
  id: string;
  source: string;
  npc?: string;
  sex?: string;
}

export interface TranslationResponseItem {
  id: string;
  translated: string;
}

export interface AiProvider {
  name: string;
  translateBatch(
    items: TranslationRequestItem[],
    glossary: GlossaryEntry[],
    npcProfilesText?: string,
    onLog?: (msg: string) => void,
    systemPromptTemplateOverride?: string
  ): Promise<TranslationResponseItem[]>;
  callLlm(prompt: string, onLog?: (msg: string) => void): Promise<string>;
}
