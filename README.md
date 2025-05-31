# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

# Sketch to UI

手書きのUIスケッチから実際のHTML/CSS/JavaScriptを自動生成するウェブアプリケーション。

## 概要

Sketch to UIは、手書きのアプリケーション画面のラフスケッチを実際に動作するUIコードに変換するウェブサービスです。AI技術を活用して、デザイナーやプロダクトマネージャーのアイデアを素早くプロトタイプに変換することができます。

## 主な機能

- 手書きスケッチのアップロード
- AIによるUIコンポーネント検出
- HTML/CSS/JavaScriptコードの自動生成
- リアルタイムプレビュー
- 生成されたコードのエクスポート

## 技術スタック

- フロントエンド: Astro.js、React
- 画像認識: OpenAI GPT-4 Vision API
- デプロイ: Node.js

## セットアップ方法

### 前提条件

- Node.js 18以上
- OpenAI APIキー

### インストール

1. リポジトリをクローン
```bash
git clone https://github.com/yourusername/sketch-to-ui.git
cd sketch-to-ui
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数の設定
```bash
# .envファイルを作成
cp .env.example .env
# OpenAI APIキーを設定
# .envファイルを編集してOPENAI_API_KEYを設定
```

4. 開発サーバーの起動
```bash
npm run dev
```

5. ブラウザで http://localhost:4321 にアクセス

## 使い方

1. ホームページで「スケッチを選択」ボタンをクリックして手書きのUIスケッチをアップロード
2. 「UIを生成」ボタンをクリックして処理を開始
3. 生成されたUIのプレビューとコードが表示される
4. 必要に応じて「HTMLをダウンロード」ボタンでコードをエクスポート

## ライセンス

MIT

## 開発者

あなたの名前
