# 🎮 SQL学習ゲーム

[![Deploy to GitHub Pages](https://github.com/YOUR_USERNAME/sql-learning-game/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/sql-learning-game/actions/workflows/deploy.yml)

DuckDB WASMを使用したブラウザ完結型のSQL学習ゲームです。

## 🚀 デモ

**[🎮 今すぐプレイ！](https://YOUR_USERNAME.github.io/sql-learning-game/)**

## ✨ 特徴

- 🎮 **ゲーム形式でSQL学習** - 25個のチャレンジで段階的に学習
- 🚀 **ブラウザ内でSQL実行** - DuckDB WASMで完全にオフライン動作
- 💡 **SQLオートコンプリート機能** - 入力支援で学習をサポート
- 📊 **実践的なデータ** - 架空のネットショップデータで実用的な分析
- 🏆 **スコアシステム** - 実行回数・時間・ヒント使用回数で評価
- 📱 **レスポンシブデザイン** - PC・タブレット・スマホ対応
- 🎨 **美しいスライド表示** - Markdown対応のMarp風スライド

## 📚 学習内容

### 基礎レベル（難易度1-3）
- SELECT文の基本
- WHERE句による条件指定
- ORDER BY、LIMIT句

### 中級レベル（難易度4-6）
- 集約関数（COUNT、AVG、SUM）
- GROUP BY、HAVING句
- 基本的なJOIN

### 上級レベル（難易度7-10）
- 複数テーブルJOIN
- サブクエリ
- ウィンドウ関数
- 複雑なビジネス分析

## 🗂️ データベース構造

- **customers** - 顧客情報（10名の日本人顧客）
- **categories** - 商品カテゴリ（8カテゴリ）
- **products** - 商品情報（15商品、日本語商品名）
- **orders** - 注文情報（15件の注文）
- **order_details** - 注文詳細（24件の商品別詳細）

## 🛠️ 技術スタック

- **データベース**: [DuckDB WASM](https://duckdb.org/docs/api/wasm/overview.html)
- **フロントエンド**: Vanilla JavaScript (ES6+)
- **UI**: Pure CSS + Flexbox/Grid
- **データ**: CSV形式
- **ホスティング**: GitHub Pages

## 🏃‍♂️ ローカル実行

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/sql-learning-game.git
cd sql-learning-game

# HTTPサーバーで起動（必須 - CORS制限のため）
python -m http.server 8000
# または
npx serve .
# または
php -S localhost:8000
```

ブラウザで `http://localhost:8000` にアクセス

## 📁 ファイル構成

```
sql-learning-game/
├── index.html              # メインページ
├── css/
│   ├── main.css           # メインスタイル
│   └── editor.css         # エディタスタイル
├── js/
│   ├── main.js            # アプリ初期化
│   ├── duckdb-manager.js  # DB管理
│   ├── game-engine.js     # ゲームロジック
│   ├── ui-controller.js   # UI制御
│   └── sql-autocomplete.js # オートコンプリート
├── data/
│   ├── customers.csv      # 顧客データ
│   ├── categories.csv     # カテゴリデータ
│   ├── products.csv       # 商品データ
│   ├── orders.csv         # 注文データ
│   └── order_details.csv  # 注文詳細データ
├── slides/
│   └── challenges.json    # チャレンジ・スライドデータ
└── .github/
    └── workflows/
        └── deploy.yml     # GitHub Actions設定
```

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🙏 謝辞

- [DuckDB](https://duckdb.org/) - 高性能な分析データベース
- [GitHub Pages](https://pages.github.com/) - 無料ホスティングサービス

---

**[🎮 今すぐプレイして、SQLをマスターしよう！](https://YOUR_USERNAME.github.io/sql-learning-game/)**