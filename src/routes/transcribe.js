import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { transcribeAudio, summarizeTranscript } from '../services/openai.js';

const router = Router();

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 25;
const ALLOWED_EXT = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.oga', '.webm', '.mp4', '.mpga', '.flac']);

const upload = multer({
  dest: path.join(os.tmpdir(), 'diasgomes-uploads'),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Formato não suportado. Use MP3, WAV, M4A, OGG, WEBM, MP4 ou FLAC.'));
    }
    cb(null, true);
  },
});

router.post('/transcribe', (req, res, next) => {
  upload.single('audio')(req, res, async (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const filePath = req.file.path;
    try {
      const transcription = await transcribeAudio(filePath, req.file.originalname);
      if (!transcription) {
        return res.status(422).json({ error: 'Transcrição vazia. Verifique se o áudio contém fala.' });
      }
      const summary = await summarizeTranscript(transcription);
      res.json({ transcription, summary });
    } catch (e) {
      next(e);
    } finally {
      fs.unlink(filePath).catch(() => {});
    }
  });
});

export default router;
