import { GlossaryEntry } from '../types';

export class GlossaryService {
  /**
   * Parse Glossary JSON content into standard GlossaryEntry array
   */
  static parse(jsonContent: string): GlossaryEntry[] {
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          original: String(item.original || item.source || item.en || ''),
          translated: String(item.translated || item.target || item.ja || ''),
        })).filter(entry => entry.original.trim().length > 0);
      }
      return [];
    } catch (e) {
      throw new Error(`Invalid Glossary JSON: ${(e as Error).message}`);
    }
  }

  /**
   * Filter relevant glossary entries for a given list of source texts
   * to optimize AI prompt size
   */
  static filterRelevantEntries(texts: string[], glossary: GlossaryEntry[]): GlossaryEntry[] {
    if (glossary.length === 0 || texts.length === 0) return [];

    const combinedText = texts.join(' ');
    
    // Sort glossary by original length descending so longer phrases match first
    const sorted = [...glossary].sort((a, b) => b.original.length - a.original.length);

    return sorted.filter(entry => {
      // Case-insensitive inclusion check or boundary match
      const regex = new RegExp(entry.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      return regex.test(combinedText);
    });
  }
}
