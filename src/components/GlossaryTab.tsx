import React, { useState } from 'react';
import { GlossaryEntry } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface GlossaryTabProps {
  glossary: GlossaryEntry[];
  onAddEntry: (entry: GlossaryEntry) => void;
  onDeleteEntry: (original: string) => void;
  onImportGlossary: (entries: GlossaryEntry[]) => void;
  uiLanguage: string;
}

export const GlossaryTab: React.FC<GlossaryTabProps> = ({
  glossary,
  onAddEntry,
  onDeleteEntry,
  onImportGlossary,
  uiLanguage,
}) => {
  const [original, setOriginal] = useState('');
  const [translated, setTranslated] = useState('');
  const [search, setSearch] = useState('');

  const t = TRANSLATIONS[uiLanguage] || TRANSLATIONS['en'];
  const isJa = uiLanguage === 'ja';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!original.trim() || !translated.trim()) return;

    onAddEntry({
      original: original.trim(),
      translated: translated.trim(),
    });
    setOriginal('');
    setTranslated('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const entries = parsed.map((item: any) => ({
            original: String(item.original || item.source || item.en || ''),
            translated: String(item.translated || item.target || item.ja || ''),
          })).filter(entry => entry.original.trim().length > 0);
          onImportGlossary(entries);
        }
      } catch (err) {
        alert(t.alertGlossaryParseFailed);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(glossary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'glossary.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredGlossary = glossary.filter(
    (g) =>
      g.original.toLowerCase().includes(search.toLowerCase()) ||
      g.translated.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 p-6 space-y-6 overflow-y-auto select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 font-serif">
            {t.glossaryTitle}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {t.glossarySubTitle}
          </p>
        </div>

        {/* Import/Export */}
        <div className="flex items-center space-x-2">
          <label className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5">
            <span>📥 {t.importGlossaryBtn}</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={handleExport}
            disabled={glossary.length === 0}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white disabled:opacity-40 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <span>📤 {t.exportGlossaryBtn}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Add Entry Form */}
        <form onSubmit={handleAdd} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-amber-400 font-serif">
            {t.addTermTitle}
          </h3>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">{t.originalLangLabel}</label>
            <input
              type="text"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="e.g. Whiterun"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">{t.targetLangTranslationLabel}</label>
            <input
              type="text"
              value={translated}
              onChange={(e) => setTranslated(e.target.value)}
              placeholder="e.g. ホワイトラン"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition"
          >
            {t.addTermBtn}
          </button>
        </form>

        {/* Entries List */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col max-h-[60vh] min-h-[40vh]">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={t.searchGlossaryPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* List Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60">
            {filteredGlossary.length === 0 ? (
              <div className="text-center py-12 text-neutral-600 text-xs">
                {t.noTermsRegistered}
              </div>
            ) : (
              filteredGlossary.map((entry) => (
                <div key={entry.original} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="grid grid-cols-2 flex-1 gap-2 text-xs">
                    <span className="font-semibold text-neutral-200 truncate">{entry.original}</span>
                    <span className="text-amber-400/90 font-medium truncate">→ {entry.translated}</span>
                  </div>
                  <button
                    onClick={() => onDeleteEntry(entry.original)}
                    className="text-neutral-500 hover:text-red-400 transition text-xs px-2 py-1 rounded hover:bg-neutral-800"
                  >
                    {t.deleteBtn}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default GlossaryTab;
