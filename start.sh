#!/bin/bash

# SQL学習ゲーム起動スクリプト

echo "🚀 SQL学習ゲームを起動しています..."

# 起動方法を選択
echo "起動方法を選択してください:"
echo "1) ローカルファイル（CORS無効化ブラウザ）"
echo "2) ローカルサーバー"
read -p "選択 (1 or 2): " choice

case $choice in
    1)
        echo "📁 ローカルファイルとして起動します"
        
        # 現在のディレクトリのindex.htmlのフルパスを取得
        CURRENT_DIR=$(pwd)
        HTML_FILE="file://$CURRENT_DIR/index.html"
        
        # Chromeを探す
        if [[ -d "/Applications/Google Chrome.app" ]]; then
            CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        elif [[ -d "/Applications/Chromium.app" ]]; then
            CHROME_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium"
        elif command -v google-chrome &> /dev/null; then
            CHROME_PATH="google-chrome"
        elif command -v chromium &> /dev/null; then
            CHROME_PATH="chromium"
        else
            echo "❌ Chrome/Chromiumが見つかりません。"
            echo "手動でブラウザを起動してください:"
            echo "Chrome/Chromiumを以下のオプションで起動:"
            echo "--disable-web-security --disable-features=VizDisplayCompositor --user-data-dir=/tmp/chrome-dev"
            echo "そして以下のURLを開いてください:"
            echo "$HTML_FILE"
            exit 1
        fi
        
        echo "🌐 CORS無効化でChromeを起動します"
        echo "📄 ファイル: $HTML_FILE"
        echo "⚠️  開発用設定のため、通常のブラウジングには使用しないでください"
        
        # CORS無効化でChromeを起動
        "$CHROME_PATH" \
            --disable-web-security \
            --disable-features=VizDisplayCompositor \
            --user-data-dir=/tmp/chrome-dev-sql-game \
            "$HTML_FILE" &
        
        echo "✅ ブラウザが起動しました"
        ;;
    2)
        # ポート番号を設定（デフォルト: 8080）
        PORT=${2:-8080}
        
        # Pythonが利用可能かチェック
        if command -v python3 &> /dev/null; then
            echo "📡 Python3でローカルサーバーを起動します (ポート: $PORT)"
            echo "🌐 ブラウザで http://localhost:$PORT を開いてください"
            echo "⏹️  停止するには Ctrl+C を押してください"
            echo ""
            python3 -m http.server $PORT
        elif command -v python &> /dev/null; then
            echo "📡 Python2でローカルサーバーを起動します (ポート: $PORT)"
            echo "🌐 ブラウザで http://localhost:$PORT を開いてください"
            echo "⏹️  停止するには Ctrl+C を押してください"
            echo ""
            python -m SimpleHTTPServer $PORT
        elif command -v node &> /dev/null; then
            if command -v npx &> /dev/null; then
                echo "📡 Node.js (npx serve) でローカルサーバーを起動します (ポート: $PORT)"
                echo "🌐 ブラウザで http://localhost:$PORT を開いてください"
                echo "⏹️  停止するには Ctrl+C を押してください"
                echo ""
                npx serve -p $PORT
            else
                echo "❌ npxが見つかりません。"
                exit 1
            fi
        elif command -v php &> /dev/null; then
            echo "📡 PHPでローカルサーバーを起動します (ポート: $PORT)"
            echo "🌐 ブラウザで http://localhost:$PORT を開いてください"
            echo "⏹️  停止するには Ctrl+C を押してください"
            echo ""
            php -S localhost:$PORT
        else
            echo "❌ ローカルサーバーを起動するためのツールが見つかりません。"
            echo "以下のいずれかをインストールしてください:"
            echo "  - Python3: brew install python3"
            echo "  - Node.js: brew install node"
            echo "  - PHP: brew install php"
            exit 1
        fi
        ;;
    *)
        echo "❌ 無効な選択です。1 または 2 を選択してください。"
        exit 1
        ;;
esac