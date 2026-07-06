import React, { useState, useMemo, useRef } from 'react';
import { TranslationString, NpcProfile } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface NpcProfilesTabProps {
  items: TranslationString[];
  profiles: NpcProfile[];
  onSaveProfile: (profile: NpcProfile) => void;
  onDeleteProfile: (name: string) => void;
  onImportProfiles: (profiles: NpcProfile[]) => void;
  uiLanguage: string;
  onAutoDetectNpcProfiles: () => void;
}

export const NpcProfilesTab: React.FC<NpcProfilesTabProps> = ({
  items,
  profiles,
  onSaveProfile,
  onDeleteProfile,
  onImportProfiles,
  uiLanguage,
  onAutoDetectNpcProfiles,
}) => {
  const [selectedNpc, setSelectedNpc] = useState<string>('');
  const [sex, setSex] = useState('Unknown');
  const [firstPerson, setFirstPerson] = useState('');
  const [secondPerson, setSecondPerson] = useState('');
  const [toneStyle, setToneStyle] = useState('');
  const [search, setSearch] = useState('');

  // States for adding a new profile
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newNpcNameInput, setNewNpcNameInput] = useState('');
  const [selectedNpcFromDropdown, setSelectedNpcFromDropdown] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[uiLanguage] || TRANSLATIONS['en'];
  const isJa = uiLanguage === 'ja';

  // 1. Extract unconfigured valid NPCs from XML items
  const unconfiguredDetectedNpcs = useMemo(() => {
    const npcs = new Set<string>();
    const npcHasDialogue = new Set<string>();
    const configuredNames = new Set(profiles.map(p => p.name.toLowerCase()));

    items.forEach((item) => {
      if (item.npc) {
        let cleanName = item.npc.trim();
        if (cleanName.startsWith('[')) {
          const endIdx = cleanName.indexOf(']');
          if (endIdx !== -1) {
            cleanName = cleanName.substring(1, endIdx).trim();
          }
        }

        // Skip system speaker tags (e.g. NPC_:01006872) or hex FormIDs, matching original app spec
        if (cleanName.startsWith('NPC_') || /^[0-9A-Fa-f]+$/.test(cleanName)) {
          return;
        }

        if (cleanName) {
          npcs.add(cleanName);
          if (item.source && item.source.trim().length > 0) {
            npcHasDialogue.add(cleanName);
          }
        }
      }
    });

    return Array.from(npcs)
      .filter(name => npcHasDialogue.has(name) && !configuredNames.has(name.toLowerCase()))
      .sort();
  }, [items, profiles]);

  // 2. Filter registered profiles for left-side list
  const filteredProfiles = useMemo(() => {
    return profiles
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, search]);

  const handleSelectProfile = (name: string) => {
    setSelectedNpc(name);
    const existing = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSex(existing.sex || 'Unknown');
      setFirstPerson(existing.firstPerson || '');
      setSecondPerson(existing.secondPerson || '');
      setToneStyle(existing.toneStyle || '');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNpc) return;

    onSaveProfile({
      name: selectedNpc,
      sex: sex,
      firstPerson: firstPerson.trim(),
      secondPerson: secondPerson.trim(),
      toneStyle: toneStyle.trim(),
    });
  };

  // Add new profile frame
  const handleAddNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = (newNpcNameInput.trim() || selectedNpcFromDropdown).trim();
    if (!finalName) return;

    // Check if already exists
    const exists = profiles.some(p => p.name.toLowerCase() === finalName.toLowerCase());
    if (exists) {
      alert(t.alertNpcAlreadyExists(finalName));
      handleSelectProfile(finalName);
      setIsAddingNew(false);
      setNewNpcNameInput('');
      setSelectedNpcFromDropdown('');
      return;
    }

    // Initialize state
    setSelectedNpc(finalName);
    setSex('Unknown');
    setFirstPerson('');
    setSecondPerson('');
    setToneStyle('');

    setIsAddingNew(false);
    setNewNpcNameInput('');
    setSelectedNpcFromDropdown('');
  };

  // Export JSON
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(profiles, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = 'npc_profiles.json';

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    }
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);

        if (!Array.isArray(imported)) {
          throw new Error(t.alertNpcImportInvalidFormat);
        }

        // Validate format of each item
        const validProfiles: NpcProfile[] = [];
        imported.forEach((item, index) => {
          if (item && typeof item === 'object' && typeof item.name === 'string') {
            validProfiles.push({
              name: item.name,
              sex: typeof item.sex === 'string' ? item.sex : 'Unknown',
              firstPerson: typeof item.firstPerson === 'string' ? item.firstPerson : '',
              secondPerson: typeof item.secondPerson === 'string' ? item.secondPerson : '',
              toneStyle: typeof item.toneStyle === 'string' ? item.toneStyle : '',
            });
          } else {
            console.warn(`Skipped invalid profile at index ${index}`);
          }
        });

        if (validProfiles.length > 0) {
          onImportProfiles(validProfiles);
        } else {
          alert(t.alertNpcImportNoValidData);
        }
      } catch (err) {
        alert(t.alertNpcImportFailed((err as Error).message));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 p-6 space-y-6 overflow-y-auto select-none">
      {/* Header with Import/Export UI */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 font-serif">
            {t.npcProfilesTitle}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            {t.npcProfilesSubTitle}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* JSON Export */}
          <button
            onClick={handleExport}
            disabled={profiles.length === 0}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
            title={t.exportNpcBtn}
          >
            📤 {t.exportNpcBtn}
          </button>

          {/* JSON Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
            title={t.importNpcBtn}
          >
            📥 {t.importNpcBtn}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />

          {/* AI Analyse trigger */}
          <button
            onClick={onAutoDetectNpcProfiles}
            disabled={items.length === 0}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-neutral-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-900/10 active:scale-95"
          >
            ✨ {t.aiAnalyzeNpcBtn}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Side: Profiles List */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col max-h-[60vh] min-h-[45vh]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-neutral-300 font-serif">
              {t.savedNpcProfilesCount(profiles.length)}
            </h3>
            
            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 px-2 py-1 rounded-lg font-bold transition"
            >
              {isAddingNew ? (isJa ? '閉じる' : 'Cancel') : `➕ ${isJa ? '新規追加' : 'Add New'}`}
            </button>
          </div>

          {/* Inline Add New Profile form */}
          {isAddingNew && (
            <form onSubmit={handleAddNewProfile} className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 mb-3 space-y-2.5 animate-fadeIn">
              <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                {t.addNpcTitle}
              </h4>

              <div>
                <label className="block text-[9px] text-neutral-500 mb-0.5">
                  {t.selectNpcPlaceholder}
                </label>
                {unconfiguredDetectedNpcs.length === 0 ? (
                  <div className="text-[10px] text-neutral-600 italic">
                    {t.noUnconfiguredNpcs}
                  </div>
                ) : (
                  <select
                    value={selectedNpcFromDropdown}
                    onChange={(e) => {
                      setSelectedNpcFromDropdown(e.target.value);
                      setNewNpcNameInput('');
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    <option value="">{t.selectNpcOption}</option>
                    {unconfiguredDetectedNpcs.map(npc => (
                      <option key={npc} value={npc}>{npc}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[9px] text-neutral-500 mb-0.5">
                  {t.orInputNpcManually}
                </label>
                <input
                  type="text"
                  placeholder="e.g. MyCustomNPC"
                  value={newNpcNameInput}
                  onChange={(e) => {
                    setNewNpcNameInput(e.target.value);
                    setSelectedNpcFromDropdown('');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 px-2 py-1 rounded-lg focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={!newNpcNameInput.trim() && !selectedNpcFromDropdown}
                className="w-full py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-neutral-950 font-bold rounded-lg text-[10px] transition"
              >
                {t.openSettingsFormBtn}
              </button>
            </form>
          )}

          <input
            type="text"
            placeholder={t.searchNpcPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 px-3 py-2 rounded-xl mb-3 focus:outline-none focus:border-amber-500/50"
          />

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60 pr-1">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-12 text-neutral-600 text-xs italic">
                {t.noNpcProfilesRegistered}
              </div>
            ) : (
              filteredProfiles.map((p) => {
                return (
                  <button
                    key={p.name}
                    onClick={() => handleSelectProfile(p.name)}
                    className={`w-full text-left py-2.5 px-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      selectedNpc === p.name
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 mr-2">
                      <span className="truncate font-bold">🗣️ {p.name}</span>
                      <span className="text-[10px] text-neutral-500 truncate mt-0.5">
                        {p.firstPerson ? `${isJa ? '一人称' : 'Pronoun'}: ${p.firstPerson}` : ''}
                        {p.toneStyle ? ` | ${p.toneStyle}` : ''}
                      </span>
                    </div>
                    {p.sex && (
                      <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700 shrink-0 uppercase font-mono">
                        {p.sex}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Profile Editor Form */}
        <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          {!selectedNpc ? (
            <div className="text-center py-24 text-neutral-500 text-xs font-serif italic">
              {t.selectNpcPrompt}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-amber-400 font-serif">
                  {t.editNpcProfileTitle(selectedNpc)}
                </h3>
                {profiles.some((p) => p.name.toLowerCase() === selectedNpc.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteProfile(selectedNpc);
                      setSelectedNpc('');
                      setSex('Unknown');
                      setFirstPerson('');
                      setSecondPerson('');
                      setToneStyle('');
                    }}
                    className="text-[10px] text-red-400 font-bold hover:underline"
                  >
                    {t.deleteNpcSettingsBtn}
                  </button>
                )}
              </div>

              {/* Sex & First Person & Second Person inputs */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    {isJa ? '性別 / 属性' : 'Gender / Role'}
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    <option value="Unknown">{isJa ? '不明 / 不定' : 'Unknown'}</option>
                    <option value="Male">{isJa ? '男性 (Male)' : 'Male'}</option>
                    <option value="Female">{isJa ? '女性 (Female)' : 'Female'}</option>
                    <option value="Player">{isJa ? 'プレイヤー (Player)' : 'Player'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    {isJa ? '一人称 (例: 私、僕、俺、わし)' : 'First-person (e.g. 私, 俺)'}
                  </label>
                  <input
                    type="text"
                    value={firstPerson}
                    onChange={(e) => setFirstPerson(e.target.value)}
                    placeholder="e.g. 私"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    {isJa ? '二人称 (例: あなた、お前、君)' : 'Second-person (e.g. あなた, 君)'}
                  </label>
                  <input
                    type="text"
                    value={secondPerson}
                    onChange={(e) => setSecondPerson(e.target.value)}
                    placeholder="e.g. あなた"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  {isJa ? '口調・話し方の特徴（語尾、キャラクター像）' : 'Tone & Style Features (ending, character description)'}
                </label>
                <textarea
                  value={toneStyle}
                  onChange={(e) => setToneStyle(e.target.value)}
                  placeholder={
                    isJa
                      ? '例: 老齢の男性。語尾は「～じゃ」「～のう」を使用。知識人らしい話し方。'
                      : 'e.g. Elderly male. Uses polite but old-fashioned language.'
                  }
                  rows={4}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50 leading-relaxed resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition"
              >
                {isJa ? 'プロファイルを保存・適用' : 'Save Profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default NpcProfilesTab;
