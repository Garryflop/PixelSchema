const STORAGE_KEY_URL = 'stencil_image_url';
const STORAGE_KEY_OPACITY = 'stencil_opacity';
const STORAGE_KEY_VISIBLE = 'stencil_visible';
const STORAGE_KEY_OFFSET_X = 'stencil_offset_x';
const STORAGE_KEY_OFFSET_Y = 'stencil_offset_y';
const STORAGE_KEY_SCALE = 'stencil_scale';

const urlInput = document.getElementById('urlInput');
const opacitySlider = document.getElementById('opacitySlider');
const opacityVal = document.getElementById('opacityVal');
const scaleSlider = document.getElementById('scaleSlider');
const scaleVal = document.getElementById('scaleVal');
const applyBtn = document.getElementById('applyBtn');
const toggleBtn = document.getElementById('toggleBtn');
const resetBtn = document.getElementById('resetBtn');
const statusEl = document.getElementById('status');

let isVisible = true;

function showStatus(msg, type = 'ok') {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
  setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status'; }, 2500);
}

function updateToggleBtn() {
  if (isVisible) {
    toggleBtn.textContent = '👁 VISIBLE';
    toggleBtn.classList.add('active');
  } else {
    toggleBtn.textContent = '🙈 HIDDEN';
    toggleBtn.classList.remove('active');
  }
}

opacitySlider.addEventListener('input', () => {
  opacityVal.textContent = Math.round(opacitySlider.value * 100) + '%';
});

scaleSlider.addEventListener('input', () => {
  scaleVal.textContent = parseFloat(scaleSlider.value).toFixed(1) + '×';
});

toggleBtn.addEventListener('click', () => {
  isVisible = !isVisible;
  updateToggleBtn();
  chrome.storage.local.set({ [STORAGE_KEY_VISIBLE]: isVisible });
  sendToContent();
});

resetBtn.addEventListener('click', () => {
  chrome.storage.local.set({ [STORAGE_KEY_OFFSET_X]: 0, [STORAGE_KEY_OFFSET_Y]: 0 });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'RESET_POSITION' });
    }
  });
  showStatus('Position reset');
});

applyBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) {
    showStatus('Enter an image URL!', 'err');
    return;
  }
  if (!url.startsWith('http')) {
    showStatus('URL must start with https://', 'err');
    return;
  }

  const opacity = parseFloat(opacitySlider.value);
  const scale = parseFloat(scaleSlider.value);

  chrome.storage.local.set({
    [STORAGE_KEY_URL]: url,
    [STORAGE_KEY_OPACITY]: opacity,
    [STORAGE_KEY_VISIBLE]: isVisible,
    [STORAGE_KEY_SCALE]: scale,
  }, () => {
    sendToContent();
    showStatus('Stencil updated ✓');
  });
});

function sendToContent() {
  chrome.storage.local.get(
    [STORAGE_KEY_URL, STORAGE_KEY_OPACITY, STORAGE_KEY_VISIBLE, STORAGE_KEY_SCALE, STORAGE_KEY_OFFSET_X, STORAGE_KEY_OFFSET_Y],
    (data) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'UPDATE_STENCIL',
            url: data[STORAGE_KEY_URL] || '',
            opacity: data[STORAGE_KEY_OPACITY] !== undefined ? data[STORAGE_KEY_OPACITY] : 0.5,
            visible: data[STORAGE_KEY_VISIBLE] !== undefined ? data[STORAGE_KEY_VISIBLE] : true,
            scale: data[STORAGE_KEY_SCALE] !== undefined ? data[STORAGE_KEY_SCALE] : 1.0,
            offsetX: data[STORAGE_KEY_OFFSET_X] || 0,
            offsetY: data[STORAGE_KEY_OFFSET_Y] || 0,
          });
        }
      });
    }
  );
}

// Load saved settings when popup opens
chrome.storage.local.get(
  [STORAGE_KEY_URL, STORAGE_KEY_OPACITY, STORAGE_KEY_VISIBLE, STORAGE_KEY_SCALE],
  (data) => {
    if (data[STORAGE_KEY_URL]) urlInput.value = data[STORAGE_KEY_URL];
    if (data[STORAGE_KEY_OPACITY] !== undefined) {
      opacitySlider.value = data[STORAGE_KEY_OPACITY];
      opacityVal.textContent = Math.round(data[STORAGE_KEY_OPACITY] * 100) + '%';
    }
    if (data[STORAGE_KEY_SCALE] !== undefined) {
      scaleSlider.value = data[STORAGE_KEY_SCALE];
      scaleVal.textContent = parseFloat(data[STORAGE_KEY_SCALE]).toFixed(1) + '×';
    }
    if (data[STORAGE_KEY_VISIBLE] !== undefined) {
      isVisible = data[STORAGE_KEY_VISIBLE];
    }
    updateToggleBtn();
  }
);
