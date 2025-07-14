# ベースとなるイメージを指定
FROM postgres

# 環境変数を設定
ENV PGHOST=postgres \
    PGUSER=postgres \
    PGPASSWORD=password \
    PGDATABASE=postgres

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y gcc \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# initdbディレクトリをイメージ内の/docker-entrypoint-initdb.dにコピー
COPY ./initdb /docker-entrypoint-initdb.d

# csvディレクトリをイメージ内の/csvにコピー
COPY ./csv /csv