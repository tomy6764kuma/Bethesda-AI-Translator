import React, { useState, useCallback, useEffect } from 'react';
import { TranslationString, XmlParams, GlossaryEntry, NpcProfile, AiSettings, LogEntry, AiProviderType, GameType } from './types';
import { XmlParser } from './services/xmlParser';
import { GlossaryService } from './services/glossaryService';
import { AiFactory } from './services/ai/aiFactory';
import { Header } from './components/Header';
import { TranslationTable } from './components/TranslationTable';
import { SettingsModal } from './components/SettingsModal';
import { LogViewer } from './components/LogViewer';
import { ProperNounExtractor } from './components/ProperNounExtractor';
import { GlossaryTab } from './components/GlossaryTab';
import { NpcProfilesTab } from './components/NpcProfilesTab';
import { TRANSLATIONS } from './i18n/translations';

const DEFAULT_SETTINGS: AiSettings = {
  activeProvider: 'gemini',
  gameType: 'default',
  gemini: { apiKey: '', model: 'gemini-1.5-flash' },
  openai: { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' },
  lmstudio: { baseUrl: 'http://localhost:1234', model: 'local-model' },
  batchSize: 15,
  autoBatchSize: true,
  maxConcurrent: 1,
  temperature: 0.2,
  rpm: 15,
  tpm: 10000,
  contextLimit: 4096,
  uiLanguage: 'en',
  targetLanguage: 'en',
  systemPromptTemplate: `You are an expert game localizer specializing in Bethesda RPGs (Skyrim, Fallout, Starfield).
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
]`,
};

export const App: React.FC = () => {
  const [filesParams, setFilesParams] = useState<Record<string, XmlParams>>({});
  const [items, setItems] = useState<TranslationString[]>([]);
  
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('bethesda_translator_glossary');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [profiles, setProfiles] = useState<NpcProfile[]>(() => {
    try {
      const saved = localStorage.getItem('bethesda_translator_npc_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [activeTab, setActiveTab] = useState<'editor' | 'glossary' | 'npc_profiles'>('editor');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExtractorOpen, setIsExtractorOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [settings, setSettings] = useState<AiSettings>(() => {
    try {
      const saved = localStorage.getItem('bethesda_translator_config');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Save settings, glossary, and profiles to localStorage automatically when changed
  useEffect(() => {
    localStorage.setItem('bethesda_translator_config', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('bethesda_translator_glossary', JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    localStorage.setItem('bethesda_translator_npc_profiles', JSON.stringify(profiles));
  }, [profiles]);

  const isJa = settings.uiLanguage === 'ja';
  const t = TRANSLATIONS[settings.uiLanguage];

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 200)]);
  }, []);

  // Auto detect and generate profiles for new NPCs using LLM
  const handleAutoDetectNpcProfiles = async (targetItems?: TranslationString[], isManualTrigger = false) => {
    const activeItems = targetItems || items;
    if (activeItems.length === 0) {
      if (isManualTrigger) {
        alert(isJa ? 'XMLデータが読み込まれていません。' : 'No XML data loaded.');
      }
      return;
    }

    const npcSamples: Record<string, { sex: string; samples: string[] }> = {};
    activeItems.forEach((item) => {
      if (!item.npc) return;

      let cleanName = item.npc.trim();
      if (cleanName.startsWith('[')) {
        const endIdx = cleanName.indexOf(']');
        if (endIdx !== -1) {
          cleanName = cleanName.substring(1, endIdx).trim();
        }
      }

      // Skip system speaker tags (e.g. NPC_:01006872) or hex FormIDs, matching the original app spec
      if (cleanName.startsWith('NPC_') || /^[0-9A-Fa-f]+$/.test(cleanName)) {
        return;
      }

      if (!npcSamples[cleanName]) {
        npcSamples[cleanName] = {
          sex: item.sex || 'Unknown',
          samples: []
        };
      }
      // Gather up to 6 samples for better accuracy
      if (npcSamples[cleanName].samples.length < 6 && item.source.trim().length > 0) {
        npcSamples[cleanName].samples.push(item.source);
      }
    });

    const existingNpcs = new Set(profiles.map(p => p.name.toLowerCase()));
    const newNpcNames = Object.keys(npcSamples).filter(name => 
      !existingNpcs.has(name.toLowerCase()) && npcSamples[name].samples.length > 0
    );

    if (newNpcNames.length === 0) {
      if (isManualTrigger) {
        alert(isJa ? '新規NPCは検出されませんでした（すべて登録済みです）。' : 'No new NPCs detected (all are already configured).');
      }
      return;
    }

    const isCloud = settings.activeProvider === 'gemini' || settings.activeProvider === 'openai';
    if (isCloud) {
      const msg = isJa
        ? `新規NPCが ${newNpcNames.length} 人検出されました。AIを使用して一人称や性格の自動設定（口調推定）を実行しますか？`
        : `Detected ${newNpcNames.length} new NPCs. Would you like to use AI to automatically generate their character profiles?`;
      if (!window.confirm(msg)) return;
    }

    addLog('ai', isJa ? `新規NPC (${newNpcNames.length}人) の性格・口調プロファイリングをAIに問い合わせ中...` : `Requesting AI profiling for ${newNpcNames.length} new NPCs...`);

    const NPC_BATCH_SIZE = 3;
    const allNewProfiles: NpcProfile[] = [];

    try {
      const provider = AiFactory.createProvider(settings);
      
      for (let i = 0; i < newNpcNames.length; i += NPC_BATCH_SIZE) {
        const batchNames = newNpcNames.slice(i, i + NPC_BATCH_SIZE);
        addLog('info', isJa ? `NPC プロファイル分析中: ${i + 1}〜${Math.min(i + NPC_BATCH_SIZE, newNpcNames.length)}人目 / 全${newNpcNames.length}人` : `Profiling NPCs: ${i + 1}-${Math.min(i + NPC_BATCH_SIZE, newNpcNames.length)} of ${newNpcNames.length}`);

        let prompt = `You are an expert game localizer. `;
        if (settings.gameType === 'tes') {
          prompt += `This game is in a medieval/high-fantasy setting (similar to The Elder Scrolls / Skyrim). Please output character profiles that fit a fantasy RPG. Select natural Japanese fantasy pronouns (e.g. first-person: 私, 我, 余, わし, あたし, second-person: そなた, 汝, あなた, お前) and tone description fitting feudal, royal, wizardry, or common medieval people. `;
        } else if (settings.gameType === 'fallout') {
          prompt += `This game is in a post-apocalyptic, retro-futuristic wasteland setting (similar to Fallout). Please output character profiles that fit a gritty, raw, retro-apocalypse RPG. Select pronouns (e.g. first-person: 俺, アタシ, 僕, 私, second-person: あんた, お前, あなた) and speech tone fitting rough wastelanders, raiders, hardened survivors, or tech-cultists. `;
        } else if (settings.gameType === 'starfield') {
          prompt += `This game is in a futuristic space-exploration sci-fi setting (similar to Starfield). Please output character profiles fitting space travelers, futuristic scientists, pilots, or space-colony miners (e.g. professional or modern space sci-fi tone). `;
        } else {
          prompt += `Analyze the following NPC(s) and their dialogue samples to determine the most natural Japanese localization profile: `;
        }
        prompt += `\n`;
        prompt += `1. "firstPerson": Preferred Japanese first-person pronoun (e.g., 私, 俺, 僕, あたし, わし, or "Player" if the gender is gender-neutral/Player).\n`;
        prompt += `2. "secondPerson": Preferred Japanese second-person pronoun (e.g., あなた, お前, あんた, 君, 汝, そなた).\n`;
        prompt += `3. "tone": Character personality/tone description in Japanese (e.g., 冷静沈着, 粗暴な無法者, 知的で丁寧).\n`;
        prompt += `4. "style": Sentence ending style in Japanese (e.g., です・ます調, だ・ある調, ～だぜ, ～わよ).\n\n`;
        prompt += `Return ONLY a raw JSON object mapping each NPC name to its profile. Do NOT wrap in markdown block (do NOT use \`\`\`json). Do NOT add any introduction, greeting, or explanation. Make sure to wrap JSON key names (NPC names) in double quotes, even if they contain special characters.\n\n`;
        prompt += `Required JSON Output Format:\n`;
        prompt += `{\n  "NPC_NAME": {\n    "npc": "NPC_NAME",\n    "sex": "Male|Female|Player|Unknown",\n    "firstPerson": "Japanese first-person pronoun",\n    "secondPerson": "Japanese second-person pronoun",\n    "tone": "Brief character description",\n    "style": "Ending style description"\n  }\n}\n\n`;
        prompt += `NPCs to analyze:\n`;

        batchNames.forEach(npc => {
          const info = npcSamples[npc];
          prompt += `\nNPC: ${npc}\nGender/Role: ${info.sex}\nDialogue Samples:\n`;
          info.samples.forEach(s => {
            prompt += `- "${s}"\n`;
          });
        });

        // Execute AI estimation via direct callLlm request
        const resText = await provider.callLlm(prompt);

        if (resText) {
          
          // Robust JSON boundaries search
          const startIdx = resText.indexOf('{');
          const endIdx = resText.lastIndexOf('}');
          if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
            addLog('error', `Failed to parse AI response for NPCs: ${batchNames.join(', ')}. No JSON brackets found.`);
            continue;
          }
          
          const cleanJsonText = resText.substring(startIdx, endIdx + 1);
          try {
            const parsedProfiles = JSON.parse(cleanJsonText);
            Object.keys(parsedProfiles).forEach(npcName => {
              const profile = parsedProfiles[npcName];
              allNewProfiles.push({
                name: profile.npc || npcName,
                sex: profile.sex || npcSamples[npcName]?.sex || 'Unknown',
                firstPerson: profile.firstPerson || '私',
                secondPerson: profile.secondPerson || 'あなた',
                toneStyle: `${profile.tone || ''} / ${profile.style || ''}`,
              });
            });
          } catch (jsonErr) {
            addLog('error', `Failed to parse AI response JSON for NPCs: ${batchNames.join(', ')}. Error: ${(jsonErr as Error).message}`);
          }
        } else {
          addLog('error', `AI returned empty response for NPCs: ${batchNames.join(', ')}`);
        }

        // Wait 2.5 seconds between batches to avoid Gemini 500/503 rates issues
        if (i + NPC_BATCH_SIZE < newNpcNames.length) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      }

      if (allNewProfiles.length > 0) {
        setProfiles((prev) => {
          const next = prev.filter(p => !allNewProfiles.some(n => n.name.toLowerCase() === p.name.toLowerCase()));
          return [...next, ...allNewProfiles];
        });
        addLog('success', isJa ? `${allNewProfiles.length} 件のNPC口調プロファイルを自動設定しました。` : `Automatically configured ${allNewProfiles.length} NPC tone profiles.`);
      }
    } catch (e) {
      addLog('error', `Failed to automatically detect NPC profiles: ${(e as Error).message}`);
    }
  };

  // Handle XML Open
  const handleOpenFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    addLog('info', t.loadingFiles(files.length));

    const newFilesParams: Record<string, XmlParams> = {};
    let allItems: TranslationString[] = [];

    const filePromises = Array.from(files).map((file) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const { params: parsedParams, items: parsedItems } = XmlParser.parse(content);
            
            // 各アイテムに所属するファイル名を記録
            const itemsWithFileName = parsedItems.map(item => ({
              ...item,
              fileName: file.name
            }));

            newFilesParams[file.name] = parsedParams;
            allItems = [...allItems, ...itemsWithFileName];
            
            addLog('success', t.xmlLoaded(file.name, parsedItems.length));
            resolve();
          } catch (err) {
            addLog('error', t.xmlFailed(`${file.name}: ${(err as Error).message}`));
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });
    });

    try {
      await Promise.all(filePromises);
      setFilesParams(newFilesParams);
      setItems(allItems);
      
      // Auto-run LLM NPC profiling for all loaded items
      await handleAutoDetectNpcProfiles(allItems);
    } catch (err) {
      addLog('error', isJa ? '一部のファイルの読み込みに失敗しました。' : 'Failed to load some files.');
    }
  };

  // Handle Save XML
  const handleSaveFile = () => {
    if (Object.keys(filesParams).length === 0 || items.length === 0) return;

    try {
      // ファイル名ごとにアイテムをグループ化
      const itemsByFile: Record<string, TranslationString[]> = {};
      items.forEach((item) => {
        const fileName = item.fileName || 'unknown.xml';
        if (!itemsByFile[fileName]) {
          itemsByFile[fileName] = [];
        }
        itemsByFile[fileName].push(item);
      });

      // 各ファイルごとにXMLを生成して保存
      Object.entries(itemsByFile).forEach(([fileName, fileItems]) => {
        const fileParams = filesParams[fileName] || {
          addon: fileName.replace('.xml', ''),
          source: 'en',
          dest: 'ja',
          version: '2'
        };

        const xmlContent = XmlParser.generate(fileParams, fileItems);
        const blob = new Blob([xmlContent], { type: 'text/xml;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const baseName = fileName.endsWith('.xml') ? fileName.slice(0, -4) : fileName;
        link.download = `${baseName}_${settings.targetLanguage}.xml`;
        link.click();
        URL.revokeObjectURL(url);
      });

      addLog('success', t.saveAllSuccess);
    } catch (err) {
      addLog('error', t.saveFailed((err as Error).message));
    }
  };

  // Update dest manual entry
  const handleUpdateDest = (id: string, newDest: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              dest: newDest,
              status: newDest.trim().length > 0 ? 'modified' : 'untranslated',
            }
          : item
      )
    );
  };

  // Apply AI translation
  const handleApplyAiTranslation = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && item.aiTranslation
          ? { ...item, dest: item.aiTranslation, status: 'translated' }
          : item
      )
    );
  };

  // Auto calculate optimal batch size based on RPM / Context Limit
  const getBatchSize = (isLocalLlm: boolean) => {
    if (!settings.autoBatchSize) {
      return settings.batchSize || 15;
    }

    if (items.length === 0) return 10;

    // Calculate average source text length
    const totalLen = items.reduce((sum, i) => sum + i.source.length, 0);
    const avgLen = Math.max(20, Math.floor(totalLen / items.length));

    if (isLocalLlm) {
      const maxRows = Math.max(1, Math.floor(settings.contextLimit / (avgLen + 150)));
      return Math.min(25, maxRows);
    } else {
      const maxRows = Math.max(1, Math.min(20, Math.floor(settings.tpm / 400)));
      return maxRows;
    }
  };

  // Start Batch Translation (with intelligent cloud RPM/TPM and local Context Limit scheduling)
  const handleStartTranslation = async () => {
    const untranslated = items.filter((i) => i.status === 'untranslated');
    if (untranslated.length === 0) {
      addLog('info', t.noUntranslated);
      return;
    }

    setIsTranslating(true);
    addLog('ai', t.startTranslation(settings.activeProvider.toUpperCase()));

    try {
      const provider = AiFactory.createProvider(settings);
      const isLocalLlm = settings.activeProvider === 'ollama' || settings.activeProvider === 'lmstudio';
      const calculatedBatchSize = getBatchSize(isLocalLlm);

      addLog('info', t.autoBatchSizeInfo(calculatedBatchSize));

      let batches: TranslationString[][] = [];
      for (let i = 0; i < untranslated.length; i += calculatedBatchSize) {
        batches.push(untranslated.slice(i, i + calculatedBatchSize));
      }

      let requestTimestamps: number[] = [];
      let tokenWindowTokens: number[] = [];
      let tokenWindowTimestamps: number[] = [];

      for (let index = 0; index < batches.length; index++) {
        const chunk = batches[index];
        addLog('info', t.translatingBatch(index + 1, batches.length));

        const batchTextLength = chunk.reduce((sum, item) => sum + item.source.length, 0);

        if (!isLocalLlm) {
          const now = Date.now();

          // RPM Check
          requestTimestamps = requestTimestamps.filter(ts => now - ts < 60000);
          if (requestTimestamps.length >= settings.rpm) {
            const oldestRequest = requestTimestamps[0];
            const waitTime = 60000 - (now - oldestRequest);
            if (waitTime > 0) {
              addLog('warning', t.batchWait(waitTime / 1000));
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }

          // TPM Check
          const cleanNow = Date.now();
          tokenWindowTimestamps = tokenWindowTimestamps.filter((ts, idx) => {
            const isValid = cleanNow - ts < 60000;
            if (!isValid) {
              tokenWindowTokens.splice(idx, 1);
            }
            return isValid;
          });

          const currentUsedTokens = tokenWindowTokens.reduce((sum, val) => sum + val, 0);
          if (currentUsedTokens + batchTextLength > settings.tpm) {
            const waitTime = 30000;
            addLog('warning', t.tpmWait(waitTime / 1000));
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }

          requestTimestamps.push(Date.now());
          tokenWindowTimestamps.push(Date.now());
          tokenWindowTokens.push(batchTextLength);
        }

        // Prepare request items
        const requestItems = chunk.map((c) => ({
          id: c.id,
          source: c.source,
          npc: c.npc,
          sex: c.sex,
        }));

        const relevantGlossary = GlossaryService.filterRelevantEntries(
          chunk.map((c) => c.source),
          glossary
        );

        const batchNpcNames = new Set(
          chunk.map((c) => {
            if (!c.npc) return '';
            let cleanName = c.npc.trim();
            if (cleanName.startsWith('[')) {
              const endIdx = cleanName.indexOf(']');
              if (endIdx !== -1) {
                cleanName = cleanName.substring(1, endIdx).trim();
              }
            }
            return cleanName;
          }).filter(Boolean)
        );
        const batchNpcProfiles = profiles.filter((p) => batchNpcNames.has(p.name));
        let npcProfilesText = batchNpcProfiles.map(
          p => `NPC [${p.name}]: 性別/属性='${p.sex || 'Unknown'}', 一人称='${p.firstPerson || '私'}', 二人称='${p.secondPerson || 'あなた'}', 口調スタイル='${p.toneStyle || '特になし'}'`
        ).join('\n');

        let gameWorldPrompt = '';
        if (settings.gameType === 'tes') {
          gameWorldPrompt = `[Game World Setting]: High-Fantasy RPG (medieval theme like The Elder Scrolls/Skyrim). Translate all dialogues using appropriate fantasy phrasing, royal/feudal honorifics, and period-accurate language styles.\n`;
        } else if (settings.gameType === 'fallout') {
          gameWorldPrompt = `[Game World Setting]: Post-Apocalyptic Retro-Futuristic Wasteland (gritty survival theme like Fallout). Translate dialogues in a raw, casual, slang-rich, or hardened survivors' style.\n`;
        } else if (settings.gameType === 'starfield') {
          gameWorldPrompt = `[Game World Setting]: Space Exploration Sci-Fi (spaceflight sci-fi theme like Starfield). Translate dialogues using futuristic, technical, pilot, or miner terminology in a modern tone.\n`;
        }

        const combinedPromptText = gameWorldPrompt + npcProfilesText;

        // Request Translation with dynamic automatic retry for temporary API errors
        let results;
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = Math.max(7000, Math.ceil(75000 / settings.rpm)); // Dynamic delay based on RPM

        while (true) {
          try {
            results = await provider.translateBatch(
              requestItems,
              relevantGlossary,
              combinedPromptText || undefined,
              (msg) => addLog('ai', msg)
            );
            break; // Success! Exit retry loop
          } catch (err) {
            const errorMsg = (err as Error).message;
            // Catch typical transient / recoverable errors
            const isRetryable =
              errorMsg.includes('503') ||
              errorMsg.includes('500') ||
              errorMsg.includes('UNAVAILABLE') ||
              errorMsg.includes('INTERNAL') ||
              errorMsg.includes('timeout') ||
              errorMsg.includes('rate limit') ||
              errorMsg.includes('429');

            if (isRetryable && retryCount < maxRetries) {
              retryCount++;
              addLog('warning', isJa
                ? `一時的なAPIエラーが発生しました。${(retryDelay / 1000).toFixed(1)}秒後に自動リトライします (${retryCount}/${maxRetries}): ${errorMsg}`
                : `Temporary API error occurred. Retrying in ${(retryDelay / 1000).toFixed(1)}s (${retryCount}/${maxRetries}): ${errorMsg}`
              );
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
              throw err; // Re-throw fatal or max-retried errors
            }
          }
        }

        // Update UI State
        setItems((prev) =>
          prev.map((item) => {
            const res = results.find((r) => r.id === item.id);
            if (res && res.translated) {
              return {
                ...item,
                dest: res.translated,
                aiTranslation: res.translated,
                status: 'ai_generated',
              };
            }
            return item;
          })
        );

        addLog('success', t.batchSuccess(index + 1, results.length));
      }

      addLog('success', t.allCompleted);
    } catch (err) {
      addLog('error', t.stopped((err as Error).message));
    } finally {
      setIsTranslating(false);
    }
  };

  // AI translator specifically for extracted proper nouns
  const handleAiTranslateNouns = async (nouns: string[]): Promise<Record<string, string>> => {
    addLog('ai', t.aiNounTranslating(nouns.length));
    try {
      const provider = AiFactory.createProvider(settings);
      
      // Structure proper nouns translation request as simple objects
      const requestItems = nouns.map((noun, idx) => ({
        id: `noun_${idx}`,
        source: noun,
      }));

      const results = await provider.translateBatch(
        requestItems,
        [],
        undefined,
        (msg) => addLog('ai', msg)
      );

      const mapping: Record<string, string> = {};
      nouns.forEach((noun, idx) => {
        const res = results.find((r) => r.id === `noun_${idx}`);
        if (res && res.translated) {
          mapping[noun] = res.translated;
        }
      });

      addLog('success', t.aiNounSuccess);
      return mapping;
    } catch (e) {
      addLog('error', `AI Proper Noun translation failed: ${(e as Error).message}`);
      throw e;
    }
  };

  const untranslatedCount = items.filter((i) => i.status === 'untranslated').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 font-sans text-neutral-200 overflow-hidden antialiased">
      <Header
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onStartTranslation={handleStartTranslation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeProvider={settings.activeProvider}
        onChangeProvider={(p: AiProviderType) => setSettings({ ...settings, activeProvider: p })}
        gameType={settings.gameType}
        onChangeGameType={(g: GameType) => setSettings({ ...settings, gameType: g })}
        isTranslating={isTranslating}
        totalCount={items.length}
        untranslatedCount={untranslatedCount}
        uiLanguage={settings.uiLanguage}
      />

      {/* Main Tab Controls & Extractor Toggle */}
      <div className="bg-neutral-900 px-6 py-2 border-b border-neutral-800 flex items-center justify-between select-none">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'editor'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            📖 {t.tabEditor}
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'glossary'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            📚 {t.tabGlossary} ({glossary.length})
          </button>
          <button
            onClick={() => setActiveTab('npc_profiles')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'npc_profiles'
                ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            👤 {t.tabNpcProfiles} ({profiles.length})
          </button>
        </div>

        {activeTab === 'editor' && (
          <button
            onClick={() => setIsExtractorOpen(!isExtractorOpen)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              isExtractorOpen
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            🔍 {isExtractorOpen ? t.hideExtractor : t.showExtractor}
          </button>
        )}
      </div>

      {/* Main Tab Render Views */}
      <main className="flex-1 flex min-h-0 relative overflow-hidden">
        {activeTab === 'editor' && (
          <TranslationTable
            items={items}
            onUpdateDest={handleUpdateDest}
            onApplyAiTranslation={handleApplyAiTranslation}
            uiLanguage={settings.uiLanguage}
          />
        )}

        {activeTab === 'glossary' && (
          <GlossaryTab
            glossary={glossary}
            onAddEntry={(entry) => {
              setGlossary((prev) => {
                const exists = prev.some(g => g.original.toLowerCase() === entry.original.toLowerCase());
                if (exists) return prev;
                return [...prev, entry];
              });
              addLog('success', isJa ? `用語集に "${entry.original}" を追加しました。` : `Added "${entry.original}" to glossary.`);
            }}
            onDeleteEntry={(original) => {
              setGlossary((prev) => prev.filter(g => g.original !== original));
              addLog('info', isJa ? `用語集から "${original}" を削除しました。` : `Deleted "${original}" from glossary.`);
            }}
            onImportGlossary={(entries) => {
              setGlossary((prev) => {
                const unique = [...prev];
                entries.forEach((e) => {
                  if (!unique.some((u) => u.original.toLowerCase() === e.original.toLowerCase())) {
                    unique.push(e);
                  }
                });
                return unique;
              });
              addLog('success', isJa ? `${entries.length} 件の用語を読み込みました。` : `Imported ${entries.length} glossary terms.`);
            }}
            uiLanguage={settings.uiLanguage}
          />
        )}

        {activeTab === 'npc_profiles' && (
          <NpcProfilesTab
            items={items}
            profiles={profiles}
            onSaveProfile={(profile) => {
              setProfiles((prev) => {
                const next = prev.filter((p) => p.name.toLowerCase() !== profile.name.toLowerCase());
                next.push(profile);
                return next;
              });
              addLog('success', isJa ? `NPC "${profile.name}" の口調プロファイルを保存しました。` : `Saved NPC tone profile for "${profile.name}".`);
            }}
            onDeleteProfile={(name) => {
              setProfiles((prev) => prev.filter((p) => p.name.toLowerCase() !== name.toLowerCase()));
              addLog('info', isJa ? `NPC "${name}" の口調設定を削除しました。` : `Deleted NPC tone profile for "${name}".`);
            }}
            onImportProfiles={(importedProfiles) => {
              setProfiles((prev) => {
                const next = prev.filter(p => !importedProfiles.some(i => i.name.toLowerCase() === p.name.toLowerCase()));
                return [...next, ...importedProfiles];
              });
              addLog('success', isJa ? `${importedProfiles.length} 件のNPC口調設定を読み込みました。` : `Imported ${importedProfiles.length} NPC profiles.`);
            }}
            uiLanguage={settings.uiLanguage}
            onAutoDetectNpcProfiles={() => handleAutoDetectNpcProfiles(undefined, true)}
          />
        )}

        {activeTab === 'editor' && isExtractorOpen && (
          <ProperNounExtractor
            items={items}
            glossary={glossary}
            uiLanguage={settings.uiLanguage}
            activeProvider={settings.activeProvider}
            onAiTranslateNouns={handleAiTranslateNouns}
            onAddGlossaryEntry={(entry) => {
              setGlossary((prev) => {
                const exists = prev.some(g => g.original.toLowerCase() === entry.original.toLowerCase());
                if (exists) return prev;
                return [...prev, entry];
              });
              addLog('success', isJa ? `固有名詞 "${entry.original}" を用語集に追加しました。` : `Added "${entry.original}" to glossary.`);
            }}
            onAddGlossaryEntries={(entries) => {
              setGlossary((prev) => {
                const unique = [...prev];
                let addedCount = 0;
                entries.forEach((e) => {
                  if (!unique.some((u) => u.original.toLowerCase() === e.original.toLowerCase())) {
                    unique.push(e);
                    addedCount++;
                  }
                });
                if (addedCount > 0) {
                  addLog('success', t.glossaryBatchAdded(addedCount));
                }
                return unique;
              });
            }}
          />
        )}
      </main>

      <LogViewer logs={logs} onClearLogs={() => setLogs([])} uiLanguage={settings.uiLanguage} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          addLog('info', TRANSLATIONS[newSettings.uiLanguage].settingsSaved);
        }}
      />
    </div>
  );
};

export default App;
