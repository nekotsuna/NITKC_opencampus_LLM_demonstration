# LLM体験会アプリ

## 環境

Python 3.10.12

## 使用技術

- FastAPI
- HTML / CSS / JavaScript
- Torch
- Transformers

## ディレクトリ

- `client/`: ブラウザ向けWebアプリケーション
- `server/`: 推論サーバ。現在はDummy Inference Serverを使用
- `docs/`: 仕様書

## セットアップ

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 起動方法

ターミナルを2つ開き、先にDummy Inference Serverを起動します。

```bash
uvicorn server.app:app --host 127.0.0.1 --port 8001
```

別のターミナルでWebアプリケーションを起動します。

```bash
uvicorn client.app:app --host 127.0.0.1 --port 8000
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:8000
```

## 推論サーバの切り替え

Webアプリケーションは `LLM_DEMO_INFERENCE_SERVER_URL` を参照して推論サーバに接続します。
Dummy ServerからReal Serverへ切り替える場合は、Webアプリ起動時にURLだけ変更します。

```bash
LLM_DEMO_INFERENCE_SERVER_URL=http://127.0.0.1:9000 uvicorn client.app:app --host 127.0.0.1 --port 8000
```

推論サーバ側は `.env` の `LLM_DEMO_SERVER_APP_ENV` で provider を自動選択します。

```bash
cp .env.example .env
```

テスト環境では `server/providers/dummy.py` を使います。

```env
LLM_DEMO_SERVER_APP_ENV=test
```

本番環境では `server/providers/llama.py` を使います。

```env
LLM_DEMO_SERVER_APP_ENV=production
LLM_DEMO_SERVER_LLAMA_MODEL_PATH=../kadaikenkyu/Meta-Llama-3.1-8B-Instruct
LLM_DEMO_SERVER_MAX_INPUT_TOKENS=1024
```

## API

推論サーバとWebアプリのプロキシAPIは同じリクエスト・レスポンス形式です。

```http
POST /generate
```

```json
{
  "text": "東京",
  "top_k": 10
}
```

```json
{
  "tokens": [
    {"token_id": 1, "token": "東"},
    {"token_id": 2, "token": "京"}
  ],
  "table": [
    {"token_id": 1000, "rank": 1, "token": "東京", "probability": 0.42}
  ]
}
```
