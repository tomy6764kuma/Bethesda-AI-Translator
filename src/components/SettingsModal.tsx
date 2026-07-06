import React, { useState, useEffect } from 'react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { AiSettings } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
const safeTauriFetch = isTauri ? tauriFetch : window.fetch;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AiSettings;
  onSaveSettings: (newSettings: AiSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AiSettings>(settings);

  // Model lists fetched dynamically from APIs
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [openaiModels, setOpenaiModels] = useState<string[]>([]);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [lmstudioModels, setLmstudioModels] = useState<string[]>([]);
  const [llamacppModels, setLlamacppModels] = useState<string[]>([]);
  const [fetchingProvider, setFetchingProvider] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const t = TRANSLATIONS[localSettings.uiLanguage] || TRANSLATIONS['en'];
  const isJa = localSettings.uiLanguage === 'ja';

  // Fetch functions for each LLM provider
  const fetchGeminiModelsList = async () => {
    const key = localSettings.gemini.apiKey;
    if (!key) {
      alert(t.alertApiKeyRequired);
      return;
    }
    setFetchingProvider('gemini');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        const list = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));
        setGeminiModels(list);
        if (list.length > 0 && !list.includes(localSettings.gemini.model)) {
          setLocalSettings(prev => ({
            ...prev,
            gemini: { ...prev.gemini, model: list[0] }
          }));
        }
      } else {
        alert(t.alertFetchModelsFailed);
      }
    } catch (e) {
      alert(`Error fetching Gemini models: ${(e as Error).message}`);
    } finally {
      setFetchingProvider(null);
    }
  };

  const fetchOpenAiModelsList = async () => {
    const key = localSettings.openai.apiKey;
    const url = localSettings.openai.baseUrl;
    if (!url) {
      alert(t.alertBaseUrlRequired);
      return;
    }
    setFetchingProvider('openai');
    try {
      const headers: Record<string, string> = {};
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }
      const res = await fetch(`${url}/models`, { headers });
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        const list = data.data.map((m: any) => m.id);
        setOpenaiModels(list);
        if (list.length > 0 && !list.includes(localSettings.openai.model)) {
          setLocalSettings(prev => ({
            ...prev,
            openai: { ...prev.openai, model: list[0] }
          }));
        }
      } else {
        alert(t.alertFetchModelsFailed);
      }
    } catch (e) {
      alert(`Error fetching OpenAI models: ${(e as Error).message}`);
    } finally {
      setFetchingProvider(null);
    }
  };

  const fetchOllamaModelsList = async () => {
    const url = localSettings.ollama.baseUrl;
    if (!url) {
      alert(t.alertBaseUrlRequired);
      return;
    }
    setFetchingProvider('ollama');
    try {
      const res = await safeTauriFetch(`${url}/api/tags`, {
        headers: { 'Origin': '' }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const text = await res.text();
      if (!text.trim()) {
        throw new Error('Received empty response from server.');
      }
      const data = JSON.parse(text);
      if (data.models && Array.isArray(data.models)) {
        const list = data.models.map((m: any) => m.name);
        setOllamaModels(list);
        if (list.length > 0 && !list.includes(localSettings.ollama.model)) {
          setLocalSettings(prev => ({
            ...prev,
            ollama: { ...prev.ollama, model: list[0] }
          }));
        }
      } else {
        alert(t.alertFetchModelsFailed);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : (typeof e === 'object' && e !== null && 'message' in e) ? (e as any).message : String(e);
      alert(`Error fetching Ollama models: ${errorMsg}`);
    } finally {
      setFetchingProvider(null);
    }
  };

  const fetchLmstudioModelsList = async () => {
    const url = localSettings.lmstudio.baseUrl;
    if (!url) {
      alert(t.alertBaseUrlRequired);
      return;
    }
    setFetchingProvider('lmstudio');
    try {
      const res = await safeTauriFetch(`${url}/v1/models`, {
        headers: { 'Origin': '' }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const text = await res.text();
      if (!text.trim()) {
        throw new Error('Received empty response from server.');
      }
      const data = JSON.parse(text);
      if (data.data && Array.isArray(data.data)) {
        const list = data.data.map((m: any) => m.id);
        setLmstudioModels(list);
        if (list.length > 0 && !list.includes(localSettings.lmstudio.model)) {
          setLocalSettings(prev => ({
            ...prev,
            lmstudio: { ...prev.lmstudio, model: list[0] }
          }));
        }
      } else {
        alert(t.alertFetchModelsFailed);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : (typeof e === 'object' && e !== null && 'message' in e) ? (e as any).message : String(e);
      alert(`Error fetching LM Studio models: ${errorMsg}`);
    } finally {
      setFetchingProvider(null);
    }
  };

  const fetchLlamacppModelsList = async () => {
    const url = localSettings.llamacpp.baseUrl;
    if (!url) {
      alert(t.alertBaseUrlRequired);
      return;
    }
    setFetchingProvider('llamacpp');
    try {
      const res = await safeTauriFetch(`${url}/v1/models`, {
        headers: { 'Origin': '' }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const text = await res.text();
      if (!text.trim()) {
        throw new Error('Received empty response from server.');
      }
      const data = JSON.parse(text);
      if (data.data && Array.isArray(data.data)) {
        const list = data.data.map((m: any) => m.id);
        setLlamacppModels(list);
        if (list.length > 0 && !list.includes(localSettings.llamacpp.model)) {
          setLocalSettings(prev => ({
            ...prev,
            llamacpp: { ...prev.llamacpp, model: list[0] }
          }));
        }
      } else {
        alert(t.alertFetchModelsFailed);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : (typeof e === 'object' && e !== null && 'message' in e) ? (e as any).message : String(e);
      alert(`Error fetching llama.cpp models: ${errorMsg}`);
    } finally {
      setFetchingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-100 font-serif flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t.settingsTitle}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 transition">
            ✕
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* General Settings */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
            <h3 className="font-bold text-amber-400 flex items-center gap-2 text-sm">
              🌐 {t.generalSettings}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">{t.uiLanguageLabel}</label>
                <select
                  value={localSettings.uiLanguage}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      uiLanguage: e.target.value,
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="ja">日本語 (Japanese)</option>
                  <option value="en">English</option>
                  <option value="ko">한국어 (Korean)</option>
                  <option value="zh">简体中文 (Chinese)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
                  <option value="de">Deutsch (German)</option>
                  <option value="ru">Русский (Russian)</option>
                  <option value="it">Italiano (Italian)</option>
                </select>
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">{t.targetLanguageLabel}</label>
                <select
                  value={localSettings.targetLanguage}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      targetLanguage: e.target.value,
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="ja">日本語 (Japanese)</option>
                  <option value="en">English</option>
                  <option value="ko">한국어 (Korean)</option>
                  <option value="zh">简体中文 (Chinese)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
                  <option value="de">Deutsch (German)</option>
                  <option value="ru">Русский (Russian)</option>
                  <option value="it">Italiano (Italian)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">{t.batchSizeLabel}</label>
                <input
                  type="number"
                  value={localSettings.batchSize}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      batchSize: parseInt(e.target.value) || 15,
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={localSettings.enableAutoUpdate ?? true}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      enableAutoUpdate: e.target.checked,
                    })
                  }
                  className="rounded border-neutral-800 bg-neutral-900 text-amber-500 focus:ring-amber-500/50 cursor-pointer"
                />
                <span className="text-neutral-300 font-bold">{t.enableAutoUpdateLabel}</span>
              </label>
              <p className="text-[10px] text-neutral-500 mt-1 pl-5">
                {t.autoUpdateHelp}
              </p>
            </div>
          </div>

          {/* Gemini Settings */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-amber-500 flex items-center gap-2 text-sm">
                ✨ Google Gemini API (Cloud)
              </h3>
              <button
                onClick={fetchGeminiModelsList}
                disabled={fetchingProvider === 'gemini'}
                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] rounded border border-amber-500/20 transition font-bold"
              >
                {fetchingProvider === 'gemini' ? 'Fetching...' : isJa ? 'モデル一覧取得' : 'Fetch Models'}
              </button>
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">API Key</label>
              <input
                type="password"
                value={localSettings.gemini.apiKey}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    gemini: { ...localSettings.gemini, apiKey: e.target.value },
                  })
                }
                placeholder="AIzaSy..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">Model Name</label>
              {geminiModels.length > 0 ? (
                <select
                  value={localSettings.gemini.model}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      gemini: { ...localSettings.gemini, model: e.target.value },
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  {geminiModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={localSettings.gemini.model}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      gemini: { ...localSettings.gemini, model: e.target.value },
                    })
                  }
                  placeholder="gemini-1.5-flash"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              )}
            </div>
          </div>

          {/* OpenAI Settings */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-blue-400 flex items-center gap-2 text-sm">
                🤖 OpenAI / Compatible API (Cloud)
              </h3>
              <button
                onClick={fetchOpenAiModelsList}
                disabled={fetchingProvider === 'openai'}
                className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] rounded border border-blue-500/20 transition font-bold"
              >
                {fetchingProvider === 'openai' ? 'Fetching...' : isJa ? 'モデル一覧取得' : 'Fetch Models'}
              </button>
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">API Key</label>
              <input
                type="password"
                value={localSettings.openai.apiKey}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    openai: { ...localSettings.openai, apiKey: e.target.value },
                  })
                }
                placeholder="sk-..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Base URL</label>
                <input
                  type="text"
                  value={localSettings.openai.baseUrl}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      openai: { ...localSettings.openai, baseUrl: e.target.value },
                    })
                  }
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">Model Name</label>
                {openaiModels.length > 0 ? (
                  <select
                    value={localSettings.openai.model}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        openai: { ...localSettings.openai, model: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    {openaiModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={localSettings.openai.model}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        openai: { ...localSettings.openai, model: e.target.value },
                      })
                    }
                    placeholder="gpt-4o-mini"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Cloud Throttling Limits */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
            <h3 className="font-bold text-amber-600 flex items-center gap-2 text-sm">
              ⏳ {isJa ? 'クラウドLLM 流量制限設定' : 'Cloud LLM Throttling (Gemini / OpenAI)'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">RPM (Requests Per Minute)</label>
                <input
                  type="number"
                  value={localSettings.rpm}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      rpm: parseInt(e.target.value) || 15,
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">TPM (Tokens/Chars Per Minute)</label>
                <input
                  type="number"
                  value={localSettings.tpm}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      tpm: parseInt(e.target.value) || 10000,
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Local LLM Settings */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-sm">
                🦙 Local LLM (Ollama / LM Studio / llama.cpp)
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={fetchOllamaModelsList}
                  disabled={fetchingProvider === 'ollama'}
                  className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] rounded border border-emerald-500/20 transition font-bold"
                >
                  {fetchingProvider === 'ollama' ? 'Fetching...' : 'Ollama List'}
                </button>
                <button
                  onClick={fetchLmstudioModelsList}
                  disabled={fetchingProvider === 'lmstudio'}
                  className="px-2 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-[10px] rounded border border-teal-500/20 transition font-bold"
                >
                  {fetchingProvider === 'lmstudio' ? 'Fetching...' : 'LM Studio List'}
                </button>
                <button
                  onClick={fetchLlamacppModelsList}
                  disabled={fetchingProvider === 'llamacpp'}
                  className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] rounded border border-cyan-500/20 transition font-bold"
                >
                  {fetchingProvider === 'llamacpp' ? 'Fetching...' : 'llama.cpp List'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Ollama Base URL</label>
                <input
                  type="text"
                  value={localSettings.ollama.baseUrl}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      ollama: { ...localSettings.ollama, baseUrl: e.target.value },
                    })
                  }
                  placeholder="http://localhost:11434"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">LM Studio Base URL</label>
                <input
                  type="text"
                  value={localSettings.lmstudio.baseUrl}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      lmstudio: { ...localSettings.lmstudio, baseUrl: e.target.value },
                    })
                  }
                  placeholder="http://localhost:1234"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">llama.cpp Base URL</label>
                <input
                  type="text"
                  value={localSettings.llamacpp.baseUrl}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      llamacpp: { ...localSettings.llamacpp, baseUrl: e.target.value },
                    })
                  }
                  placeholder="http://localhost:8080"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-400 mb-1">{isJa ? 'ローカルLLM 用モデル名' : 'Local Model Name'}</label>
                {localSettings.activeProvider === 'ollama' && ollamaModels.length > 0 ? (
                  <select
                    value={localSettings.ollama.model}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        ollama: { ...localSettings.ollama, model: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    {ollamaModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : localSettings.activeProvider === 'lmstudio' && lmstudioModels.length > 0 ? (
                  <select
                    value={localSettings.lmstudio.model}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        lmstudio: { ...localSettings.lmstudio, model: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    {lmstudioModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : localSettings.activeProvider === 'llamacpp' && llamacppModels.length > 0 ? (
                  <select
                    value={localSettings.llamacpp.model}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        llamacpp: { ...localSettings.llamacpp, model: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    {llamacppModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={
                      localSettings.activeProvider === 'ollama' 
                        ? localSettings.ollama.model 
                        : localSettings.activeProvider === 'llamacpp'
                        ? localSettings.llamacpp.model
                        : localSettings.lmstudio.model
                    }
                    onChange={(e) => {
                      const modelName = e.target.value;
                      setLocalSettings({
                        ...localSettings,
                        ollama: { ...localSettings.ollama, model: modelName },
                        lmstudio: { ...localSettings.lmstudio, model: modelName },
                        llamacpp: { ...localSettings.llamacpp, model: modelName }
                      });
                    }}
                    placeholder="llama3"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                  />
                )}
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">{isJa ? '最大コンテキスト制限 (文字数)' : 'Max Context Limit (Chars)'}</label>
                <input
                  type="number"
                  value={localSettings.contextLimit}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      contextLimit: parseInt(e.target.value) || 4096,
                    })
                  }
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Custom Prompt Settings */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-amber-500 flex items-center gap-2 text-sm">
                📝 {t.customPromptLabel}
              </h3>
              <button
                onClick={() => {
                  const defaultPrompt = `You are an expert game localizer specializing in Bethesda RPGs (Skyrim, Fallout, Starfield).
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
                  setLocalSettings(prev => ({
                    ...prev,
                    systemPromptTemplate: defaultPrompt
                  }));
                }}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] rounded border border-neutral-700 transition"
              >
                {t.resetToDefaultBtn}
              </button>
            </div>
            <div>
              <p className="text-neutral-500 text-[10px] mb-2 leading-relaxed whitespace-pre-line">
                {t.customPromptHelp}
              </p>
              <textarea
                value={localSettings.systemPromptTemplate || ''}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    systemPromptTemplate: e.target.value,
                  })
                }
                rows={12}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-amber-500/50 font-mono text-[10px] leading-normal"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white transition font-semibold"
          >
            {t.cancelBtn}
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-lg shadow-amber-900/20 transition"
          >
            {t.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
