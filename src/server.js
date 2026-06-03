import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import transcribeRouter from './routes/transcribe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error('[fatal] OPENAI_API_KEY ausente. Copie .env.example para .env e preencha.');
  process.exit(1);
}

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.resolve(__dirname, '..', 'public')));
app.use('/api', transcribeRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Erro interno.' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
