# Changelog

All notable changes to this project will be documented in this file.
このプロジェクトのすべての注目すべき変更はこのファイルに記録されます。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠しています。

## [1.0.4] - 2026-07-06

### Added (新規追加)
- **Target NPC Filter Dropdown**: Introduced a new NPC filter dropdown inside the Translation Editor tab. When a specific NPC is selected, the translation table dynamically displays only the dialogue lines associated with that character.
- **対象NPCフィルタードロップダウンの導入**: 翻訳エディタタブ内に「対象NPC」を選択できるフィルタードロップダウンを新規導入。選択したNPCのセリフ行のみをテーブルに抽出して表示できるよう改善。
- **Bulk Clear Selected NPC Translations**: Added a button to clear all translated lines for the currently selected NPC in one click, accompanied by a double-confirmation safety dialog to prevent accidental data loss.
- **選択中NPCの翻訳一括クリア機能**: フィルタで選択しているNPCの翻訳テキストをワンクリックで一括消去して空欄（未翻訳）に戻せる機能と、誤消去防止用の確認アラートを追加。
- **NPC-Specific Re-translation Logic**: Added support for targeted translation focused on the selected NPC. If translations already exist, a dialog prompts the user to either overwrite/re-translate all lines or translate untranslated lines only.
- **特定NPCに対する上書き再翻訳選択機能**: フィルタで選択中のNPCのみを自動翻訳する際、すでに翻訳済みセリフが存在する場合に「すべて上書き再翻訳」するか「未翻訳行のみ翻訳」するかを選択できるダイアログ分岐を追加。
- **Safe i18n Fallback (Crash Prevention)**: Wrapped the translations object in a JavaScript `Proxy` to dynamically fallback missing keys to English equivalents, preventing React rendering crashes (e.g. `TypeError: is not a function` for template key arguments) across all supported UI languages.
- **多言語表示クラッシュ防止機能 (Proxyフォールバック)**: 新機能追加時に翻訳キーが未登録の言語に切り替えても, 自動的に英語（en）から同名のキーと関数定義を補完して読み込むProxyラッパーを実装。他言語での画面強制終了（真っ白・真っ黒になる現象）を100%防止。
- **Full UI Localization for All Locales**: Relocated all remaining hardcoded alerts, dialog validations, and UI labels (in `NpcProfilesTab`, `GlossaryTab`, `SettingsModal`, and `App.tsx`) to localized translation keys, achieving complete UI localization across all 9 supported languages.
- **全UIハードコード文字列のローカライズ完了（全言語対応）**: 用語集やNPCプロファイル管理、環境設定、コンソールログなどで一部残っていた日本語・英語の直接書き込みテキストをすべて多言語キーに統一し、サポートされている全9言語において完全にローカライズされた表示に対応。

### Improved (改善)
- **Target-Language Adaptive NPC Profiling**: Updated the automatic NPC tone detection logic to dynamically adjust the AI's instruction prompt, pronoun suggestions, and parser fallback values to match the user's selected translation target language (e.g. suggesting Japanese pronouns like "私/俺/あなた" when translating to Japanese, or Chinese pronouns like "我/你" when translating to Chinese).
- **翻訳先言語に連動したNPC自動口調推定**: AIによる口調の自動推定プロンプトと人称の提案・フォールバック値を、選択された「翻訳先言語」に動的に適合するよう改善。

### Fixed (バグ修正)
- **Tab Component Localization Cleanup**: Relocated all remaining hardcoded alerts, dialog validations, and UI labels (in `NpcProfilesTab`, `GlossaryTab`, `SettingsModal`, and `App.tsx`) to localized translation keys.
- **UIハードコード文字列のローカライズ漏れ解消**: 用語集やNPCプロファイル管理、環境設定、コンソールログなどで一部残っていた日本語・英語の直接書き込みテキストをすべて多言語キーに統一。

## [1.0.3] - 2026-07-05

### Added (新規追加)
- **Manual Stop Button**: Added a red "Stop Translation" button in place of the start button to safely interrupt active batch translation loops. (Fully localized in 9 languages)
- **手動「翻訳停止」ボタンの追加**: 翻訳処理をいつでも安全に途中停止できるボタンを追加。（9言語の多言語対応）
- **llama.cpp (Local) option**: Added a native `llama.cpp (Local)` selector in the engine dropdown.
- **llama.cppオプションの追加**: エンジン選択ドロップダウンに `llama.cpp (Local)` 専用の選択肢を追加。
- **User Manual inclusion**: Package now includes user manuals (`README.txt` / `README_JA.txt`) for detailed settings and parameters.
- **取扱説明書の同梱**: パッケージ内に詳細設定や `llama-server` の起動例を解説した簡易取扱説明書を同梱。

### Improved (改善)
- **Proper Noun RPM Throttling**: Added RPM/TPM limit check and cooldown delay for proper noun translations.
- **固有名詞翻訳のRPM制限機能**: 固有名詞翻訳時にもAPIのRPM流量制限を考慮して自動待機時間を挟むよう改善。
- **Stopwords auto-exclusion**: Registered stopwords are now automatically excluded from future proper noun scans.
- **ストップワード機能の改善**: 登録されたストップワードは次回以降の固有名詞スキャン時にも自動除外されるように改善。
- **Ollama Default URL**: Reverted default Ollama base URL to `http://localhost:11434`.
- **OllamaデフォルトURLの復帰**: 初期接続URLを元の `http://localhost:11434` に差し戻しました。

### Fixed (バグ修正)
- **Tauri v2 HTTP CORS fix**: Resolved `403 Forbidden` CORS errors when connecting to local LLM servers by automatically appending correct `Origin` headers to requests.
- **Tauri v2 CORSエラーの解消**: ローカルLLM接続時の403 CORSエラーを自動 `Origin` ヘッダー付与によって解決。
- **Ollama Dialogue Quality Fix**: Removed strict `format: "json"` constraint to prevent local models from forcing thought logs inside translated JSON values.
- **Ollamaゴミテキスト混入バグの解消**: Ollamaへの JSON 強制パラメータを削除し、翻訳文のバリュー内にモデルの思考ログがねじ込まれるバグを解決。
- **Safe ID Mapping & Restoration**: Implemented sequential IDs with secure restoration to prevent local models from resetting IDs (causing 0% completion) while avoiding line-shifting data corruption.
- **IDの自動復元とズレの解消**: ローカルモデルがIDを書き換える現象に対し、ID一時連番化と安全な逆引き復元によって翻訳データのズレを防ぎつつ解決。
- **Enhanced JSON Recovery**: Optimized the fallback regex parser to prevent catastrophic backtracking (ReDoS freezes) when local models output massive thought logs, and added support for reversed key-value order in JSON.
- **JSON復元エンジン（セーフガード）の強化**: ローカルLLMの長文ゴミ出力時のフリーズ（ReDoS）を防止し、キーと値が逆順のJSONパースにも対応。

## [1.0.2] - 2026-07-04

### Fixed (バグ修正)
- **UI Language crash fix**: Resolved a critical TypeError crash that prevented importing XML files when the UI language was set to Russian, Chinese, Spanish, French, German, or Italian due to missing translation keys.
- **特定UI言語でのインポートクラッシュ修正**: ロシア語、中国語、スペイン語、フランス語、ドイツ語、イタリア語にUI言語を設定している際、一部の翻訳キーが不足していたためにXMLの読み込み（インポート）時に強制終了するバグを修正しました。

## [1.0.1] - 2026-07-03

### Improved (改善)
- **Enhanced name & proper noun translation**: Updated the default system prompt (Rule 7) to instruct AI models to translate short texts, single words, and NPC/location/item names properly instead of leaving them in English.
- **固有名詞・人名の翻訳精度向上**: デフォルトのシステムプロンプトに「Rule 7」を追加し、文脈のない短い人名、地名、アイテム名などが自動翻訳時に英語のまま残ってしまう問題を改善しました。

## [1.0.0] - 2026-07-02

### Added (新規追加)
- **Initial Release**: First stable release of Bethesda AI Translator.
- **Context-Aware Translation**: Support for TES, Fallout, and Starfield contexts.
- **NPC Dialogue Profiles**: Genders, pronouns, and tone style configuration.
- **Proper Noun Extractor**: Automatic scan and glossary builder.
- **Active Glossary System**: Injection of lore-specific terms.
- **Tauri Native App**: Portable Windows application wrapper.
- **Multi-XML Translation**: Support for loading and translating multiple SST XML files at once.
- **初回リリース**: Bethesda AI Translator の最初の安定版リリース。
- **世界観翻訳（コンテキスト）**: TES、Fallout、Starfield の世界観設定。
- **NPC口調設定**: 性別、人称、話し方のトーンの自動推定と個別設定。
- **固有名詞抽出**: 頻出語の一括AI翻訳と用語集追加。
- **用語集管理**: プロンプトへの対訳自動挿入。
- **Tauriによるデスクトップアプリ**: インストール不要のポータブル Windows アプリ。
- **複数XML同時翻訳**: 複数ファイルの同時読み込み・編集・個別保存機能。
