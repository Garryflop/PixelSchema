// PixelBattle Stencil - content script
// Works on https://pixelbattle.eventvoid.dev/play

const STORAGE_KEY_URL = 'stencil_image_url';
const STORAGE_KEY_OPACITY = 'stencil_opacity';
const STORAGE_KEY_VISIBLE = 'stencil_visible';
const STORAGE_KEY_OFFSET_X = 'stencil_offset_x';
const STORAGE_KEY_OFFSET_Y = 'stencil_offset_y';
const STORAGE_KEY_SCALE = 'stencil_scale';

const REFRESH_INTERVAL = 30000; // refresh stencil every 30 sec

let overlayImg = null;
let overlayWrapper = null;
let isVisible = true;
let currentOpacity = 0.5;
let currentScale = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragStartOffsetX = 0, dragStartOffsetY = 0;

function findCanvas() {
  // Find the canvas on the page
  const canvases = document.querySelectorAll('canvas');
  if (canvases.length > 0) return canvases[0];
  return null;
}

function createOverlay() {
  if (overlayWrapper) return;

  overlayWrapper = document.createElement('div');
  overlayWrapper.id = 'pb-stencil-wrapper';
  overlayWrapper.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 999999;
    pointer-events: none;
    overflow: visible;
  `;

  overlayImg = document.createElement('img');
  overlayImg.id = 'pb-stencil-img';
  overlayImg.style.cssText = `
    position: absolute;
    pointer-events: auto;
    cursor: move;
    user-select: none;
    image-rendering: pixelated;
    transform-origin: top left;
  `;

  overlayImg.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);

  overlayWrapper.appendChild(overlayImg);
  document.body.appendChild(overlayWrapper);
}

function startDrag(e) {
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragStartOffsetX = offsetX;
  dragStartOffsetY = offsetY;
  e.preventDefault();
}

function onDrag(e) {
  if (!isDragging) return;
  offsetX = dragStartOffsetX + (e.clientX - dragStartX);
  offsetY = dragStartOffsetY + (e.clientY - dragStartY);
  applyTransform();
  saveSettings();
}

function stopDrag() {
  isDragging = false;
}

function applyTransform() {
  if (!overlayImg) return;
  overlayImg.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
}

function updateOverlay(url, opacity, visible, scale, ox, oy) {
  if (!overlayImg) createOverlay();

  currentOpacity = opacity !== undefined ? opacity : currentOpacity;
  isVisible = visible !== undefined ? visible : isVisible;
  currentScale = scale !== undefined ? scale : currentScale;
  offsetX = ox !== undefined ? ox : offsetX;
  offsetY = oy !== undefined ? oy : offsetY;

  if (url && overlayImg.dataset.src !== url) {
    // Add timestamp to force reload from GitHub
    const cacheBust = `?t=${Math.floor(Date.now() / REFRESH_INTERVAL)}`;
    overlayImg.src = url + cacheBust;
    overlayImg.dataset.src = url;
  }

  overlayImg.style.opacity = currentOpacity;
  overlayWrapper.style.display = isVisible ? 'block' : 'none';
  applyTransform();
}

function loadSettingsAndApply() {
  chrome.storage.local.get(
    [STORAGE_KEY_URL, STORAGE_KEY_OPACITY, STORAGE_KEY_VISIBLE, STORAGE_KEY_SCALE, STORAGE_KEY_OFFSET_X, STORAGE_KEY_OFFSET_Y],
    (data) => {
      const url = data[STORAGE_KEY_URL] || '';
      const opacity = data[STORAGE_KEY_OPACITY] !== undefined ? data[STORAGE_KEY_OPACITY] : 0.5;
      const visible = data[STORAGE_KEY_VISIBLE] !== undefined ? data[STORAGE_KEY_VISIBLE] : true;
      const scale = data[STORAGE_KEY_SCALE] !== undefined ? data[STORAGE_KEY_SCALE] : 1.0;
      const ox = data[STORAGE_KEY_OFFSET_X] || 0;
      const oy = data[STORAGE_KEY_OFFSET_Y] || 0;

      if (url) {
        createOverlay();
        updateOverlay(url, opacity, visible, scale, ox, oy);
      }
    }
  );
}

function saveSettings() {
  chrome.storage.local.set({
    [STORAGE_KEY_OFFSET_X]: offsetX,
    [STORAGE_KEY_OFFSET_Y]: offsetY,
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_STENCIL') {
    createOverlay();
    updateOverlay(msg.url, msg.opacity, msg.visible, msg.scale, msg.offsetX, msg.offsetY);
  }
  if (msg.type === 'RESET_POSITION') {
    offsetX = 0;
    offsetY = 0;
    applyTransform();
    saveSettings();
  }
});

// Initialization
loadSettingsAndApply();

// Periodically reload stencil (in case it was updated)
setInterval(() => {
  chrome.storage.local.get([STORAGE_KEY_URL], (data) => {
    if (data[STORAGE_KEY_URL] && overlayImg) {
      const cacheBust = `?t=${Math.floor(Date.now() / REFRESH_INTERVAL)}`;
      overlayImg.src = data[STORAGE_KEY_URL] + cacheBust;
    }
  });
}, REFRESH_INTERVAL);
