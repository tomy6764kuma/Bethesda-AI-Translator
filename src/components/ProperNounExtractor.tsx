import React, { useState, useMemo } from 'react';
import { TranslationString, GlossaryEntry } from '../types';

interface ProperNounExtractorProps {
  items: TranslationString[];
  glossary: GlossaryEntry[];
  onAddGlossaryEntry: (entry: GlossaryEntry) => void;
  onAddGlossaryEntries: (entries: GlossaryEntry[]) => void;
  uiLanguage: string;
  activeProvider: string;
  onAiTranslateNouns: (nouns: string[]) => Promise<Record<string, string>>;
}

// Robust and expanded stop words list to eliminate verbs, adjectives, prepositions, contractions, and grammatical noise
const STOP_WORDS = new Set([
  'I', 'YOU', 'HE', 'SHE', 'IT', 'WE', 'THEY', 'ME', 'HIM', 'HER', 'US', 'THEM',
  'THE', 'A', 'AN', 'AND', 'BUT', 'OR', 'AS', 'IF', 'OF', 'AT', 'BY', 'FOR', 'WITH', 'ABOUT', 'AGAINST',
  'TO', 'IN', 'ON', 'FROM', 'UP', 'DOWN', 'OUT', 'OVER', 'UNDER', 'AGAIN', 'FURTHER', 'THEN', 'ONCE',
  'THIS', 'THAT', 'THESE', 'THOSE', 'MY', 'YOUR', 'HIS', 'HER', 'ITS', 'OUR', 'THEIR',
  'WHO', 'WHOM', 'WHOSE', 'WHICH', 'THAT', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW',
  'ALL', 'ANY', 'BOTH', 'EACH', 'FEW', 'MORE', 'MOST', 'OTHER', 'SOME', 'SUCH',
  'NO', 'NOR', 'NOT', 'ONLY', 'OWN', 'SAME', 'SO', 'THAN', 'TOO', 'VERY',
  'S', 'T', 'CAN', 'WILL', 'JUST', 'SHOULD', 'NOW', 'O', 'Y',
  'YES', 'NO', 'OK', 'OH', 'WELL', 'HELLO', 'BYE',
  // Common verbs & auxiliary verbs (and their past/participle forms)
  'AM', 'IS', 'ARE', 'WAS', 'WERE', 'BE', 'BEEN', 'BEING',
  'HAVE', 'HAS', 'HAD', 'HAVING', 'DO', 'DOES', 'DID', 'DOING',
  'GO', 'GOES', 'WENT', 'GONE', 'GOING', 'GET', 'GETS', 'GOT', 'GETTING',
  'TAKE', 'TAKES', 'TOOK', 'TAKEN', 'TAKING', 'MAKE', 'MAKES', 'MADE', 'MAKING',
  'SAY', 'SAYS', 'SAID', 'SAYING', 'ASK', 'ASKS', 'ASKED', 'ASKING',
  'TELL', 'TELLS', 'TOLD', 'TELLING', 'THINK', 'THINKS', 'THOUGHT', 'THINKING',
  'COME', 'COMES', 'CAME', 'COMING', 'SEE', 'SEES', 'SAW', 'SEEN', 'SEEING',
  'WANT', 'WANTS', 'WANTED', 'WANTING', 'LOOK', 'LOOKS', 'LOOKED', 'LOOKING',
  'GIVE', 'GIVES', 'GAVE', 'GIVEN', 'GIVING', 'USE', 'USES', 'USED', 'USING',
  'FIND', 'FINDS', 'FOUND', 'FINDING', 'KNOW', 'KNOWS', 'KNEW', 'KNOWN', 'KNOWING',
  'PUT', 'PUTS', 'PUTTING', 'KEEP', 'KEEPS', 'KEPT', 'KEEPING', 'LET', 'LETS', 'LETTING',
  // Common adjectives & adverbs
  'GOOD', 'BAD', 'GREAT', 'SMALL', 'LARGE', 'BIG', 'NEW', 'OLD', 'YOUNG', 'LONG', 'SHORT',
  'HIGH', 'LOW', 'HOT', 'COLD', 'WARM', 'EARLY', 'LATE', 'FIRST', 'LAST', 'NEXT',
  'LITTLE', 'MUCH', 'MANY', 'MORE', 'MOST', 'FEW', 'LESS', 'LEAST',
  'HERE', 'THERE', 'TODAY', 'YESTERDAY', 'TOMORROW', 'ALWAYS', 'NEVER', 'SOMETIMES', 'OFTEN',
  // Bethesda Mod / XML metadata keys
  'NPC', 'EDID', 'FULL', 'INFO', 'REC', 'DESC',
  // User additional stop words
  'IF', 'IFS', 'AS', 'DID', 'NOW', "DON'T", 'DONT', 'LIKE', 'LIKES', 'LIKED',
  // Personal Pronoun Contractions and variations (with and without apostrophes)
  "I'VE", 'IVE', "YOU'RE", 'YOURE', "HE'S", 'HES', "SHE'S", 'SHES', "IT'S", 'ITS', "WE'RE", 'WERE', "THEY'RE", 'THEYRE',
  "I'D", 'ID', "YOU'D", 'YOUD', "HE'D", 'HED', "SHE'D", 'SHED', "WE'D", 'WED', "THEY'D", 'THEYD',
  "I'LL", 'ILL', "YOU'LL", 'YOULL', "HE'LL", 'HELL', "SHE'LL", 'SHELL', "WE'LL", 'WELL', "THEY'LL", 'THEYLL',
  "DON'T", 'DONT', "WON'T", 'WONT', "CAN'T", 'CANT', "SHAN'T", 'SHANT', "WASNT", "WASN'T", "WERENT", "WEREN'T", "HAVENT", "HAVEN'T", "HASNT", "HASN'T", "HADNT", "HADN'T"
]);

export const ProperNounExtractor: React.FC<ProperNounExtractorProps> = ({
  items,
  glossary,
  onAddGlossaryEntry,
  onAddGlossaryEntries,
  uiLanguage,
  activeProvider,
  onAiTranslateNouns,
}) => {
  const [newTranslation, setNewTranslation] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiTranslating, setIsAiTranslating] = useState(false);

  // Dynamic user-added stopwords (interactive exclusion)
  const [dynamicStopWords, setDynamicStopWords] = useState<Set<string>>(new Set());

  // Checkbox state for batch actions
  const [checkedNouns, setCheckedNouns] = useState<Record<string, boolean>>({});

  const isJa = uiLanguage === 'ja';

  // Overhauled to implement the original app's exact extraction, formatting, and sorting specs
  const extractedNouns = useMemo(() => {
    if (items.length === 0) return [];

    const wordCounts = new Map<string, number>();
    const wordContexts = new Map<string, { original: string; context: string }>();
    const existingGlossary = new Set(glossary.map((g) => g.original.toLowerCase()));

    // Original App's regex pattern for proper nouns (multi-word, "of" sequences, numbers)
    const phraseRegex = /[A-Z][a-zA-Z0-9'-]*(?:\s+of\s+[A-Z][a-zA-Z0-9'-]*|(?:\s+(?:[A-Z][a-zA-Z0-9'-]*|[0-9]+))+)*/g;

    items.forEach((item) => {
      if (!item.source) return;

      // Original Preprocessing: Strip code templates/brackets
      const cleanSrc = item.source.replace(/\{[^\}]*\}/g, '').replace(/｛[^｝]*｝/g, '');
      const hasEnglishWord = /[a-zA-Z]{2,}/.test(cleanSrc);

      if (hasEnglishWord) {
        const matches = cleanSrc.match(phraseRegex) || [];
        matches.forEach((m) => {
          const w = m.trim();
          // Strip possessive 's at the end
          const cleanW = w.replace(/'s$/i, '').trim();
          const lowerW = cleanW.toLowerCase();
          const upperW = cleanW.toUpperCase();

          // Reject pronouns and auxiliary items containing standalone "I" pronoun (e.g. "I think", "Am I")
          const isIContainment = 
            lowerW === 'i' || 
            lowerW.startsWith('i ') || 
            lowerW.endsWith(' i') || 
            lowerW.includes(' i ');

          if (/[a-zA-Z]/.test(cleanW) && cleanW.length >= 2 && !isIContainment) {
            // Apply Glossary check, Expanded Stopwords, and Dynamic Stopwords filter
            if (
              !existingGlossary.has(lowerW) && 
              !STOP_WORDS.has(upperW) && 
              !dynamicStopWords.has(lowerW)
            ) {
              wordCounts.set(lowerW, (wordCounts.get(lowerW) || 0) + 1);
              if (!wordContexts.has(lowerW)) {
                wordContexts.set(lowerW, { original: cleanW, context: item.source });
              }
            }
          }
        });
      }
    });

    const uniqueItems: { original: string; context: string; count: number }[] = [];
    wordCounts.forEach((count, lowerW) => {
      // Original App's threshold: Only list nouns occurring 3 or more times
      if (count >= 3) {
        const ctx = wordContexts.get(lowerW);
        if (ctx) {
          uniqueItems.push({ ...ctx, count });
        }
      }
    });

    // Original App's sorting logic: Word count descending (longer phrases first), then frequency descending
    uniqueItems.sort((itemA, itemB) => {
      const wordsA = itemA.original.split(/\s+/).length;
      const wordsB = itemB.original.split(/\s+/).length;
      if (wordsB !== wordsA) {
        return wordsB - wordsA;
      }
      return itemB.count - itemA.count;
    });

    return uniqueItems;
  }, [items, glossary, dynamicStopWords]);

  const filteredNouns = useMemo(() => {
    return extractedNouns.filter((n) =>
      n.original.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [extractedNouns, searchQuery]);

  const handleAdd = (word: string) => {
    // If translation is empty, fallback to the original word (English as-is registration)
    const translation = newTranslation[word]?.trim() || word;

    onAddGlossaryEntry({
      original: word,
      translated: translation,
    });

    setNewTranslation((prev) => {
      const next = { ...prev };
      delete next[word];
      return next;
    });
  };

  // Toggle individual item checkbox
  const handleToggleCheck = (word: string) => {
    setCheckedNouns((prev) => ({
      ...prev,
      [word]: prev[word] === false ? true : false, // Default is true (checked) if not defined
    }));
  };

  // Batch register all checked nouns (blank fields will register with English original)
  const handleBatchRegister = () => {
    const targets = filteredNouns.filter(item => checkedNouns[item.original] !== false);
    if (targets.length === 0) return;

    const entries = targets.map((item) => ({
      original: item.original,
      translated: newTranslation[item.original]?.trim() || item.original,
    }));

    onAddGlossaryEntries(entries);
    
    // Clean translations for registered items
    setNewTranslation((prev) => {
      const next = { ...prev };
      targets.forEach(t => delete next[t.original]);
      return next;
    });
  };

  // Translate checked nouns using the active LLM provider
  const handleAiTranslate = async () => {
    const targets = filteredNouns.filter(item => checkedNouns[item.original] !== false);
    if (targets.length === 0) return;

    const isCloud = activeProvider === 'gemini' || activeProvider === 'openai';
    if (isCloud) {
      const msg = isJa
        ? 'API料金が発生する可能性があります。チェックされた名詞の翻訳を実行しますか？'
        : 'API charges may apply. Do you want to translate checked nouns?';
      if (!window.confirm(msg)) {
        return;
      }
    }

    setIsAiTranslating(true);
    try {
      const nounsList = targets.map((item) => item.original);
      const results = await onAiTranslateNouns(nounsList);
      
      setNewTranslation((prev) => ({
        ...prev,
        ...results,
      }));
    } catch (e) {
      alert(isJa ? `翻訳エラー: ${(e as Error).message}` : `Translation Error: ${(e as Error).message}`);
    } finally {
      setIsAiTranslating(false);
    }
  };

  // Exclude a word dynamically on the fly (add to runtime stopwords)
  const handleAddToStopWords = (word: string) => {
    const lower = word.toLowerCase();
    setDynamicStopWords((prev) => {
      const next = new Set(prev);
      next.add(lower);
      return next;
    });
  };

  // Check all items
  const handleCheckAll = (check: boolean) => {
    const next: Record<string, boolean> = {};
    filteredNouns.forEach(item => {
      next[item.original] = check;
    });
    setCheckedNouns(next);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-90 border-l border-neutral-800 bg-neutral-900/60 flex flex-col h-full select-none shrink-0">
      {/* Title */}
      <div className="p-4 border-b border-neutral-800/80">
        <h3 className="font-bold text-sm text-amber-400 font-serif flex items-center gap-1.5">
          🔍 {isJa ? '固有名詞の抽出' : 'Proper Noun Extractor'}
        </h3>
        <p className="text-[10px] text-neutral-500 mt-1 leading-normal">
          {isJa
            ? 'XML全体から頻出する固有名詞（出現3回以上）を自動抽出し、ストップリストでノイズを除去します。'
            : 'Scans source texts for proper nouns (minimum 3 occurrences) with robust noise filters.'}
        </p>
      </div>

      {/* Batch Action Buttons */}
      <div className="px-4 py-2 border-b border-neutral-800/40 grid grid-cols-2 gap-2">
        <button
          onClick={handleAiTranslate}
          disabled={isAiTranslating || filteredNouns.length === 0}
          className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:hover:bg-neutral-800 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
        >
          {isAiTranslating ? (
            <>⏳ {isJa ? '翻訳中...' : 'Translating...'}</>
          ) : (
            <>✨ {isJa ? 'AIで自動翻訳' : 'Translate with AI'}</>
          )}
        </button>
        <button
          onClick={handleBatchRegister}
          disabled={filteredNouns.length === 0}
          className="py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 disabled:opacity-40 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
        >
          💾 {isJa ? '一括用語登録' : 'Batch Register'}
        </button>
      </div>

      {/* Search Filter & Check Controls */}
      <div className="p-3 border-b border-neutral-800/40 flex items-center gap-2">
        <input
          type="text"
          placeholder={isJa ? '名詞を検索...' : 'Filter nouns...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50"
        />
        <div className="flex gap-1">
          <button
            onClick={() => handleCheckAll(true)}
            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold rounded transition border border-neutral-700"
            title={isJa ? 'すべてチェック' : 'Check All'}
          >
            ☑
          </button>
          <button
            onClick={() => handleCheckAll(false)}
            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold rounded transition border border-neutral-700"
            title={isJa ? 'すべてのチェック解除' : 'Uncheck All'}
          >
            ☐
          </button>
        </div>
      </div>

      {/* Candidates List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredNouns.length === 0 ? (
          <div className="text-center text-neutral-600 text-xs py-8">
            {isJa
              ? '頻出する新しい名詞が見つかりませんでした（3回以上出現）。'
              : 'No frequent nouns found (minimum 3 occurrences).'}
          </div>
        ) : (
          filteredNouns.map((item) => {
            const isChecked = checkedNouns[item.original] !== false;
            return (
              <div
                key={item.original}
                className={`p-2.5 bg-neutral-950 rounded-xl border space-y-1.5 animate-fade-in transition ${
                  isChecked ? 'border-neutral-800/50' : 'border-neutral-900/20 opacity-50'
                }`}
              >
                {/* Word & Count & Copy & Exclusion */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate max-w-[80%]">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleCheck(item.original)}
                      className="rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="font-semibold text-xs text-neutral-200 truncate">
                      {item.original}
                    </span>
                    <button
                      onClick={() => handleCopy(item.original)}
                      className="text-neutral-500 hover:text-neutral-300 transition text-[10px]"
                      title={isJa ? 'コピー' : 'Copy'}
                    >
                      📋
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">
                      {item.count}x
                    </span>
                    <button
                      onClick={() => handleAddToStopWords(item.original)}
                      className="px-2 py-0.5 bg-neutral-900 hover:bg-red-950/40 text-red-500 hover:text-red-400 text-[10px] font-bold rounded border border-red-950/50 hover:border-red-900/60 transition flex items-center gap-1 shrink-0"
                      title={isJa ? 'ストップワードに追加（除外）' : 'Add to stopwords'}
                    >
                      <span>❌</span>
                      <span>{isJa ? '除外' : 'Ignore'}</span>
                    </button>
                  </div>
                </div>

                {/* Context Sentence */}
                <div
                  className="text-[10px] text-neutral-500 leading-normal italic font-serif border-l-2 border-neutral-800 pl-2 max-h-12 overflow-y-auto"
                  title={item.context}
                >
                  {item.context}
                </div>

                {/* Translation Form */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder={isJa ? '空欄のまま登録で英語' : 'Blank for English'}
                    value={newTranslation[item.original] || ''}
                    onChange={(e) =>
                      setNewTranslation((prev) => ({ ...prev, [item.original]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd(item.original);
                    }}
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-xs text-amber-200 px-2 py-1 rounded focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    onClick={() => handleAdd(item.original)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-[10px] rounded border border-neutral-700 transition"
                  >
                    {isJa ? '登録' : 'Add'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default ProperNounExtractor;
