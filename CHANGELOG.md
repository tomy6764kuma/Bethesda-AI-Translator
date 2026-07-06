# Changelog

All notable changes to this project will be documented in this file.
このプロジェクトのすべての注目べき変更はこのファイルに記録されます。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠しています。

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
