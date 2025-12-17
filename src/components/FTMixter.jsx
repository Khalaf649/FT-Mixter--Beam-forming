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
    grayscale: null,
    ftMagnitude: null,
    ftPhase: null,
    ftReal: null,
    ftImaginary: null,
    width: 0, // =paddedWidth of source image
    height: 0, // =paddedHeight of source image
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
  const [progress, setProgress] = useState(0);
  // const abortControllerRef = useRef(null);

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
        console.log(
          "the dimensions of the frequency domain:",
          fftResult.paddedWidth,
          fftResult.paddedHeight
        );

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

  const handleMix = useCallback(() => {
    if (!images.length) return;

    const MixedImages = images.map((img) =>
      componentType === "Mag/Phase" && img.grayscale
        ? {
            mag: img.ftMagnitude,
            phase: img.ftPhase,
            paddedWidth: img.paddedWidth,
            paddedHeight: img.paddedHeight,
          }
        : {
            real: img.ftReal,
            imag: img.ftImaginary,
            paddedWidth: img.paddedWidth,
            paddedHeight: img.paddedHeight,
          }
    );

    const { grayscale, fftReal, fftImaginary, fftMag, fftPhase } = unifiedMixer(
      MixedImages,
      weights
    );

    const newOutputs = [...outputs];
    if (!newOutputs[selectedOutput - 1]) return;

    newOutputs[selectedOutput - 1] = {
      ...newOutputs[selectedOutput - 1],
    grayscale: grayscale,
      ftReal: fftReal,
      ftImaginary: fftImaginary,
      ftMagnitude: fftMag,
      ftPhase: fftPhase,
      width: MixedImages[0].paddedWidth,
      height: MixedImages[0].paddedHeight,
    };

    setOutputs(newOutputs);
  }, [images, componentType, weights, outputs, selectedOutput]);

  const handleCancel = useCallback(() => {
    // Implement cancel logic here
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
        progress={progress}
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
