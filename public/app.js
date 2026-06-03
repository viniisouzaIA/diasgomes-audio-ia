const VALID_EXTENSIONS = ['.mp3', '.wav', '.m4a'];

const appContainer = document.getElementById('app-container');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

const previewFileName = document.getElementById('preview-file-name');
const previewFileSize = document.getElementById('preview-file-size');
const previewFileBadge = document.getElementById('preview-file-badge');

const btnProcess = document.getElementById('btn-process');
const btnText = document.getElementById('btn-text');
const btnRemoveFile = document.getElementById('btn-remove-file');

const transcriptionBox = document.getElementById('transcription-content');
const summaryBox = document.getElementById('summary-content');

const errorMessageText = document.getElementById('error-message-text');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toast-text');

let selectedFile = null;

/* ------------------------------------------------------------------
   STATE
   ------------------------------------------------------------------ */
function setAppState(stateClass) {
  appContainer.className = `app-container ${stateClass}`;
}

/* ------------------------------------------------------------------
   FILE HANDLING
   ------------------------------------------------------------------ */
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function isValidAudio(file) {
  const name = file.name.toLowerCase();
  return VALID_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function setBadge(text, variant) {
  previewFileBadge.textContent = text;
  previewFileBadge.className = `file-status-badge ${variant}`;
}

function selectFile(file) {
  if (!isValidAudio(file)) {
    showError('Formato não suportado. Envie um arquivo MP3, WAV ou M4A.');
    return;
  }
  selectedFile = file;
  previewFileName.textContent = file.name;
  previewFileSize.textContent = formatBytes(file.size);
  setBadge('Pronto para processamento', 'badge-ready');

  btnProcess.disabled = false;
  btnProcess.classList.remove('is-loading');
  btnText.textContent = 'Transcrever e Resumir';

  setAppState('state-selected');
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  btnProcess.disabled = true;
  btnProcess.classList.remove('is-loading');
  btnText.textContent = 'Transcrever e Resumir';
  setAppState('state-empty');
}

/* ------------------------------------------------------------------
   ERROR
   ------------------------------------------------------------------ */
function showError(message) {
  errorMessageText.textContent = message;
  setBadge('Falha', 'badge-error');
  btnProcess.classList.remove('is-loading');
  btnProcess.disabled = !selectedFile;
  btnText.textContent = selectedFile ? 'Tentar Novamente' : 'Transcrever e Resumir';
  setAppState(selectedFile ? 'state-error' : 'state-empty');
}

/* ------------------------------------------------------------------
   API CALL
   ------------------------------------------------------------------ */
async function processAudio() {
  if (!selectedFile) return;

  setAppState('state-loading');
  btnProcess.classList.add('is-loading');
  btnProcess.disabled = true;
  btnText.textContent = 'Processando áudio...';

  const formData = new FormData();
  formData.append('audio', selectedFile);

  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Falha no processamento do áudio.');
    }

    transcriptionBox.textContent = data.transcription || '';
    summaryBox.textContent = data.summary || '';

    setBadge('Áudio transcrito', 'badge-success');
    btnProcess.classList.remove('is-loading');
    btnProcess.disabled = true;
    btnText.textContent = 'Processamento Concluído';

    setAppState('state-success');
  } catch (err) {
    showError(err.message || 'Erro inesperado.');
  }
}

/* ------------------------------------------------------------------
   COPY + TOAST
   ------------------------------------------------------------------ */
async function copyText(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const text = el.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Texto copiado com sucesso.');
  } catch {
    showToast('Não foi possível copiar.');
  }
}

let toastTimer = null;
function showToast(message) {
  toastText.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ------------------------------------------------------------------
   EVENT BINDINGS
   ------------------------------------------------------------------ */
dropZone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });
});

['dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) selectFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  if (files && files.length > 0) selectFile(files[0]);
});

btnProcess.addEventListener('click', processAudio);
btnRemoveFile.addEventListener('click', clearFile);

document.querySelectorAll('.btn-copy').forEach((btn) => {
  btn.addEventListener('click', () => copyText(btn.dataset.copyTarget));
});
