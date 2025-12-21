import {
  grayscaleToImageData,
  applyBrightnessContrast,
  normalizeForDisplay,
} from "../utils/imageProcessing";
import { useRef, useState, useEffect, useCallback } from "react";
import SelectBox from "./UI/SelectBox";
function ImageViewPort({
  id,
  title,
  grayscale,
  ftMagnitude,
  ftPhase,
  ftReal,
  ftImaginary,
  width,
  height,
  paddedWidth,
  paddedHeight,
  onImageLoad,
  regionPercentage = 50,
  regionType = "inner",
  showRegion = false,
  isOutput = false,
  isSelected = false,
  onSelect,
}) {
  const displayWidth = width;
  const displayHeight = height;
  const imageCanvasRef = useRef(null);
  const ftCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [ftComponent, setFtComponent] = useState("FT Magnitude");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [ftBrightness, setFtBrightness] = useState(0);
  const [ftContrast, setFtContrast] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFtDragging, setIsFtDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  if (isOutput)
    console.log(
      "PaddedWidth: " + paddedWidth + " PaddedHeight: " + paddedHeight
    );
  const imageData = grayscale;
  useEffect(() => {
    if (!imageCanvasRef.current || !imageData || width === 0 || height === 0)
      return;
    const canvas = imageCanvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Normalize Float64Array for display
    const normalized = normalizeForDisplay(grayscale, false);
    const adjusted = applyBrightnessContrast(normalized, brightness, contrast);
    const imgData = grayscaleToImageData(adjusted, displayWidth, displayHeight);
    ctx.putImageData(imgData, 0, 0);
  }, [grayscale, isOutput, width, height, brightness, contrast]);
  useEffect(() => {
    if (!ftCanvasRef.current || paddedWidth === 0 || paddedHeight === 0) return;
    let data = null;
    let useLog = true;
    switch (ftComponent) {
      case "FT Magnitude":
        data = ftMagnitude;
        break;
      case "FT Phase":
        data = ftPhase;
        useLog = false;
        break;
      case "FT Real":
        data = ftReal;
        useLog = false;
        break;
      case "FT Imaginary":
        data = ftImaginary;
        useLog = false;
        break;
    }

    if (!data) return;
    const canvas = ftCanvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = paddedWidth;
    canvas.height = paddedHeight;
    const normalized = normalizeForDisplay(data, useLog);
    const adjusted = applyBrightnessContrast(
      normalized,
      ftBrightness,
      ftContrast
    );

    const imageData = grayscaleToImageData(adjusted, paddedWidth, paddedHeight);
    ctx.putImageData(imageData, 0, 0);

    if (showRegion && regionPercentage > 0) {
      const regionWidth = (paddedWidth * regionPercentage) / 100;
      const regionHeight = (paddedHeight * regionPercentage) / 100;
      const startX = (paddedWidth - regionWidth) / 2;
      const startY = (paddedHeight - regionHeight) / 2;
      ctx.fillStyle =
        regionType === "inner"
          ? "rgba(0, 200, 255, 0.3)"
          : "rgba(255, 100, 200, 0.3)";
      if (regionType === "inner") {
        ctx.fillRect(startX, startY, regionWidth, regionHeight);
      } else {
        ctx.fillRect(0, 0, paddedWidth, startY);
        ctx.fillRect(
          0,
          startY + regionHeight,
          paddedWidth,
          paddedHeight - startY - regionHeight
        );
        ctx.fillRect(0, startY, startX, regionHeight);
        ctx.fillRect(
          startX + regionWidth,
          startY,
          paddedWidth - startX - regionWidth,
          regionHeight
        );
      }
      ctx.strokeStyle =
        regionType === "inner" ? "hsl(190, 95%, 55%)" : "hsl(300, 80%, 60%)";
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, regionWidth, regionHeight);
    }
  }, [
    ftComponent,
    ftMagnitude,
    ftPhase,
    ftReal,
    ftImaginary,
    paddedWidth,
    paddedHeight,
    ftBrightness,
    ftContrast,
    showRegion,
    regionPercentage,
    regionType,
  ]);
  const handleDoubleClick = useCallback(() => {
    if (!isOutput) fileInputRef.current?.click();
  }, [isOutput]);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file && onImageLoad) onImageLoad(id, file);
      e.target.value = "";
    },
    [id, onImageLoad]
  );

  const handleClick = useCallback(() => {
    if (isOutput && onSelect) onSelect(id);
  }, [isOutput, onSelect, id]);

  const handleImageMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleImageMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setContrast((prev) => Math.max(-100, Math.min(100, prev + dx * 0.5)));
    setBrightness((prev) => Math.max(-100, Math.min(100, prev - dy * 0.5)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleImageMouseUp = () => setIsDragging(false);

  const handleFtMouseDown = (e) => {
    setIsFtDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleFtMouseMove = (e) => {
    if (!isFtDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setFtContrast((prev) => Math.max(-100, Math.min(100, prev + dx * 0.5)));
    setFtBrightness((prev) => Math.max(-100, Math.min(100, prev - dy * 0.5)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleFtMouseUp = () => setIsFtDragging(false);

  const canvasStyle =
    displayWidth > 0
      ? { width: displayWidth, height: displayHeight }
      : undefined;
  const hasImage = grayscale !== null;
  const emptyText = isOutput
    ? "Output will appear here"
    : "Double-click to load image";
  const emptyTextClass = isOutput ? "text-signal-magenta" : "text-signal-cyan";
  return (
    <div
      onClick={handleClick}
      className={`viewport animate-fade-in viewport-container ${
        isOutput ? "cursor-pointer" : ""
      } ${isOutput && isSelected ? "output-viewport-selected" : ""}`}
    >
      <div
        className={`viewport-header ${
          isOutput && isSelected ? "output-viewport-header" : ""
        }`}
      >
        <span className="text-sm font-medium text-foreground flex items-center gap-2">
          {title}
          {isOutput && isSelected && (
            <span className="active-badge">Active</span>
          )}
        </span>
        <span className="data-label">
          {displayWidth > 0
            ? `${displayWidth}×${displayHeight}`
            : isOutput
            ? "No output"
            : "No image"}
        </span>
      </div>
      <div className="viewport-body">
        <div
          className="viewport-canvas-area"
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onMouseLeave={handleImageMouseUp}
        >
          {hasImage ? (
            <canvas
              ref={imageCanvasRef}
              className="max-w-full max-h-full object-contain"
              style={canvasStyle}
            />
          ) : (
            <div className="viewport-empty-text">
              <p className={emptyTextClass}>{emptyText}</p>
            </div>
          )}
          {hasImage && (
            <div className="viewport-bc-overlay">
              B:{brightness.toFixed(0)} C:{contrast.toFixed(0)}
            </div>
          )}
        </div>
        <div className="viewport-ft-section">
          <div className="viewport-ft-header">
            <SelectBox
              value={ftComponent}
              onChange={setFtComponent}
              options={["FT Magnitude", "FT Phase", "FT Real", "FT Imaginary"]}
              className="select-trigger-ft"
            />
          </div>

          <div
            className="viewport-canvas-area"
            onMouseDown={handleFtMouseDown}
            onMouseMove={handleFtMouseMove}
            onMouseUp={handleFtMouseUp}
            onMouseLeave={handleFtMouseUp}
          >
            {ftMagnitude ? (
              <canvas
                ref={ftCanvasRef}
                className="max-w-full max-h-full object-contain"
                style={canvasStyle}
              />
            ) : (
              <div className="viewport-empty-text-sm">
                {isOutput ? "Mix images to see FT" : "Load image to see FT"}
              </div>
            )}
            {ftMagnitude && (
              <div className="viewport-bc-overlay">
                B:{ftBrightness.toFixed(0)} C:{ftContrast.toFixed(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isOutput && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="input-hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}
export default ImageViewPort;
