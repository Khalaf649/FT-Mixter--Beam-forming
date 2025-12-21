import {
  fft2d,
  Ifft2d,
  padToPowerOf2,
  computeMagnitude,
  computePhase,
} from "./fft";

export function convertToGrayscale(imageData) {
  // takes RGBA ImageData and returns Uint8ClampedArray(0-255) grayscale
  const data = imageData.data;
  const grayscale = new Uint8ClampedArray(imageData.width * imageData.height); // force 0-255

  for (let i = 0; i < data.length; i += 4) {
    // Luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayscale[i / 4] = gray;
  }

  return grayscale;
}

export function resizeCanvas(canvas, targetWidth, targetHeight) {
  // takes a canvas and returns a resized canvas
  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = targetWidth;
  resizedCanvas.height = targetHeight;

  const ctx = resizedCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  return resizedCanvas;
}

export function applyBrightnessContrast(data, brightness, contrast) {
  // take the grayscale data and apply brightness and contrast adjustments and return grayscale data
  const result = new Uint8ClampedArray(data.length);
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i++) {
    let value = data[i];
    value = factor * (value - 128) + 128 + brightness;
    result[i] = Math.max(0, Math.min(255, value));
  }

  return result;
}

export function grayscaleToImageData(grayscale, width, height) {
  // takes gray scale Uint8ClampedArray and returns ImageData(RGBA)
  const imageData = new ImageData(width, height);

  for (let i = 0; i < grayscale.length; i++) {
    const value = Math.max(0, Math.min(255, grayscale[i]));
    imageData.data[i * 4] = value;
    imageData.data[i * 4 + 1] = value;
    imageData.data[i * 4 + 2] = value;
    imageData.data[i * 4 + 3] = 255;
  }

  return imageData;
}

export function computeFFT(grayscale, width, height) {
  const { padded, newWidth, newHeight } = padToPowerOf2(
    grayscale,
    width,
    height
  );
  console.log("newWidth:", newWidth, "newHeight:", newHeight);

  // Compute FFT
  const { real, imag } = fft2d(padded, newWidth, newHeight);

  // Compute magnitude and phase
  const magnitude = computeMagnitude(real, imag);
  const phase = computePhase(real, imag);
  console.log("DONE");
  return {
    magnitude,
    phase,
    real: real,
    imaginary: imag,
    paddedWidth: newWidth,
    paddedHeight: newHeight,
  };
}

export function normalizeForDisplay(data, useLog = true) {
  // takes a Float64Array(grey scale) and normalizes it to greyScale Uint8ClampedArray for display
  const result = new Uint8ClampedArray(data.length);

  let processedData = data;
  if (useLog) {
    processedData = new Float64Array(data.length);
    for (let i = 0; i < data.length; i++) {
      processedData[i] = Math.log(1 + Math.abs(data[i]));
    }
  }

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < processedData.length; i++) {
    if (processedData[i] < min) min = processedData[i];
    if (processedData[i] > max) max = processedData[i];
  }

  const range = max - min || 1;

  for (let i = 0; i < processedData.length; i++) {
    result[i] = Math.round(((processedData[i] - min) / range) * 255);
  }

  return result;
}

export async function loadImage(file) {
  // return an HTMLImageElement
  // Read the file as a data URL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Create an image element and wait for it to load
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  return img;
}

export function imageToCanvas(img) {
  // take an htmlTagElement and return a canvas with the image drawn on it
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  return canvas;
}

export function canvasToGrayscale(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const grayscale = convertToGrayscale(imageData);

  return {
    grayscale,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Mixes multiple images in the frequency domain.
 *
 * @param {Array} images - Array of image objects containing FT data.
 * @param {Array} weights - Array of weight objects {component1Gain, component2Gain}.
 * @param {string} mode - "Mag/Phase" or "Real/Imag".
 * @param {boolean} isInner - True for Low Pass (inside box), False for High Pass (outside box).
 */
export function unifiedMixer(
  images,
  weights,
  mode,
  isInner,
  startX,
  startY,
  endX,
  endY
) {
  const pWidth = images[0].paddedWidth;
  const pHeight = images[0].paddedHeight;
  const size = pWidth * pHeight;

  const mixedReal = new Float32Array(size);
  const mixedImag = new Float32Array(size);

  for (let y = 0; y < pHeight; y++) {
    for (let x = 0; x < pWidth; x++) {
      const idx = y * pWidth + x;

      // Determine if pixel is inside the user-defined square
      const isInside = x >= startX && x <= endX && y >= startY && y <= endY;

      // Filter Logic:
      // If isInner is true, we ONLY mix pixels INSIDE (others become 0).
      // If isInner is false, we ONLY mix pixels OUTSIDE (others become 0).
      const shouldProcess = isInner ? isInside : !isInside;

      if (shouldProcess) {
        let comp1Sum = 0;
        let comp2Sum = 0;

        // Sum contributions from all loaded images
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const w = weights[i];

          if (mode === "Mag/Phase") {
            comp1Sum += img.ftMagnitude[idx] * w.component1Gain;
            comp2Sum += img.ftPhase[idx] * w.component2Gain;
          } else {
            comp1Sum += img.ftReal[idx] * w.component1Gain;
            comp2Sum += img.ftImaginary[idx] * w.component2Gain;
          }
        }

        // Convert sums back to Real/Imaginary components
        if (mode === "Mag/Phase") {
          // comp1Sum is combined Magnitude, comp2Sum is combined Phase
          mixedReal[idx] = comp1Sum * Math.cos(comp2Sum);
          mixedImag[idx] = comp1Sum * Math.sin(comp2Sum);
        } else {
          // comp1Sum is combined Real, comp2Sum is combined Imaginary
          mixedReal[idx] = comp1Sum;
          mixedImag[idx] = comp2Sum;
        }
      } else {
        // Pixel is outside the active region: Set to 0 (Filtering effect)
        mixedReal[idx] = 0;
        mixedImag[idx] = 0;
      }
    }
  }
  const ftReal = mixedReal;
  const ftImaginary = mixedImag;
  const ftMagnitude = computeMagnitude(ftReal, ftImaginary);
  const ftPhase = computePhase(ftReal, ftImaginary);

  return { ftReal, ftImaginary, ftMagnitude, ftPhase };
}
