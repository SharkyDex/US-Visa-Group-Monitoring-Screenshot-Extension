// console.log('Content script loaded');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

const sensitiveSelectors = ['.username', '#gm_select'];
const sensitiveBoxes = [];

sensitiveSelectors.forEach(selector => {
  const el = document.querySelector(selector);
  if (!el) {
    // console.warn(`Element not found for selector: ${selector}`);
    return;
  }

  const rect = el.getBoundingClientRect();
  const boundingBox = {
    selector,
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height
  };

  sensitiveBoxes.push(boundingBox);
});

// console.log('Updated sensitiveBoxes:', sensitiveBoxes);



function init() {
  const select = document.querySelector('#post_select');
  if (!select) {
    // console.log("No selection");
    return;
  }

  // console.log("select found");

  select.addEventListener('change', async () => {
    // console.log("Selection changed, waiting for 'Loading' to disappear...");

    await waitForLoadingTextToDisappear();

    // console.log("'Loading' disappeared. Taking screenshot...");

    // const originalCanvas = await html2canvas(document.body);

    
    // const cropX = originalCanvas.width * 0.4;   
    // const cropY = originalCanvas.height * 0.1;  
    // const cropWidth = originalCanvas.width - cropX;
    // const cropHeight = originalCanvas.height - cropY;

    // const croppedCanvas = document.createElement('canvas');
    // croppedCanvas.width = cropWidth;
    // croppedCanvas.height = cropHeight;

    // const ctx = croppedCanvas.getContext('2d');

    
    // ctx.drawImage(
    //   originalCanvas,
    //   cropX, cropY,         
    //   cropWidth, cropHeight, 
    //   0, 0,                 
    //   cropWidth, cropHeight  
    // );

    const canvas = await html2canvas(document.body, { useCORS: true });
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    
    const pixelSize = 5; 

    sensitiveBoxes.forEach(box => {
      const { x, y, width, height } = box;

      
      const imageData = ctx.getImageData(x, y, width, height);

      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width / pixelSize;
      tempCanvas.height = height / pixelSize;

      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

      
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(canvas, x, y, width, height, 0, 0, tempCanvas.width, tempCanvas.height);

      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, width, height);
    });

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

    ctx.font = '60px Arial';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    const padding = 20;
    const textWidth = ctx.measureText(timestamp).width;
    const textHeight = 80;
    const x = canvas.width - textWidth - padding * 2;
    const y = canvas.height - padding;

    ctx.fillRect(x - padding, y - textHeight, textWidth + padding * 2, textHeight + padding / 2);
    ctx.fillStyle = 'white';
    ctx.fillText(timestamp, x, y);


    
    const imageDataUrl = canvas.toDataURL("image/png");

    
    await sendScreenshotToDiscord(imageDataUrl);

      });
  }

  async function waitForLoadingTextToDisappear() {
    const pollInterval = 200;
    const maxWaitTime = 1000; 
    let totalWaitTime = 0;

    let loadingElement = null;

    
    while (!loadingElement && totalWaitTime < maxWaitTime) {
      loadingElement = Array.from(document.querySelectorAll('body *'))
        .find(el => el.textContent && el.textContent.trim().includes('Loading'));
      if (!loadingElement) {
        await new Promise(r => setTimeout(r, pollInterval));
        totalWaitTime += pollInterval;
      }
    }

    
    if (!loadingElement) {
      // console.log("No 'Loading' text found after 1 second. Proceeding.");
      return;
    }

   
    while (loadingElement && loadingElement.textContent.trim().includes('Loading')) {
      await new Promise(r => setTimeout(r, pollInterval));
    }
}


function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

async function sendScreenshotToDiscord(imageDataUrl) {
  const webhookUrl = ''; // Add your url within the quotes

  const blob = dataURLtoBlob(imageDataUrl);

  const formData = new FormData();
  formData.append('file', blob, 'screenshot.png');
  

  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    // const errorText = await response.text();
    // console.error('Discord error:', errorText);
  } else {
    // console.log('Screenshot sent to Discord successfully!');
  }
}
