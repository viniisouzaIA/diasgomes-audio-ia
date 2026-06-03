# Dias Gomes Advocacia — Transcritor de Áudios

Aplicação web para transcrição e resumo fiel de áudios jurídicos.
Frontend estático servido por um backend Node.js/Express que consome a API da OpenAI (Whisper para transcrição, GPT‑4o para resumo).

---

## Stack

- **Node.js 20+ / Express** — servidor HTTP, upload (multer) e proxy para a OpenAI.
- **HTML + CSS + JS vanilla** servido como estático em `public/`.
- **OpenAI SDK** (`whisper-1` + `gpt-4o`).

Sem build step no frontend. Um único processo, uma única porta.

---

## Estrutura

```
.
├── public/                 # Frontend estático
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── logo.png
├── src/                    # Backend
│   ├── server.js
│   ├── routes/transcribe.js
│   └── services/openai.js
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Pré‑requisitos

- Node.js **20+** (ou Docker)
- Uma chave da API OpenAI: `https://platform.openai.com/api-keys`

---

## Configuração

1. Copie o arquivo de exemplo e preencha a chave:

```bash
cp .env.example .env
```

2. Edite `.env`:

```env
OPENAI_API_KEY=sk-...
PORT=3000
MAX_UPLOAD_MB=25
```

> O Whisper aceita até **25 MB por requisição**. Não aumente esse limite sem implementar particionamento do áudio.

---

## Rodando localmente

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

Para desenvolvimento com reload automático:

```bash
npm run dev
```

---

## Rodando com Docker (recomendado para a VPS)

Com o `.env` preenchido na raiz:

```bash
docker compose up -d --build
```

A aplicação ficará disponível em `http://<ip-da-vps>:3000`.

Para acompanhar logs:

```bash
docker compose logs -f
```

Para atualizar após mudanças:

```bash
docker compose up -d --build
```

Para parar:

```bash
docker compose down
```

---

## Deploy em VPS (passo a passo)

1. **Instale Docker + Docker Compose** na VPS (Ubuntu/Debian):

```bash
curl -fsSL https://get.docker.com | sh
```

2. **Clone o repositório** (ou envie os arquivos via `scp`/`rsync`):

```bash
git clone <url-do-repo> diasgomes-audio-ia
cd diasgomes-audio-ia
```

3. **Configure o `.env`** com sua `OPENAI_API_KEY`.

4. **Suba o container**:

```bash
docker compose up -d --build
```

5. **(Opcional) Coloque atrás de um reverse proxy** (Nginx/Caddy) com HTTPS apontando para `localhost:3000`.

Exemplo mínimo de bloco Nginx:

```nginx
server {
    listen 80;
    server_name transcritor.seu-dominio.com;

    client_max_body_size 30M;   # acima do MAX_UPLOAD_MB

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

---

## Alternativa: deploy com PM2 (sem Docker)

```bash
npm install --omit=dev
npm install -g pm2
pm2 start src/server.js --name diasgomes-audio-ia
pm2 save
pm2 startup
```

Atualizações:

```bash
git pull
npm install --omit=dev
pm2 restart diasgomes-audio-ia
```

---

## API

### `POST /api/transcribe`

Recebe um áudio (`multipart/form-data`, campo `audio`) e devolve transcrição + resumo.

**Request**

```
POST /api/transcribe
Content-Type: multipart/form-data

audio: <arquivo .mp3 | .wav | .m4a, até 25 MB>
```

**Response 200**

```json
{
  "transcription": "Texto completo transcrito pelo Whisper...",
  "summary": "Resumo fiel gerado pelo GPT-4o..."
}
```

**Erros**

- `400` — formato inválido ou nenhum arquivo enviado.
- `413` — arquivo acima do limite.
- `422` — transcrição vazia (provavelmente áudio sem fala).
- `500` — erro na API da OpenAI.

### `GET /health`

Healthcheck simples (`{ "ok": true }`), útil para monitoramento da VPS.

---

## Comportamento do resumo

O `system prompt` força o GPT‑4o a:

- Resumir **apenas o que está literalmente no texto transcrito**.
- **Não** adicionar contexto, interpretações ou inferências.
- **Não** inventar nomes, datas, valores ou conclusões.
- **Não** completar lacunas com suposições.

`temperature: 0` para resposta determinística.

A instrução está em [src/services/openai.js](src/services/openai.js#L6).

---

## Notas

- O Whisper retorna o texto corrido sem separação por falantes (diarização). Para depoimentos com múltiplos participantes, a transcrição virá como um único bloco contínuo.
- O design é o fornecido pelo Gemini (paleta `#FAF9F6` / `#111111` / `#C9A96E` / `#2C2621`, tipografia Playfair Display + Inter). Toda a parte visual está concentrada em [public/styles.css](public/styles.css) e a estrutura em [public/index.html](public/index.html).
