# SQL学習ゲーム

DuckDB WASMを使用したブラウザ完結型のSQL学習ゲームです。

## 特徴

- 🎮 ゲーム形式でSQL学習
- 🚀 ブラウザ内でSQL実行（DuckDB WASM）
- 💡 SQLオートコンプリート機能
- 📊 実データを使用した練習問題
- 🏆 スコアシステム

## デモ

[GitHub Pages でプレイ](https://your-username.github.io/sql-study/sql-game/)

## ローカル実行

```bash
# HTTPサーバーで起動（必須）
cd sql-game
python -m http.server 8000
# または
npx serve .
```

ブラウザで `http://localhost:8000` にアクセス

## 技術スタック

- **データベース**: DuckDB WASM
- **フロントエンド**: Vanilla JavaScript
- **UI**: Pure CSS
- **データ**: CSV（employees, departments, products等）

## ファイル構成

```
sql-game/
├── index.html          # メインページ
├── css/
│   ├── main.css       # メインスタイル
│   └── editor.css     # エディタスタイル
├── js/
│   ├── main.js        # アプリ初期化
│   ├── duckdb-manager.js    # DB管理
│   ├── game-engine.js       # ゲームロジック
│   ├── ui-controller.js     # UI制御
│   └── sql-autocomplete.js  # オートコンプリート
└── README.md
```

## ライセンス

MIT License