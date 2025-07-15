#!/bin/bash

# SQL学習ゲームをS3にデプロイするスクリプト

BUCKET_NAME="your-sql-game-bucket-name"
REGION="ap-northeast-1"

echo "🚀 SQL学習ゲームをS3にデプロイ中..."

# バケットの存在確認
if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "✅ バケット $BUCKET_NAME が存在します"
else
    echo "❌ バケット $BUCKET_NAME が存在しません。先にバケットを作成してください。"
    exit 1
fi

# ファイルをアップロード
echo "📁 ファイルをアップロード中..."

# HTMLファイル
aws s3 cp index.html s3://$BUCKET_NAME/ --content-type "text/html"

# CSSファイル
aws s3 cp css/ s3://$BUCKET_NAME/css/ --recursive --content-type "text/css" --cache-control "max-age=86400"

# JavaScriptファイル
aws s3 cp js/ s3://$BUCKET_NAME/js/ --recursive --content-type "application/javascript" --cache-control "max-age=86400"

# CSVデータファイル
aws s3 cp data/ s3://$BUCKET_NAME/data/ --recursive --content-type "text/csv"

# JSONファイル
aws s3 cp slides/challenges.json s3://$BUCKET_NAME/slides/challenges.json --content-type "application/json"

echo "✅ デプロイ完了！"
echo "🌐 ウェブサイトURL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo "📊 S3コンソール: https://console.aws.amazon.com/s3/buckets/$BUCKET_NAME"