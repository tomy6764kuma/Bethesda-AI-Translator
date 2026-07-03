# Bethesda AI Translator

An advanced, AI-powered localization tool for Bethesda RPGs (Skyrim, Fallout, Starfield) built with Tauri, React, and TypeScript. Translate SST XML files exported from xTranslator using Gemini, OpenAI, or local LLMs (Ollama / LM Studio) while maintaining context, glossaries, and consistent NPC dialogue styles.

[日本語版の説明は下にあります / Japanese version is below](#日本語)

---

## Features

- **Context-Aware Translation**: Choose a game world setting (TES, Fallout, Starfield, or Default) to let the AI model understand the context and utilize appropriate vocabulary and naming conventions.
- **NPC Dialogue Profiles**: Automatic speaker profile builder. Set genders, pronouns, tone styles, and first/second-person addresses (e.g., "I", "You", "お前", "私"). The AI respects these settings for each NPC during translation.
- **Proper Noun Extractor**: Dynamically scans text for proper nouns or recurring phrases (appearing 3+ times), displaying their context sentences. You can ignore them, translate them with AI, or save them directly to your glossary.
- **Active Glossary System**: Protect lore terms and specific translation mappings. Automatically injected into the prompt. Supports quick bulk actions.
- **API Throttling & Auto-Recovery**: Limits requests per minute (RPM) and tokens per minute (TPM). Automatically retries up to 3 times with dynamic delay intervals when encountering temporary service failures (e.g., 503 Service Unavailable).
- **Voice acting direction protection**: Keeps everything inside curly braces (e.g., `{sigh}`, `{angry}`) in English to prevent breaking voice coordination.
- **9-Language Global UI & Target Translation**: Fully localized UI supporting English, Japanese, Korean, Chinese, Spanish, French, German, Russian, and Italian.
- **Local Persistence & JSON Portability**: Configurations, glossaries, and NPC profiles are auto-saved to localStorage (retains settings between sessions) and can be exported/imported as JSON files.

---

## Getting Started

### Prerequisites

- You need an API Key for either **Gemini API** or **OpenAI API**, or a running instance of a local LLM (**Ollama** / **LM Studio**).
- Export your translation database as an **SST XML** file from xTranslator.
  - *Note:* If you want to use the **NPC Dialogue Profiles (tone styles/genders)** feature, you must use our custom-built xTranslator which exports NPC details to the XML. Download it from the [Custom xTranslator Releases](https://github.com/tomy6764kuma/xTranslator/releases) page.

### Installation

1. Download the latest portable `.zip` release from the [Releases](https://github.com/tomy6764kuma/Bethesda-AI-Translator/releases) page.
2. Extract the archive.
3. Launch `Bethesda AI Translator.exe` (no installation required).

### Basic Workflow

1. Click **Open XML** and select your SST XML file.
2. The tool will automatically parse the file and scan for speaker NPCs.
3. Open **Settings** (gear icon) and configure your API Key and parameters (RPM, Target Language, and Custom System Prompt if desired).
4. Run **Auto Translate** (or translate individual rows in the table).
5. Once completed, click **Save XML** to download the translated file.
6. Import the output XML back into xTranslator to apply your translations.

---

## For Developers

To build or run the project locally, you will need Node.js and Rust installed on your machine.

### Development Mode

```bash
# Clone the repository
git clone https://github.com/tomy6764kuma/Bethesda-AI-Translator.git
cd Bethesda-AI-Translator

# Install dependencies
npm install

# Start Tauri development environment
npx tauri dev
```

### Build Portable Binary

To create a single, portable executable `.exe` file without installers:

```bash
npx tauri build --no-bundle
```
The output executable will be generated at `src-tauri/target/release/Bethesda AI Translator.exe`.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div id="日本語"></div>

# Bethesda AI Translator - 日本語

Tauri, React, TypeScript で構築された、Bethesda社製 RPG (Skyrim, Fallout, Starfield) 専用の次世代 AI 翻訳支援ツールです。xTranslator から書き出した SST XML ファイルを読み込み、Gemini、OpenAI、またはローカル LLM (Ollama / LM Studio) を活用して、キャラクターの口調やゲームの世界観、用語集を維持した高品質な自動翻訳を実現します。

---

## 主な機能

- **世界観（コンテキスト）の選択**: ゲームタイプ (TES, Fallout, Starfield, 標準) を選択すると、AIモデルが世界観を理解し、その世界観にふさわしい単語や言い回し、人称を選択します。
- **NPC口調設定 (NPC Profiles)**: キャラクターの性別、一人称、二人称、トーンスタイルを設定・AI自動推定できます。AI は翻訳時に各 NPC のキャラクター性を完全に考慮します。
- **固有名詞抽出機能 (Proper Noun Extractor)**: XML内のテキストから高頻度（3回以上出現）で登場する固有名詞やフレーズを自動検出します。その場で除外、AIによる事前翻訳、または用語集への登録が行えます。
- **用語集管理システム (Glossary)**: 専門用語や公式の対訳を保護します。自動翻訳時にプロンプトへ注入されます。
- **API流量制御 & 自動リトライ機能**: RPM（毎分リクエスト）と TPM（毎分トークン）を制限しつつ、一時的なエラー（503や429など）発生時には、安全なリクエスト間隔を自動計算して最大3回まで自動リトライします。
- **演技指導の保護**: 台詞に含まれる `{sigh}`（ため息）や `{angry}` などの波括弧内の記述を翻訳せずそのまま英語で保護し、ボイス連動エラーを防ぎます。
- **9言語グローバル対応**: UIおよび翻訳先言語として、日本語、英語、韓国語、中国語、スペイン語、フランス語、ドイツ語、ロシア語、イタリア語を完全サポート。
- **自動保存 & JSON入出力**: 用語集やNPC口調設定、アプリ設定は localStorage に自動で永続化されるほか、JSON 形式でバックアップ・復元が可能です。

---

## 使い方

### 事前準備

- **Gemini API** または **OpenAI API** の APIキー、あるいはローカル LLM（**Ollama** / **LM Studio**）が必要です。
- xTranslator から 翻訳用の **SST XML** ファイルを書き出しておきます。
  - *注意:* **NPC口調設定機能（話し方や性別の反映）**を使用する場合は、SST XML に NPC 情報を出力できるカスタム版の xTranslator が必要です。こちらの [カスタム版 xTranslator リリースページ](https://github.com/tomy6764kuma/xTranslator/releases) からダウンロードしてご使用ください。（※通常のXMLでもNPC機能以外は問題なく動作します）

### インストール

1. [Releases](https://github.com/tomy6764kuma/Bethesda-AI-Translator/releases) ページから最新のポータブル版 `.zip` をダウンロードします。
2. ダウンロードしたアーカイブを展開します。
3. `Bethesda AI Translator.exe` を実行します（インストール不要）。

### 基本手順

1. **XMLを開く** から、xTranslator で書き出した SST XML を選択します。
2. 設定（歯車アイコン）を開き、APIキー、翻訳先言語（Target Language）、各種パラメータを設定します。
3. **一括自動翻訳** をクリックします（テーブル内の個別行を個々に翻訳することも可能です）。
4. 翻訳が完了したら **XMLを保存** をクリックしてファイルをダウンロードします。
5. 出力された XML ファイルを xTranslator にインポートして翻訳を適用します。

---

## 開発者向け

ローカル環境でのビルドや開発には、Node.js と Rust（Cargo）が必要です。

### 開発用起動

```bash
git clone https://github.com/tomy6764kuma/Bethesda-AI-Translator.git
cd Bethesda-AI-Translator
npm install
npx tauri dev
```

### ポータブル版のビルド

インストーラーを作成せず、単一のポータブル実行ファイル（`.exe`）を直接ビルドする場合：

```bash
npx tauri build --no-bundle
```
生成された実行ファイルは `src-tauri/target/release/Bethesda AI Translator.exe` に出力されます。