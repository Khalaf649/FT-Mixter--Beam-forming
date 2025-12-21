// FFT Implementation for 2D Image Processing
import FFT from "fft.js";

// --- Simple Utility Functions ---

export function computeMagnitude(real, imag) {
  const result = new Float64Array(real.length);
  for (let i = 0; i < real.length; i++) {
    result[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return result;
}

export function computePhase(real, imag) {
  const result = new Float64Array(real.length);
  for (let i = 0; i < real.length; i++) {
    result[i] = Math.atan2(imag[i], real[i]);
  }
  return result;
}

export function nextPowerOf2(n) {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

export function padToPowerOf2(data, width, height) {
  const newWidth = nextPowerOf2(width);
  const newHeight = nextPowerOf2(height);
  const padded = new Float64Array(newWidth * newHeight);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      padded[y * newWidth + x] = data[y * width + x];
    }
  }

  return { padded, newWidth, newHeight };
}

// --- Internal Helper Functions to Reduce Duplication ---

/**
 * Shared logic for performing 1D FFT on either rows or columns of a 2D grid.
 */
function performFFT1D(real, imag, width, height, isHorizontal, isInverse) {
  const size = isHorizontal ? width : height;
  const count = isHorizontal ? height : width;
  const fft = new FFT(size);
  const input = fft.createComplexArray();
  const output = fft.createComplexArray();

  for (let i = 0; i < count; i++) {
    // 1. Fill buffer
    for (let j = 0; j < size; j++) {
      const idx = isHorizontal ? i * width + j : j * width + i;
      input[2 * j] = real[idx];
      input[2 * j + 1] = imag[idx];
    }

    // 2. Transform
    if (isInverse) {
      fft.inverseTransform(output, input);
    } else {
      fft.transform(output, input);
    }

    // 3. Write back
    for (let j = 0; j < size; j++) {
      const idx = isHorizontal ? i * width + j : j * width + i;
      real[idx] = output[2 * j];
      imag[idx] = output[2 * j + 1];
    }
  }
}

/**
 * Shifts zero-frequency component to center or back to origin.
 * The operation is its own inverse for power-of-2 dimensions.
 */
function applyFFTShift(inputReal, inputImag, width, height) {
  const size = width * height;
  const shiftedReal = new Float32Array(size);
  const shiftedImag = new Float32Array(size);
  const halfW = width / 2;
  const halfH = height / 2;

  for (let y = 0; y < height; y++) {
    const newY = (y + halfH) % height;
    const rowOffset = y * width;
    const newRowOffset = newY * width;

    for (let x = 0; x < width; x++) {
      const newX = (x + halfW) % width;
      const currentIdx = rowOffset + x;
      const targetIdx = newRowOffset + newX;

      shiftedReal[targetIdx] = inputReal[currentIdx];
      shiftedImag[targetIdx] = inputImag[currentIdx];
    }
  }
  return { real: shiftedReal, imag: shiftedImag };
}

// --- Main API Functions ---

/**
 * Performs 2D FFT and FFT-Shift.
 */
export const fft2d = (grayScale, width, height) => {
  const size = width * height;
  const real = new Float32Array(grayScale); // Copy input
  const imag = new Float32Array(size);

  // Step 1: Horizontal FFT
  performFFT1D(real, imag, width, height, true, false);

  // Step 2: Vertical FFT
  performFFT1D(real, imag, width, height, false, false);

  // Step 3: Shift DC to center
  return applyFFTShift(real, imag, width, height);
};

/**
 * Performs Inverse 2D FFT to reconstruct the grayscale image.
 */
export const Ifft2d = (inputReal, inputImag, width, height) => {
  const size = width * height;

  // Step 1: Un-shift (Move DC back to origin)
  const { real, imag } = applyFFTShift(inputReal, inputImag, width, height);

  // Step 2: Vertical IFFT
  performFFT1D(real, imag, width, height, false, true);

  // Step 3: Horizontal IFFT
  performFFT1D(real, imag, width, height, true, true);

  // Step 4: Normalize and Clamp
  const outputGrayScale = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const val = real[i] / size;
    outputGrayScale[i] = Math.max(0, Math.min(255, val));
  }

  return outputGrayScale;
};
