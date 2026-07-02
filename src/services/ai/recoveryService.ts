import { TranslationResponseItem } from './types';

export class RecoveryService {
  /**
   * Robustly extracts and repairs JSON array of TranslationResponseItem from LLM output string
   */
  static parseAndRepairResponse(rawText: string): TranslationResponseItem[] {
    let cleanText = rawText.trim();

    // 1. Strip Markdown Code Fences if present (e.g. ```json ... ```)
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = cleanText.match(jsonBlockRegex);
    if (match && match[1]) {
      cleanText = match[1].trim();
    }

    // 2. Locate the first '[' and last ']' to extract JSON array
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }

    // 3. Attempt standard JSON parse
    try {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          id: String(item.id || ''),
          translated: String(item.translated || item.translation || item.dest || ''),
        }));
      }
    } catch (e) {
      // Continue to repair heuristics
    }

    // 4. Heuristic repairs for common LLM JSON syntax mistakes
    let repaired = cleanText;

    // Remove trailing commas before closing braces/brackets
    repaired = repaired.replace(/,\s*([\]}])/g, '$1');

    // Fix single quote property names: 'id': -> "id":
    repaired = repaired.replace(/'([^'\\]+)'\s*:/g, '"$1":');

    // Attempt parse after basic fixes
    try {
      const parsed = JSON.parse(repaired);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          id: String(item.id || ''),
          translated: String(item.translated || item.translation || item.dest || ''),
        }));
      }
    } catch (e) {
      // Continue to aggressive line-by-line regex extraction
    }

    // 5. Fallback: Line-by-line object extraction using regex
    const items: TranslationResponseItem[] = [];
    const objectRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"translated"\s*:\s*"([\s\S]*?)"\s*\}/g;
    let objMatch;
    while ((objMatch = objectRegex.exec(cleanText)) !== null) {
      items.push({
        id: objMatch[1],
        translated: objMatch[2].replace(/\\"/g, '"'),
      });
    }

    if (items.length > 0) {
      return items;
    }

    throw new Error('Failed to parse or repair AI response JSON.');
  }

  /**
   * Builds system prompt instructions using customizable template and variables
   */
  static buildSystemPrompt(
    template: string,
    targetLanguage: string,
    glossaryText: string,
    npcProfilesText?: string
  ): string {
    const defaultTemplate = `You are an expert game localizer specializing in Bethesda RPGs (Skyrim, Fallout, Starfield).
Translate the provided English game texts into natural, high-quality {target_lang}.

Rules:
1. Return strictly a JSON array of objects. Each object must have keys "id" and "translated".
2. Do not alter placeholders, code tags, or format strings (e.g. %s, <br>, [EDID]).
3. Do not translate or modify contents inside curly braces (e.g., {sigh}, {angry}, {yawn}). These are acting/voice directions and must remain exactly as they are in English inside the translated text.
4. Pay attention to speaker NPC name and gender if provided (e.g. Male/Female) to use natural pronouns and tone.
5. Strictly follow the NPC Tone Styles if specified for a given speaker.
6. Strictly follow the provided Glossary dictionary for proper nouns.

{npc_profiles}
{glossary}
Example Output Format:
[
  {"id": "str_1", "translated": "こんにちは。"},
  {"id": "str_2", "translated": "ドラゴンが襲ってきたぞ！"}
]`;

    let tpl = template || defaultTemplate;

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
    };
    const targetLangName = langNames[targetLanguage] || targetLanguage;

    let prompt = tpl
      .replace('{target_lang}', targetLangName)
      .replace('{npc_profiles}', npcProfilesText ? `NPC Tone Styles / Character Settings:\n${npcProfilesText}\n` : '')
      .replace('{glossary}', glossaryText ? `Glossary Dictionary:\n${glossaryText}\n` : '');

    return prompt;
  }
}
