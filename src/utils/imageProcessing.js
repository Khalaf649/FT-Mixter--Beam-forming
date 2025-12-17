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
 * Unified FFT Mixer.
 * Handles both Component Mixing and Region Mixing.
 *
 * @param {Array<Object>} images - Array of inputs.
 *        Can be [{mag, phase}, ...] OR [{real, imag}, ...].
 * @param {Array<Object>} weights - Array of mix weights.
 *        Structure: [{ comp1Gain: number, comp2Gain: number }, ...].
 *        comp1Gain applies to Mag (or Real).
 *        comp2Gain applies to Phase (or Imag).
 * @param {number} width - Image width (power of 2).
 * @param {number} height - Image height (power of 2).
 * @param {Object} region - The mask definition.
 *        Structure: { x, y, w, h, mode }.
 *        mode: 'inner' (pass frequencies inside rect, block outside)
 *              'outer' (pass frequencies outside rect, block inside)
 *              'all'   (special case: process everything, ignore rect)
 * @returns {Float32Array} - The reconstructed Grayscale image.
 */
export const unifiedMixer = (images, weights, region = null) => {
  const width = images[0].paddedWidth;
  const height = images[0].paddedHeight;
  // We explicitly pass width/height now to avoid relying on images[0] being valid
  const size = width * height;

  const mixedReal = new Float32Array(size);
  const mixedImag = new Float32Array(size);

  // 1. Detect Input Type (Check the first valid image found)
  // We assume all provided images follow the same structure
  const validImg = images.find((img) => img.paddedWidth > 0);
  if (!validImg) return { grayscale: new Float32Array(size) }; // Return empty if no inputs

  const isPolar = validImg.mag !== undefined && validImg.phase !== undefined;

  // Default region (Component Mixing Case)
  const safeRegion = region || {
    x: 0,
    y: 0,
    w: width,
    h: height,
    mode: "inner",
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      // 2. Region Logic
      const inRect =
        x >= safeRegion.x &&
        x < safeRegion.x + safeRegion.w &&
        y >= safeRegion.y &&
        y < safeRegion.y + safeRegion.h;

      let isActive = false;
      if (safeRegion.mode === "all") isActive = true;
      else if (safeRegion.mode === "inner") isActive = inRect;
      else if (safeRegion.mode === "outer") isActive = !inRect;

      if (!isActive) continue;

      // 3. Mixing Logic
      let comp1Sum = 0;
      let comp2Sum = 0;

      for (let j = 0; j < images.length; j++) {
        const img = images[j];
        const w = weights[j];

        // Skip empty images
        if (!img || img.paddedWidth === 0) continue;

        const val1 = isPolar ? img.mag[i] : img.real[i];
        const val2 = isPolar ? img.phase[i] : img.imag[i];

        // Access properties using the keys defined in your React State
        comp1Sum += val1 * w.component1Gain;
        comp2Sum += val2 * w.component2Gain;
      }

      // 4. Reconstruct Complex Number
      if (isPolar) {
        mixedReal[i] = comp1Sum * Math.cos(comp2Sum);
        mixedImag[i] = comp1Sum * Math.sin(comp2Sum);
      } else {
        mixedReal[i] = comp1Sum;
        mixedImag[i] = comp2Sum;
      }
    }
  }

  // 5. Perform Inverse FFT
  // Ensure you are using the IFFT function we defined previously
  return {
    grayscale: Ifft2d(mixedReal, mixedImag, width, height),
    fftReal: mixedReal,
    fftImaginary: mixedImag,
    fftMag: computeMagnitude(mixedReal, mixedImag),
    fftPhase: computePhase(mixedReal, mixedImag),
  };
};
