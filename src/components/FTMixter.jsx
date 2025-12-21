import InputViewPorts from "./InputViewPorts.jsx";
import OutputViewPorts from "./OutPutViewPorts.jsx";
import MixerControls from "./MixerControls.jsx";

import {
  canvasToGrayscale,
  resizeCanvas,
  computeFFT,
  loadImage,
  imageToCanvas,
  unifiedMixer,
} from "../utils/imageProcessing.js";
import { Ifft2d, computeMagnitude, computePhase } from "../utils/fft.js";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
function FTMixer() {
  const initialImageState = {
    grayscale: null,
    width: 0,
    height: 0,
    paddedWidth: 0,
    paddedHeight: 0,
    ftMagnitude: null,
    ftPhase: null,
    ftReal: null,
    ftImaginary: null,
  };

  const initialOutputState = {
    ...initialImageState,
  };

  const initalWeights = [
    { component1Gain: 0.25, component2Gain: 0.25 },
    { component1Gain: 0.25, component2Gain: 0.25 },
    { component1Gain: 0.25, component2Gain: 0.25 },
    { component1Gain: 0.25, component2Gain: 0.25 },
  ];
  const initialRegionSettings = { size: 50, region: "inner" };

  const [images, setImages] = useState([
    { ...initialImageState },
    { ...initialImageState },
    { ...initialImageState },
    { ...initialImageState },
  ]);

  const [weights, setWeights] = useState(initalWeights);
  const [outputs, setOutputs] = useState([
    { ...initialOutputState },
    { ...initialOutputState },
  ]);
  const [mixerMode, setMixerMode] = useState("component");
  const [selectedOutput, setSelectedOutput] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [componentType, setComponentType] = useState("Mag/Phase");
  const [regionSettings, setRegionSettings] = useState({
    size: 50,
    isInner: true,
  });
  const abortControllerRef = useRef(null);

  const [unifiedSize, setUnifiedSize] = useState({ width: 0, height: 0 });
  const originalCanvasesRef = useRef([null, null, null, null]);

  const handleUnifySize = useCallback(() => {
    const loadedImages = originalCanvasesRef.current.filter((c) => c !== null);
    if (loadedImages.length === 0) {
      setUnifiedSize({ width: 0, height: 0 });
      return;
    }

    // Find the image with the smallest area
    let smallest = loadedImages[0];
    let smallestArea = smallest.width * smallest.height;

    for (let i = 1; i < loadedImages.length; i++) {
      const img = loadedImages[i];
      const area = img.width * img.height;
      if (area < smallestArea) {
        smallest = img;
        smallestArea = area;
      }
    }
    // Set unified size to the dimensions of the smallest image
    setUnifiedSize({ width: smallest.width, height: smallest.height });
  }, []);

  const loadedImageIndices = useMemo(
    () =>
      images
        .map((img, idx) => (img.grayscale !== null ? idx : -1))
        .filter((idx) => idx !== -1),
    [images]
  );

  useEffect(() => {
    if (unifiedSize.width === 0 || unifiedSize.height === 0) return;
    const processAll = async () => {
      const newImages = [...images];
      for (let i = 0; i < 4; i++) {
        const canvas = originalCanvasesRef.current[i];
        if (!canvas) continue;
        const resizedCanvas = resizeCanvas(
          canvas,
          unifiedSize.width,
          unifiedSize.height
        );
        const { grayscale, width, height } = canvasToGrayscale(resizedCanvas);
        console.log(
          `the dimensions of the spatial domain of the image ${i + 1} :`,
          width,
          height
        );
        const fftResult = computeFFT(grayscale, width, height);
        console.log("the components of the frequency domain:", fftResult.phase);

        newImages[i] = {
          grayscale,
          width,
          height,
          paddedWidth: fftResult.paddedWidth,
          paddedHeight: fftResult.paddedHeight,
          ftMagnitude: fftResult.magnitude,
          ftPhase: fftResult.phase,
          ftReal: fftResult.real,
          ftImaginary: fftResult.imaginary,
        };
      }
      setImages(newImages);
    };

    processAll();
  }, [unifiedSize]);

  // Inside your component
  const handleImageLoad = useCallback(
    async (id, file) => {
      try {
        const img = await loadImage(file); // htmlImageElement
        const canvas = imageToCanvas(img); // draw image to canvas

        // Store canvas safely
        originalCanvasesRef.current[id - 1] = canvas;

        // Update unified size AFTER canvas is stored
        handleUnifySize();
      } catch (error) {
        console.error(error);
      }
    },
    [handleUnifySize] // ✅ dependency
  );

  const handleRegionSetting = useCallback((key, value) => {
    setRegionSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleWeights = useCallback((index, key, value) => {
    setWeights((prev) => {
      const newWeights = [...prev];
      newWeights[index] = {
        ...newWeights[index],
        [key]: value,
      };
      return newWeights;
    });
  }, []);

  const handleMix = useCallback(async () => {
    const loadedImages = images.filter((img) => img.grayscale !== null);
    if (loadedImages.length === 0) {
      alert("Please load at least one image to mix.");
      return;
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadedWeights = weights.slice(0, loadedImages.length);
    const pWidth = loadedImages[0].paddedWidth;
    const pHeight = loadedImages[0].paddedHeight;

    // --- Logic for mode switching ---
    const isRegionMode = mixerMode === "region";

    let startX, endX, startY, endY, activeInner;

    if (isRegionMode) {
      const { size, isInner } = regionSettings;
      const regionW = (pWidth * size) / 100;
      const regionH = (pHeight * size) / 100;
      const centerX = pWidth / 2;
      const centerY = pHeight / 2;

      startX = Math.floor(centerX - regionW / 2);
      endX = Math.floor(centerX + regionW / 2);
      startY = Math.floor(centerY - regionH / 2);
      endY = Math.floor(centerY + regionH / 2);
      activeInner = isInner;
    } else {
      // "component" mode: Use the full range
      startX = 0;
      endX = pWidth;
      startY = 0;
      endY = pHeight;
      activeInner = true; // Always true to process the whole image
    }

    setIsProcessing(true);

    try {
      // Check if cancelled
      if (signal.aborted) throw new Error("Operation cancelled");

      // 1. Perform mixing in frequency domain
      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow UI update

      if (signal.aborted) throw new Error("Operation cancelled");

      const { ftReal, ftImaginary, ftMagnitude, ftPhase } = unifiedMixer(
        loadedImages,
        loadedWeights,
        componentType,
        activeInner, // Use the resolved inner/outer state
        startX,
        startY,
        endX,
        endY
      );
      console.log("Mixed Frequency Domain:", ftReal, ftImaginary);

      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow UI update

      if (signal.aborted) throw new Error("Operation cancelled");

      // 2. Perform Inverse FFT
      const paddedReconstructed = Ifft2d(ftReal, ftImaginary, pWidth, pHeight);

      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow UI update

      if (signal.aborted) throw new Error("Operation cancelled");
      // 2. CROP: Extract the original dimensions (e.g., 300x400) from the padded result
      // We only want the pixels from (0,0) up to (unifiedSize.width, unifiedSize.height)

      const croppedGrayscale = new Float32Array(
        unifiedSize.width * unifiedSize.height
      );

      for (let y = 0; y < unifiedSize.height; y++) {
        for (let x = 0; x < unifiedSize.width; x++) {
          // Map 2D coordinate to the padded 1D array index
          const paddedIdx = y * pWidth + x;
          // Map 2D coordinate to the new cropped 1D array index
          const croppedIdx = y * unifiedSize.width + x;
          croppedGrayscale[croppedIdx] = paddedReconstructed[paddedIdx];
        }
      }

      // 3. Update the selected output
      setOutputs((prev) => {
        const newOutputs = [...prev];
        const idx = selectedOutput - 1;
        newOutputs[idx] = {
          ...newOutputs[idx],
          grayscale: croppedGrayscale,
          width: unifiedSize.width,
          height: unifiedSize.height,
          paddedWidth: pWidth,
          paddedHeight: pHeight,
          ftReal: ftReal,
          ftImaginary: ftImaginary,
          ftPhase: ftPhase,
          ftMagnitude: ftMagnitude,
        };
        return newOutputs;
      });
    } catch (error) {
      if (error.message === "Operation cancelled") {
        console.log("Mixing cancelled by user");
      } else {
        console.error("Mixing Error:", error);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
    // Added mixerMode and regionSettings to dependencies
  }, [
    images,
    weights,
    componentType,
    mixerMode,
    regionSettings,
    selectedOutput,
  ]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="ft-mixer-layout">
      <InputViewPorts
        images={images}
        handleImageLoad={handleImageLoad}
        mixerMode={mixerMode}
        regionSettings={regionSettings}
        unifiedSize={unifiedSize}
      />

      <MixerControls
        weights={weights}
        onWeightChange={handleWeights}
        mixerMode={mixerMode}
        onMixerModeChange={setMixerMode}
        regionSettings={regionSettings}
        onRegionSettingChange={handleRegionSetting}
        componentType={componentType}
        onComponentTypeChange={setComponentType}
        selectedOutput={selectedOutput}
        onSelectedOutputChange={setSelectedOutput}
        onMix={handleMix}
        onCancel={handleCancel}
        isProcessing={isProcessing}
        loadedImageIndices={loadedImageIndices}
      />

      <OutputViewPorts
        outputs={outputs}
        selectedOutput={selectedOutput}
        setSelectedOutput={setSelectedOutput}
      />
    </div>
  );
}
export default FTMixer;
