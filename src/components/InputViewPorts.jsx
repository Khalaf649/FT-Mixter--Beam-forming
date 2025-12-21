import ImageViewPort from "./ImageViewPort";
function InputViewPorts({
  images,
  handleImageLoad,
  mixerMode,
  regionSettings,
  unifiedSize,
}) {
  return (
    <div className="ft-mixer-grid">
      {[1, 2, 3, 4].map((id) => (
        <ImageViewPort
          key={id}
          id={id}
          title={`Image ${id}`}
          grayscale={images[id - 1].grayscale}
          ftMagnitude={images[id - 1].ftMagnitude}
          ftPhase={images[id - 1].ftPhase}
          ftReal={images[id - 1].ftReal}
          ftImaginary={images[id - 1].ftImaginary}
          width={images[id - 1].width}
          height={images[id - 1].height}
          paddedWidth={images[id - 1].paddedWidth}
          paddedHeight={images[id - 1].paddedHeight}
          onImageLoad={handleImageLoad}
          regionPercentage={mixerMode === "region" ? regionSettings.size : 0}
          regionType={regionSettings.isInner ? "inner" : "outer"}
          showRegion={
            mixerMode === "region" && images[id - 1].grayscale !== null
          }
        />
      ))}
    </div>
  );
}
export default InputViewPorts;
