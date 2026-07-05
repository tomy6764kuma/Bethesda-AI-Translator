import React, { useState } from 'react';
import { TranslationString } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface TranslationTableProps {
  items: TranslationString[];
  onUpdateDest: (id: string, newDest: string) => void;
  onApplyAiTranslation: (id: string) => void;
  uiLanguage: string;
  availableNpcs: string[];
  selectedNpcFilters: string[];
  onChangeNpcFilters: (npcs: string[]) => void;
  onClearNpcTranslations: () => void;
}

const getCleanNpcName = (rawNpc: string | undefined): string => {
  if (!rawNpc) return '';
  let cleanName = rawNpc.trim();
  if (cleanName.startsWith('[')) {
    const endIdx = cleanName.indexOf(']');
    if (endIdx !== -1) {
      cleanName = cleanName.substring(1, endIdx).trim();
    }
  }
  return cleanName;
};

export const TranslationTable: React.FC<TranslationTableProps> = ({
  items,
  onUpdateDest,
  onApplyAiTranslation,
  uiLanguage,
  availableNpcs,
  selectedNpcFilters,
  onChangeNpcFilters,
  onClearNpcTranslations,
}) => {
  const [filter, setFilter] = useState<'all' | 'untranslated' | 'translated'>('all');
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isJa = uiLanguage === 'ja';
  const t = TRANSLATIONS[uiLanguage] || TRANSLATIONS['en'];

  const filteredItems = items.filter((item) => {
    if (filter === 'untranslated' && item.status !== 'untranslated') return false;
    if (filter === 'translated' && item.status === 'untranslated') return false;

    // NPC Filter (AND condition)
    if (selectedNpcFilters.length > 0) {
      const cleanName = getCleanNpcName(item.npc);
      if (!selectedNpcFilters.includes(cleanName)) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.source.toLowerCase().includes(q) ||
        item.dest.toLowerCase().includes(q) ||
        item.edid.toLowerCase().includes(q) ||
        (item.npc && item.npc.toLowerCase().includes(q)) ||
        (item.fileName && item.fileName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl m-6 select-none">
        <svg className="w-16 h-16 mb-4 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg font-medium text-neutral-400">{t.noXml}</p>
        <p className="text-sm text-neutral-600 mt-1 text-center max-w-md">{t.openXmlHint}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950">
      {/* Filter & Search Bar */}
      <div className="px-6 py-3 bg-neutral-900/40 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Status Filters */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'all'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t.all(items.length)}
            </button>
            <button
              onClick={() => setFilter('untranslated')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'untranslated'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t.untranslated(items.filter(i => i.status === 'untranslated').length)}
            </button>
            <button
              onClick={() => setFilter('translated')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filter === 'translated'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t.translated(items.filter(i => i.status !== 'untranslated').length)}
            </button>
          </div>

          {/* Divider */}
          {availableNpcs.length > 0 && <div className="h-4 w-px bg-neutral-800" />}

          {/* Multi-select NPC Filter */}
          {availableNpcs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 bg-neutral-950 px-3 py-1 rounded-lg border border-neutral-800 text-xs font-semibold text-neutral-200 hover:border-neutral-700 transition"
              >
                <span className="text-neutral-400 font-medium">{t.targetNpcFilterLabel}:</span>
                <span className="text-amber-400">
                  {selectedNpcFilters.length === 0
                    ? t.allNpcs
                    : `${selectedNpcFilters.length} ${isJa ? '名のNPCを選択中' : 'NPC(s) selected'}`}
                </span>
                <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2 w-64 max-h-80 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs text-neutral-200">
                    <label className="flex items-center space-x-2.5 p-1.5 hover:bg-neutral-800/60 rounded-lg cursor-pointer transition font-bold border-b border-neutral-800 pb-2">
                      <input
                        type="checkbox"
                        checked={selectedNpcFilters.length === availableNpcs.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChangeNpcFilters([...availableNpcs]);
                          } else {
                            onChangeNpcFilters([]);
                          }
                        }}
                        className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500/20 bg-neutral-950"
                      />
                      <span>{t.allNpcs}</span>
                    </label>

                    <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                      {availableNpcs.map((npc) => (
                        <label key={npc} className="flex items-center space-x-2.5 p-1.5 hover:bg-neutral-800/60 rounded-lg cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={selectedNpcFilters.includes(npc)}
                            onChange={() => {
                              if (selectedNpcFilters.includes(npc)) {
                                onChangeNpcFilters(selectedNpcFilters.filter((n) => n !== npc));
                              } else {
                                onChangeNpcFilters([...selectedNpcFilters, npc]);
                              }
                            }}
                            className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500/20 bg-neutral-950"
                          />
                          <span className="truncate">{npc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Clear Translations for Selected NPC(s) */}
          {selectedNpcFilters.length > 0 && (
            <button
              onClick={onClearNpcTranslations}
              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/60 border border-red-900/40 hover:border-red-900/60 text-red-400 transition"
              title={t.clearNpcTranslations}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500/50"
          />
          <svg className="w-4 h-4 text-neutral-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/80">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 hover:bg-neutral-900/50 transition flex flex-col md:flex-row gap-4 items-start ${
              item.status === 'untranslated' ? 'bg-neutral-950' : 'bg-neutral-900/20'
            }`}
          >
            {/* Metadata Badges */}
            <div className="w-full md:w-48 shrink-0 space-y-1 select-none">
              <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-amber-500 font-semibold">{item.rec}</span>
                <span className="text-neutral-500 truncate">{item.edid}</span>
              </div>
              {item.fileName && (
                <div className="text-[10px] text-neutral-500 truncate flex items-center gap-1" title={item.fileName}>
                  <span>📄</span>
                  <span className="truncate">{item.fileName}</span>
                </div>
              )}
              {item.npc && (
                <div className="text-xs text-emerald-400/90 font-medium truncate flex items-center gap-1">
                  <span>🗣️ {item.npc}</span>
                  {item.sex && item.sex !== 'Unknown' && (
                    <span className="text-[10px] px-1 bg-neutral-800 rounded text-neutral-400">
                      ({item.sex === 'Male' ? t.male : t.female})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Original Text */}
            <div className="flex-1 text-xs text-neutral-300 bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/60 font-serif leading-relaxed">
              {item.source}
            </div>

            {/* Translation Input & AI Suggestion */}
            <div className="flex-1 w-full space-y-2">
              <textarea
                value={item.dest}
                onChange={(e) => onUpdateDest(item.id, e.target.value)}
                placeholder={t.placeholder}
                rows={2}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-amber-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 leading-relaxed resize-y"
              />

              {/* AI Suggestion Banner if available */}
              {item.aiTranslation && item.aiTranslation !== item.dest && (
                <div className="flex items-center justify-between p-2 bg-amber-950/30 border border-amber-900/40 rounded-lg text-xs">
                  <div className="text-amber-300/90 flex items-center gap-1.5">
                    <span>{t.aiSuggestion}</span>
                    <span className="font-medium text-amber-100">{item.aiTranslation}</span>
                  </div>
                  <button
                    onClick={() => onApplyAiTranslation(item.id)}
                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-[11px] rounded transition shadow-sm shrink-0 ml-2"
                  >
                    {t.apply}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default TranslationTable;
