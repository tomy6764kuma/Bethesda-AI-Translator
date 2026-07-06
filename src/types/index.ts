export interface TranslationString {
  id: string; // Unique internal ID or index
  edid: string; // FormID or EditorID e.g. [000F07D4]
  rec: string; // Record type e.g. INFO:NAM1, FULL, DESC
  source: string; // Original text (e.g. English)
  dest: string; // Current translated text (e.g. Japanese)
  aiTranslation?: string; // AI suggested translation
  npc?: string; // NPC speaker name e.g. [Pearl][NPC_:NellisPearl]
  sex?: 'Male' | 'Female' | 'Unknown'; // Speaker gender
  status: 'untranslated' | 'translated' | 'modified' | 'ai_generated';
  isSelected?: boolean;
  fileName?: string;
}

export interface XmlParams {
  addon: string;
  source: string;
  dest: string;
  version: string;
}

export interface GlossaryEntry {
  original: string;
  translated: string;
}

export interface NpcProfile {
  name: string; // NPC name identifier
  sex?: string; // Speaker gender (e.g. Male, Female, Player, Unknown)
  firstPerson: string; // One-self pronoun (e.g. 私, 俺, 僕, わし)
  secondPerson: string; // Target pronoun (e.g. あなた, お前, あんた)
  toneStyle: string; // Tone style (e.g. 老人風の～じゃ、乱暴な口調、お嬢様口調)
}

export type AiProviderType = 'gemini' | 'openai' | 'ollama' | 'lmstudio' | 'llamacpp';
export type GameType = 'fallout' | 'tes' | 'starfield' | 'default';

export interface AiSettings {
  activeProvider: AiProviderType;
  gameType: GameType; // Game world context for LLM prompt heuristics
  gemini: {
    apiKey: string;
    model: string;
  };
  openai: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  lmstudio: {
    baseUrl: string;
    model: string;
  };
  llamacpp: {
    baseUrl: string;
    model: string;
  };
  batchSize: number; // Number of items per request (when auto is off)
  autoBatchSize: boolean; // Auto calculate optimal batch size
  maxConcurrent: number;
  temperature: number;
  rpm: number; // Cloud only
  tpm: number; // Cloud only
  contextLimit: number; // Local LLM only (max characters or tokens)
  uiLanguage: string;
  targetLanguage: string;
  systemPromptTemplate?: string;
  enableAutoUpdate?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
  message: string;
  details?: string;
}
