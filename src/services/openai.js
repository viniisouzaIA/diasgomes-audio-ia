import fs from 'node:fs';
import path from 'node:path';
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

export async function transcribeAudio(filePath, originalName) {
  const ext = path.extname(originalName).slice(1).toLowerCase() || 'mp3';
  const cleanName = `audio.${ext}`;
  const file = await toFile(fs.createReadStream(filePath), cleanName);
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
