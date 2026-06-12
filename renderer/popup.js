'use strict';

const SESSION_SIZE = 5;
let sessionIndex = 0;
let currentChar = null;
let isDrawing = false;
let lastX = 0, lastY = 0;
let closeTimer = null;

// ── Canvas setup ────────────────────────────────────────────────
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = rect.width;
  canvas.height = rect.height;
  applyStyle();
  ctx.putImageData(imageData, 0, 0);
}

function applyStyle() {
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function setCustomCursor() {
  const img = new Image();
  img.onload = () => {
    const tmp = document.createElement('canvas');
    tmp.width = 32;
    tmp.height = 32;
    tmp.getContext('2d').drawImage(img, 0, 0, 32, 32);
    // pencil tip is at lower-left of the image; hotspot at (4, 28) in 32×32
    canvas.style.cursor = `url("${tmp.toDataURL()}") 4 28, auto`;
  };
  img.src = '../src/pencil.png';
}

window.addEventListener('DOMContentLoaded', () => { resizeCanvas(); setCustomCursor(); });

// ── Drawing events ───────────────────────────────────────────────
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const { x, y } = getPos(e);
  lastX = x; lastY = y;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const { x, y } = getPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  lastX = x; lastY = y;
});

canvas.addEventListener('mouseup', () => { isDrawing = false; ctx.beginPath(); });
canvas.addEventListener('mouseleave', () => { isDrawing = false; ctx.beginPath(); });

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mouseup')); });

// ── Controls ─────────────────────────────────────────────────────
document.getElementById('clear-btn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('submit-btn').addEventListener('click', showResult);

function showResult() {
  document.getElementById('draw-screen').classList.add('hidden');
  const rs = document.getElementById('result-screen');
  rs.classList.remove('hidden');
  document.getElementById('romaji-result').textContent = currentChar.romaji.replace(/^kata_/, '');
  document.getElementById('hiragana-char').textContent = currentChar.character;
  // No countdown here — advanceSession starts it only after the 5th evaluation
}

// ── Evaluation ───────────────────────────────────────────────────
document.getElementById('gotit-btn').addEventListener('click', () => evaluate(true));
document.getElementById('missed-btn').addEventListener('click', () => evaluate(false));

async function evaluate(correct) {
  document.getElementById('gotit-btn').disabled = true;
  document.getElementById('missed-btn').disabled = true;
  await window.api.recordResult({ romaji: currentChar.romaji, correct });
  clearTimeout(closeTimer);
  await advanceSession();
}

document.getElementById('next-btn').addEventListener('click', async () => {
  document.getElementById('next-btn').disabled = true;
  clearTimeout(closeTimer);
  if (currentChar) await window.api.skipCharacter({ romaji: currentChar.romaji });
  await advanceSession();
});

// ── Session state machine ─────────────────────────────────────────
function updateProgress() {
  document.getElementById('session-progress').textContent =
    `${sessionIndex + 1} / ${SESSION_SIZE}`;
}

async function advanceSession() {
  if (sessionIndex < SESSION_SIZE - 1) {
    sessionIndex++;
    updateProgress();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentChar = await window.api.getCharacter();
    document.getElementById('romaji-prompt').textContent = currentChar.romaji.replace(/^kata_/, '');
    document.getElementById('script-label').textContent = currentChar.script;
    document.getElementById('draw-screen').classList.remove('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('gotit-btn').disabled = false;
    document.getElementById('missed-btn').disabled = false;
    document.getElementById('next-btn').disabled = false;
  } else {
    document.getElementById('gotit-btn').disabled = true;
    document.getElementById('missed-btn').disabled = true;
    document.getElementById('next-btn').disabled = true;
    startCountdown(6);
  }
}

// ── Countdown ────────────────────────────────────────────────────
function startCountdown(seconds) {
  const fill = document.getElementById('countdown-fill');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  void fill.offsetWidth;
  fill.style.transition = `width ${seconds}s linear`;
  fill.style.width = '0%';
  closeTimer = setTimeout(() => window.api.closePopup(), seconds * 1000);
}

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  sessionIndex = 0;
  updateProgress();
  currentChar = await window.api.getCharacter();
  document.getElementById('romaji-prompt').textContent = currentChar.romaji.replace(/^kata_/, '');
  document.getElementById('script-label').textContent = currentChar.script;
  requestAnimationFrame(() => resizeCanvas());
}

init();
