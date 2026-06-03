import { spawn } from 'node:child_process';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import OpenAI, { toFile } from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUMMARY_SYSTEM_PROMPT = `Você é um assistente que resume transcrições de áudio em português.

Regras estritas, sem exceções:
- Resuma APENAS o que está literalmente no texto transcrito.
- NÃO adicione informações, contexto, interpretações ou inferências.
- NÃO invente nomes, datas, valores, fatos ou conclusões que não apareçam no texto.
- NÃO complete lacunas com suposições. Se algo não foi dito, simplesmente não inclua.
- Mantenha o tom neutro e factual. Use frases curtas e diretas.
- Preserve termos técnicos e jurídicos exatamente como aparecem na transcrição.
- Estruture o resumo em tópicos quando houver múltiplos assuntos; caso contrário, em um parágrafo conciso.

Saída: apenas o resumo. Sem cabeçalhos extras, sem meta-comentários, sem disclaimers.`;

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg falhou (code ${code}): ${stderr.slice(-500)}`));
    });
  });
}

async function transcodeToMp3(buffer) {
  const id = randomBytes(8).toString('hex');
  const inputPath = path.join(os.tmpdir(), `${id}-in`);
  const outputPath = path.join(os.tmpdir(), `${id}-out.mp3`);

  await writeFile(inputPath, buffer);
  try {
    await runFfmpeg([
      '-y',
      '-i', inputPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ar', '16000',
      '-ac', '1',
      '-b:a', '64k',
      outputPath,
    ]);
    return await readFile(outputPath);
  } finally {
    unlink(inputPath).catch(() => {});
    unlink(outputPath).catch(() => {});
  }
}

export async function transcribeAudio(buffer, _originalName) {
  const mp3Buffer = await transcodeToMp3(buffer);
  const file = await toFile(mp3Buffer, 'audio.mp3');
  const response = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'pt',
    response_format: 'text',
  });
  return typeof response === 'string' ? response.trim() : String(response).trim();
}

export async function summarizeTranscript(transcript) {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: `Transcrição:\n\n${transcript}` },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? '';
}
