import React from 'react';
import { AiProviderType, GameType } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface HeaderProps {
  onOpenFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveFile: () => void;
  onStartTranslation: () => void;
  onStopTranslation: () => void;
  onOpenSettings: () => void;
  activeProvider: AiProviderType;
  onChangeProvider: (provider: AiProviderType) => void;
  gameType: GameType;
  onChangeGameType: (gameType: GameType) => void;
  isTranslating: boolean;
  totalCount: number;
  untranslatedCount: number;
  uiLanguage: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFile,
  onSaveFile,
  onStartTranslation,
  onStopTranslation,
  onOpenSettings,
  activeProvider,
  onChangeProvider,
  gameType,
  onChangeGameType,
  isTranslating,
  totalCount,
  untranslatedCount,
  uiLanguage,
}) => {
  const isJa = uiLanguage === 'ja';
  const t = TRANSLATIONS[uiLanguage] || TRANSLATIONS['en'];

  return (
    <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 select-none">
      {/* App Title */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 font-bold text-neutral-950 text-xl font-serif">
          B
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-100 tracking-wide font-serif">
            Bethesda AI Translator
          </h1>
          <p className="text-xs text-amber-500/80 font-medium">
            Next-Gen Game Localization Suite
          </p>
        </div>
      </div>

      {/* File Controls */}
      <div className="flex items-center space-x-2 bg-neutral-950/60 p-1.5 rounded-xl border border-neutral-800/80">
        <label className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {t.openXml}
          <input type="file" accept=".xml" multiple onChange={onOpenFile} className="hidden" />
        </label>

        <button
          onClick={onSaveFile}
          disabled={totalCount === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {t.saveXml}
        </button>
      </div>

      {/* AI & Translation Actions */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        {/* Game Type Select */}
        <div className="flex items-center space-x-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">{t.gameTypeLabel}</span>
          <select
            value={gameType}
            onChange={(e) => onChangeGameType(e.target.value as GameType)}
            className="bg-transparent text-xs font-semibold text-amber-400 focus:outline-none cursor-pointer"
          >
            <option value="default" className="bg-neutral-900 text-neutral-200">Default (Standard)</option>
            <option value="tes" className="bg-neutral-900 text-neutral-200">TES (Fantasy)</option>
            <option value="fallout" className="bg-neutral-900 text-neutral-200">Fallout (Wasteland)</option>
            <option value="starfield" className="bg-neutral-900 text-neutral-200">Starfield (Space SF)</option>
          </select>
        </div>

        {/* Provider Select */}
        <div className="flex items-center space-x-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
          <span className="text-xs font-medium text-neutral-400">{t.aiLabel}</span>
          <select
            value={activeProvider}
            onChange={(e) => onChangeProvider(e.target.value as AiProviderType)}
            className="bg-transparent text-xs font-semibold text-amber-400 focus:outline-none cursor-pointer"
          >
            <option value="gemini" className="bg-neutral-900 text-neutral-200">Google Gemini</option>
            <option value="openai" className="bg-neutral-900 text-neutral-200">OpenAI / Compatible</option>
            <option value="ollama" className="bg-neutral-900 text-neutral-200">Ollama (Local)</option>
            <option value="lmstudio" className="bg-neutral-900 text-neutral-200">LM Studio (Local)</option>
            <option value="llamacpp" className="bg-neutral-900 text-neutral-200">llama.cpp (Local)</option>
          </select>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
          title={t.settingsTooltip}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Batch Translate / Stop Button */}
        <button
          onClick={isTranslating ? onStopTranslation : onStartTranslation}
          disabled={!isTranslating && untranslatedCount === 0}
          className={`px-5 py-2 rounded-xl font-bold text-xs shadow-lg transition flex items-center gap-2 ${
            isTranslating
              ? 'bg-red-600 hover:bg-red-500 text-white active:scale-95 shadow-red-900/20'
              : untranslatedCount === 0
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-amber-900/20 active:scale-95'
          }`}
        >
          {isTranslating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t.stopTranslation}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t.untranslatedLeft(untranslatedCount)}
            </>
          )}
        </button>
      </div>
    </header>
  );
};
export default Header;
