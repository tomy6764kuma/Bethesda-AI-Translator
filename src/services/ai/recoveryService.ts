import { TranslationResponseItem } from './types';

export class RecoveryService {
  /**
   * Robustly extracts and repairs JSON array of TranslationResponseItem from LLM output string
   */
  static parseAndRepairResponse(rawText: string): TranslationResponseItem[] {
    if (!rawText) {
      throw new Error('Received empty or undefined response from AI.');
    }
    let cleanText = rawText.trim();
    if (!cleanText) {
      throw new Error('Received empty response from AI.');
    }

    // A. Escape unescaped raw newlines inside string values
    let inString = false;
    let escapedText = '';
    for (let charIdx = 0; charIdx < cleanText.length; charIdx++) {
      const c = cleanText[charIdx];
      const prev = cleanText[charIdx - 1];
      if (c === '"' && prev !== '\\') {
        inString = !inString;
      }
      if (inString && (c === '\n' || c === '\r')) {
        if (c === '\n') {
          escapedText += '\\n';
        }
      } else {
        escapedText += c;
      }
    }
    cleanText = escapedText;

    // B. Automatically repair truncated JSON by closing brackets (Token limit countermeasure)
    const quoteCount = (cleanText.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      cleanText += '"';
    }
    const openBraces = (cleanText.match(/\{/g) || []).length;
    const closeBraces = (cleanText.match(/\}/g) || []).length;
    const openBrackets = (cleanText.match(/\[/g) || []).length;
    const closeBrackets = (cleanText.match(/\]/g) || []).length;
    if (openBraces > closeBraces) {
      cleanText += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      cleanText += ']'.repeat(openBrackets - closeBrackets);
    }

    // 1. Strip Markdown Code Fences if present (e.g. ```json ... ```)
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = cleanText.match(jsonBlockRegex);
    if (match && match[1]) {
      cleanText = match[1].trim();
    }

    // 2. Locate the first '[' or '{' and last ']' or '}' to extract JSON
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    // Choose the outer boundary (either array or object wrapper)
    let startIdx = -1;
    let endIdx = -1;
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      startIdx = firstBracket;
      endIdx = lastBracket;
    } else {
      startIdx = firstBrace;
      endIdx = lastBrace;
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
    }

    // Helper to extract array from root object if wrapped
    const extractArray = (obj: any): any[] | null => {
      if (Array.isArray(obj)) return obj;
      if (obj && typeof obj === 'object') {
        if (obj.translations && Array.isArray(obj.translations)) {
          return obj.translations;
        }
        // Fallback: look for any array property
        const arrays = Object.values(obj).filter(val => Array.isArray(val));
        if (arrays.length > 0) return arrays[0] as any[];
      }
      return null;
    };

    // 3. Attempt standard JSON parse
    try {
      const parsed = JSON.parse(cleanText);
      const arr = extractArray(parsed);
      if (arr) {
        return arr.map((item: any) => ({
          id: String(item.id || ''),
          translated: String(item.translated || item.translation || item.dest || ''),
        }));
      }
      
      // Fallback: If output is a flat key-value map (e.g. {"noun_0": "translated_text"})
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const isFlatMap = Object.values(parsed).every(val => typeof val !== 'object' || val === null);
        if (isFlatMap) {
          return Object.entries(parsed).map(([key, val]) => ({
            id: key,
            translated: String(val ?? ''),
          }));
        }
      }
    } catch (e) {
      // Continue to repair heuristics
    }

    // 4. Heuristic repairs for common LLM JSON syntax mistakes
    let repaired = cleanText;

    // Fix unescaped double quotes inside value strings (heuristic)
    // e.g. "translated": "He said "Hello" to me" -> "translated": "He said \"Hello\" to me"
    repaired = repaired.replace(/("translated"|"translation"|"dest"|"text"|"jp"|"source")\s*:\s*"([\s\S]*?)"\s*([,}])/g, (m, key, val, suffix) => {
      const cleanVal = val.replace(/(?<!\\)"/g, '\\"');
      return `${key}: "${cleanVal}"${suffix}`;
    });

    // Remove trailing commas before closing braces/brackets
    repaired = repaired.replace(/,\s*([\]}])/g, '$1');

    // Fix single quote property names: 'id': -> "id":
    repaired = repaired.replace(/'([^'\\]+)'\s*:/g, '"$1":');

    // Attempt parse after basic fixes
    try {
      const parsed = JSON.parse(repaired);
      const arr = extractArray(parsed);
      if (arr) {
        return arr.map((item: any) => ({
          id: String(item.id || ''),
          translated: String(item.translated || item.translation || item.dest || ''),
        }));
      }

      // Fallback: If output is a flat key-value map (e.g. {"noun_0": "translated_text"})
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const isFlatMap = Object.values(parsed).every(val => typeof val !== 'object' || val === null);
        if (isFlatMap) {
          return Object.entries(parsed).map(([key, val]) => ({
            id: key,
            translated: String(val ?? ''),
          }));
        }
      }
    } catch (e) {
      // Continue to aggressive line-by-line regex extraction
    }

    // 5. Fallback: Line-by-line object extraction using regex
    const items: TranslationResponseItem[] = [];
    
    // Pattern A: id first, translated second
    const idFirstRegex = /\{\s*["']?id["']?\s*:\s*["']([^"']+)["']\s*,\s*["']?(?:translated|translation|dest|text|jp)["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']\s*\}/gi;
    let fallbackMatch;
    while ((fallbackMatch = idFirstRegex.exec(cleanText)) !== null) {
      items.push({
        id: fallbackMatch[1] || '',
        translated: (fallbackMatch[2] || '').replace(/\\"/g, '"').trim(),
      });
    }
    
    // Pattern B: translated first, id second (handles reversed key order from LLM)
    const transFirstRegex = /\{\s*["']?(?:translated|translation|dest|text|jp)["']?\s*:\s*["']([^"\\]*(?:\\.[^"\\]*)*)["']\s*,\s*["']?id["']?\s*:\s*["']([^"']+)["']\s*\}/gi;
    while ((fallbackMatch = transFirstRegex.exec(cleanText)) !== null) {
      const id = fallbackMatch[2] || '';
      if (!items.some(item => item.id === id)) {
        items.push({
          id,
          translated: (fallbackMatch[1] || '').replace(/\\"/g, '"').trim(),
        });
      }
    }

    if (items.length > 0) {
      return items;
    }

    throw new Error('Failed to parse or repair AI response JSON.');
  }

  public static readonly DEFAULT_PROMPT_PROTAGONIST = `You are an expert game localizer specializing in Bethesda RPGs (Skyrim, Fallout, Starfield).
Translate the provided protagonist / player dialogue choices into natural, immersive {target_lang}.

Context & Style:
- These texts are spoken by or chosen by the PROTAGONIST (Player character).
- Use natural, consistent first-person pronouns and speaking style suited for the player character.
- If the protagonist is female, use appropriate feminine/neutral phrasing and pronouns (e.g. 私, あたし in Japanese); if male, use suitable masculine/neutral phrasing.

Rules:
1. Return strictly a JSON array of objects. Each object must have keys "id" and "translated".
2. Do not alter placeholders, code tags, or format strings (e.g. %s, <br>, [EDID]).
3. Do not translate or modify contents inside curly braces (e.g., {sigh}, {angry}, {yawn}). These are acting/voice directions and must remain exactly as they are in English inside the translated text.
4. Strictly follow the provided Glossary dictionary for proper nouns.

{glossary}
Example Output Format:
[
  {"id": "str_1", "translated": "手伝いが必要なのか？"},
  {"id": "str_2", "translated": "それは私に任せて。"}
]`;

  public static readonly DEFAULT_PROMPT_DIALOGUE = `You are an expert game localizer specializing in Bethesda RPGs (Skyrim, Fallout, Starfield).
Translate the provided NPC dialogue texts into natural, high-quality {target_lang}.

Context & Style:
- These lines are spoken by NPCs and primarily ADDRESSED TO THE PROTAGONIST (Player).
- Take note of how NPCs address the protagonist: respect the protagonist's persona and gender when NPCs refer to or call them (e.g. miss/lady/she vs sir/mister/he).
- Pay attention to speaker NPC name and gender if provided (e.g. Male/Female) to use natural pronouns and tone.
- Strictly follow the NPC Tone Styles if specified for a given speaker.

Rules:
1. Return strictly a JSON array of objects. Each object must have keys "id" and "translated".
2. Do not alter placeholders, code tags, or format strings (e.g. %s, <br>, [EDID]).
3. Do not translate or modify contents inside curly braces (e.g., {sigh}, {angry}, {yawn}). These are acting/voice directions and must remain exactly as they are in English inside the translated text.
4. Strictly follow the provided Glossary dictionary for proper nouns.

{npc_profiles}
{glossary}
Example Output Format:
[
  {"id": "str_1", "translated": "やあ、あんたが噂の旅人かい？"},
  {"id": "str_2", "translated": "お嬢さん、ここは危険だから気をつけてくれ。"}
]`;

  public static readonly DEFAULT_PROMPT_GENERAL = `You are an expert game localizer specializing in Bethesda RPGs (Skyrim, Fallout, Starfield).
Translate the provided game texts (lore books, item names, quests, UI messages, descriptions) into natural, high-quality {target_lang}.

Context & Style:
- These texts are non-dialogue elements: books, notes, lore, item names, perk/spell descriptions, quest objectives, and system messages.
- Maintain an objective, immersive, lore-appropriate tone matching the fantasy/sci-fi world.
- Even for short texts, single words, names (NPC/location names), or item names, translate them appropriately into {target_lang} instead of leaving them in English, unless they are specified in the Glossary.

Rules:
1. Return strictly a JSON array of objects. Each object must have keys "id" and "translated".
2. Do not alter placeholders, code tags, or format strings (e.g. %s, <br>, [EDID]).
3. Strictly follow the provided Glossary dictionary for proper nouns.

{glossary}
Example Output Format:
[
  {"id": "str_1", "translated": "鉄のグレートソード"},
  {"id": "str_2", "translated": "古びた日誌の断片"}
]`;

  public static readonly DEFAULT_PROMPT_TEMPLATE = `You are an expert game localizer specializing in Bethesda RPGs (Skyrim, Fallout, Starfield).
Translate the provided English game texts into natural, high-quality {target_lang}.

Rules:
1. Return strictly a JSON array of objects. Each object must have keys "id" and "translated".
2. Do not alter placeholders, code tags, or format strings (e.g. %s, <br>, [EDID]).
3. Do not translate or modify contents inside curly braces (e.g., {sigh}, {angry}, {yawn}). These are acting/voice directions and must remain exactly as they are in English inside the translated text.
4. Pay attention to speaker NPC name and gender if provided (e.g. Male/Female) to use natural pronouns and tone.
5. Strictly follow the NPC Tone Styles if specified for a given speaker.
6. Strictly follow the provided Glossary dictionary for proper nouns.
7. Even for short texts, single words, names (NPC/location names), or item names, translate them appropriately into {target_lang} instead of leaving them in English, unless they are specified in the Glossary.

{npc_profiles}
{glossary}
Example Output Format:
[
  {"id": "str_1", "translated": "こんにちは。"},
  {"id": "str_2", "translated": "ドラゴンが襲ってきたぞ！"}
]`;

  /**
   * Builds system prompt instructions using customizable template and variables
   */
  static buildSystemPrompt(
    template: string,
    targetLanguage: string,
    glossaryText: string,
    npcProfilesText?: string,
    systemPromptTemplateOverride?: string
  ): string {
    let tpl = systemPromptTemplateOverride || template || RecoveryService.DEFAULT_PROMPT_TEMPLATE;

    const langNames: Record<string, string> = {
      ja: 'Japanese',
      en: 'English',
      ko: 'Korean',
      zh: 'Chinese',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ru: 'Russian',
      it: 'Italian',
      uk: 'Ukrainian',
      'pt-BR': 'Portuguese (Brazil)',
      pl: 'Polish',
      th: 'Thai',
    };
    const targetLangName = langNames[targetLanguage] || targetLanguage;

    let prompt = tpl
      .replace(/{target_lang}/g, targetLangName)
      .replace('{npc_profiles}', npcProfilesText ? `NPC Tone Styles / Character Settings:\n${npcProfilesText}\n` : '')
      .replace('{glossary}', glossaryText ? `Glossary Dictionary:\n${glossaryText}\n` : '');

    return prompt;
  }
}
