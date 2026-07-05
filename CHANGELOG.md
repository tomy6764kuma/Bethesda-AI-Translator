# Changelog

All notable changes to this project will be documented in this file.
このプロジェクトのすべての注目べき変更はこのファイルに記録されます。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠しています。

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
