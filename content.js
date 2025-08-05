function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve();

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load html2canvas'));
    document.head.appendChild(script);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

async function sendScreenshotToServer(imageDataUrl) {
  const blob = dataURLtoBlob(imageDataUrl);
  const formData = new FormData();
  formData.append('file', blob, 'screenshot.png');

  await fetch('http://localhost:3000/upload', {
    method: 'POST',
    body: formData,
  });
}

async function waitForLoadingToClear() {
  const pollInterval = 200;
  const maxWait = 2000;
  let elapsed = 0;
  let loadingEl = null;

  while (!loadingEl && elapsed < maxWait) {
    loadingEl = Array.from(document.querySelectorAll('body *'))
      .find(el => el.textContent && el.textContent.trim().includes('Loading'));
    if (!loadingEl) {
      await wait(pollInterval);
      elapsed += pollInterval;
    }
  }

  if (!loadingEl) return;

  while (loadingEl.textContent.trim().includes('Loading')) {
    await wait(pollInterval);
  }
}

async function safeInit() {
  const trigger = document.querySelector('#post_select');
  if (!trigger) return;

  trigger.addEventListener('change', async () => {
    try {
      await loadHtml2Canvas();  
      await waitForLoadingToClear();

      
      await wait(300 + Math.random() * 500);

      const renderSurface = await html2canvas(document.body, { useCORS: true });
      const ctx = renderSurface.getContext('2d', { willReadFrequently: true });

      const el = document.querySelector('#gm_select');
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const sensitiveArea = {
        x: Math.floor(rect.left + window.scrollX),
        y: Math.floor(rect.top + window.scrollY),
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
      };

      const pixelSize = 5;
      const { x, y, width, height } = sensitiveArea;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.ceil(width / pixelSize);
      tempCanvas.height = Math.ceil(height / pixelSize);

      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(renderSurface, x, y, width, height, 0, 0, tempCanvas.width, tempCanvas.height);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, width, height);

      const now = new Date();
      const timestamp = now.toLocaleString('en-IN', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const cropY = Math.floor(renderSurface.height * 0.1);
      const cropHeight = renderSurface.height - cropY;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = renderSurface.width;
      croppedCanvas.height = cropHeight;

      const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });
      croppedCtx.drawImage(renderSurface, 0, cropY, renderSurface.width, cropHeight, 0, 0, renderSurface.width, cropHeight);

      const padding = 20;
      croppedCtx.font = '60px Arial';
      croppedCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      const textWidth = croppedCtx.measureText(timestamp).width;
      const textHeight = 80;
      const tsX = croppedCanvas.width - textWidth - padding * 2;
      const tsY = croppedCanvas.height - padding;

      croppedCtx.fillRect(tsX - padding, tsY - textHeight, textWidth + padding * 2, textHeight + padding / 2);
      croppedCtx.fillStyle = 'white';
      croppedCtx.fillText(timestamp, tsX, tsY);

      const imageDataUrl = croppedCanvas.toDataURL("image/png");

      await sendScreenshotToServer(imageDataUrl);

    } catch (e) {
      console.error('Error in html2canvas usage:', e);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInit);
} else {
  safeInit();
}
