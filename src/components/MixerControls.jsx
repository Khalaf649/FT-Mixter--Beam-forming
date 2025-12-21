import Button from "./UI/Button";
import SelectBox from "./UI/SelectBox";
import Slider from "./UI/Slider";
import Progress from "./UI/Progress";
import { Play, Square } from "lucide-react";
function MixerControls({
  weights,
  onWeightChange,
  mixerMode,
  onMixerModeChange,
  regionSettings,
  onRegionSettingChange,
  componentType,
  onComponentTypeChange,
  selectedOutput,
  onSelectedOutputChange,
  onMix,
  onCancel,
  isProcessing,
  progress,
  loadedImageIndices,
}) {
  const hasImages = loadedImageIndices.length > 0;

  const componentLabels =
    componentType === "Mag/Phase"
      ? ["Magnitude", "Phase"]
      : ["Real", "Imaginary"];
  return (
    <div className="ft-mixer-sidebar">
      <div className="control-panel mixer-controls-container">
        <div className="mixer-mode-toggle">
          <Button
            variant={mixerMode === "component" ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={() => onMixerModeChange("component")}
          >
            Component
          </Button>
          <Button
            variant={mixerMode === "region" ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={() => onMixerModeChange("region")}
          >
            Region
          </Button>
        </div>
        <div className="mixer-section-header">
          <h3 className="mixer-section-title">
            {mixerMode === "component" ? "Components Mixer" : "Region Mixer"}
          </h3>
          <SelectBox
            value={componentType}
            onChange={onComponentTypeChange}
            className="select-trigger-sm"
            options={["Mag/Phase", "Real/Imag"]}
          />
        </div>{" "}
        {loadedImageIndices.length === 0 && (
          <p className="region-empty-text">Load images to apply mixing</p>
        )}
        {mixerMode === "region" && loadedImageIndices.length > 0 && (
          <div className="mixer-weights-list">
            <div className="region-shared-controls">
              <div className="region-slider-row">
                <div className="region-slider-header">
                  <span className="region-slider-label">Region Size</span>
                  <span className="region-value">{regionSettings.size}%</span>
                </div>
                <Slider
                  value={regionSettings.size}
                  onChange={(v) => onRegionSettingChange("size", v)}
                  min={10}
                  max={100}
                  step={5}
                />
              </div>
              <label className="region-checkbox-row">
                <input
                  type="checkbox"
                  checked={regionSettings.isInner}
                  onChange={(e) =>
                    onRegionSettingChange("isInner", e.target.checked)
                  }
                  className="region-checkbox"
                />
                <span className="region-checkbox-label">
                  {regionSettings.isInner
                    ? "Inner (Low Freq)"
                    : "Outer (High Freq)"}
                </span>
              </label>
            </div>
          </div>
        )}
        {loadedImageIndices.length > 0 &&
          loadedImageIndices.map((imgIdx) => (
            <div key={imgIdx} className="region-image-card">
              <div className="region-image-header">
                <span className="region-image-label">Image {imgIdx + 1}</span>
              </div>
              <div className="region-gains-grid">
                <div className="region-slider-row">
                  <div className="region-slider-header">
                    <span className="text-signal-cyan">
                      {componentLabels[0]}
                    </span>
                    <span className="region-value">
                      {(weights[imgIdx].component1Gain * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={weights[imgIdx].component1Gain * 100}
                    onChange={(v) =>
                      onWeightChange(imgIdx, "component1Gain", v / 100)
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="region-slider-row">
                  <div className="region-slider-header">
                    <span className="text-signal-magenta">
                      {componentLabels[1]}
                    </span>
                    <span className="region-value">
                      {(weights[imgIdx].component2Gain * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={weights[imgIdx].component2Gain * 100}
                    onChange={(v) =>
                      onWeightChange(imgIdx, "component2Gain", v / 100)
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </div>
          ))}
        <div className="output-target-section">
          <h4 className="mixer-section-title">Output Target</h4>
          <div className="output-buttons">
            <Button
              variant={selectedOutput === 1 ? "default" : "secondary"}
              size="sm"
              className="flex-1"
              onClick={() => onSelectedOutputChange(1)}
            >
              Output 1
            </Button>
            <Button
              variant={selectedOutput === 2 ? "default" : "secondary"}
              size="sm"
              className="flex-1"
              onClick={() => onSelectedOutputChange(2)}
            >
              Output 2
            </Button>
          </div>
        </div>
        <div className="mix-action-section">
          {isProcessing ? (
            <>
              <Progress isProcessing={isProcessing} className="progress-sm" />
              <Button
                variant="destructive"
                className="w-full"
                onClick={onCancel}
              >
                <Square className="icon-sm mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={onMix}
              disabled={!hasImages}
            >
              <Play className="icon-sm mr-2" />
              Mix Images
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
export default MixerControls;
