# SQL学習ゲーム

DuckDB WASMを使用したブラウザ完結型のSQL学習ゲームです。
実際にSQLを書いて実行しながら、段階的にSQLを学べます。

**GitHub Pages**: https://tcf775.github.io/sql-study/

## 概要

架空のネットショップのデータを使って、SELECT文の基本からウィンドウ関数まで段階的に学習できるゲーム形式のSQL学習ツールです。

- ブラウザ内でSQLを実行（DuckDB WASM）— インストール不要、完全オフライン動作
- コース制の段階的学習（基礎〜上級）
- SQLオートコンプリート機能で入力をサポート
- スコアシステム（実行回数・時間・ヒント使用回数で評価）
- 適応的学習機能（理解度に応じて難易度調整）

## システム概要

```
ブラウザ
├── index.html                  # エントリーポイント
│
├── DuckDB WASM                 # ブラウザ内SQLエンジン
│   ├── duckdb-manager.js       #   DB初期化・CSVからテーブル作成・クエリ実行
│   └── data/*.csv              #   顧客・商品・注文などのサンプルデータ
│
├── ゲームエンジン
│   ├── game-engine.js          #   チャレンジ管理・正誤判定・スコア計算
│   ├── course-manager.js       #   コース選択・進行管理
│   ├── adaptive-learning.js    #   適応的学習（理解度追跡・難易度調整）
│   └── progress-manager.js     #   学習進捗の保存・復元（localStorage）
│
├── UI
│   ├── ui-controller.js        #   メイン画面制御
│   ├── sql-autocomplete.js     #   SQLオートコンプリート
│   ├── slide-manager.js        #   スライド表示（チャレンジ説明）
│   └── course-ui.js            #   コース選択画面
│
└── slides/*.json               # チャレンジ・スライド定義データ
```

### データベース構造

| テーブル | 内容 |
|---|---|
| customers | 顧客情報（10名） |
| categories | 商品カテゴリ（8カテゴリ） |
| products | 商品情報（15商品） |
| orders | 注文情報（15件） |
| order_details | 注文詳細（24件） |

### 学習コース

| レベル | 内容 |
|---|---|
| 基礎（難易度1-3） | SELECT, WHERE, ORDER BY, LIMIT |
| 中級（難易度4-6） | COUNT, AVG, SUM, GROUP BY, HAVING, JOIN |
| 上級（難易度7-10） | 複数テーブルJOIN, サブクエリ, ウィンドウ関数 |

## ファイル構成

```
sql-study/
├── index.html                     # メインページ
├── css/
│   ├── main.css                   # メインスタイル
│   ├── editor.css                 # SQLエディタスタイル
│   ├── course-system.css          # コース選択画面
│   ├── course-completion.css      # コース完了画面
│   └── word-reorder.css           # 語句並べ替え問題
├── js/
│   ├── main.js                    # アプリ初期化
│   ├── duckdb-manager.js          # DuckDB WASM管理
│   ├── game-engine.js             # ゲームロジック
│   ├── course-manager.js          # コース管理
│   ├── adaptive-learning.js       # 適応的学習エンジン
│   ├── adaptive-learning-ui.js    # 適応的学習UI
│   ├── progress-manager.js        # 進捗管理
│   ├── progress-ui.js             # 進捗表示UI
│   ├── ui-controller.js           # メインUI制御
│   ├── sql-autocomplete.js        # SQLオートコンプリート
│   ├── sql-tokenizer.js           # SQLトークナイザー
│   ├── slide-manager.js           # スライド表示
│   ├── word-reorder-ui.js         # 語句並べ替えUI
│   ├── notification-system.js     # 通知システム
│   ├── error-handler.js           # エラーハンドリング
│   ├── performance-monitor.js     # パフォーマンス監視
│   └── ui-optimizer.js            # UI最適化
├── data/
│   ├── customers.csv              # 顧客データ
│   ├── categories.csv             # カテゴリデータ
│   ├── products.csv               # 商品データ
│   ├── orders.csv                 # 注文データ
│   └── order_details.csv          # 注文詳細データ
├── slides/
│   ├── challenges.json            # 基本チャレンジ定義
│   ├── db-fundamentals-challenges.json  # DB基礎コース
│   └── big-data-basics-challenges.json  # ビッグデータ基礎コース
├── .github/workflows/deploy.yml   # GitHub Pages自動デプロイ
├── deploy.sh                      # 手動デプロイスクリプト
├── start.sh                       # ローカル起動スクリプト
└── README.md
```

## 開発者ガイド

### ローカルで動かす

```bash
git clone https://github.com/tcf775/sql-study.git
cd sql-study

# 起動スクリプトを使う場合
./start.sh

# または手動でHTTPサーバーを起動（CORS制限のため必須）
python -m http.server 8000
# http://localhost:8000 にアクセス
```

### チャレンジの追加方法

`slides/` ディレクトリのJSONファイルにチャレンジを追加します。

### デプロイ

`main` ブランチにpushすると、GitHub Actionsで自動的にGitHub Pagesにデプロイされます。

### 技術スタック

| 技術 | 用途 |
|---|---|
| DuckDB WASM | ブラウザ内SQLエンジン |
| Vanilla JavaScript (ES6+) | フロントエンド |
| CSS (Flexbox/Grid) | レイアウト |
| GitHub Pages | ホスティング |

## ライセンス

MIT License
