// shared/Viewport.js
import {
  applyBrightnessContrast,
  normalizeForDisplay,
} from "../shared/utils/imageProcessing.js";

export class Viewport {
  constructor(container, id, title, isInput = true, selected = false) {
    this.id = id;
    this.title = title;
    this.isInput = isInput;

    this.grayscale = null;
    this.ftMagnitude = null;
    this.ftPhase = null;
    this.ftReal = null;
    this.ftImaginary = null;

    this.width = 0;
    this.height = 0;
    this.paddedWidth = 0;
    this.paddedHeight = 0;
    this.displayWidth = 0;
    this.displayHeight = 0;

    this.ftComponent = "magnitude";
    this.brightness = 0;
    this.contrast = 0;
    this.ftBrightness = 0;
    this.ftContrast = 0;

    this.regionPercentage = 50;
    this.regionType = "inner";
    this.showRegion = false;

    this.selected = this.isInput ? false : selected;

    this.container = container; // store for re-renders
    this.onImageLoad = null;

    this.element = this._createHTML();
    this.container.appendChild(this.element);

    this.setupEvents();
  }

  // Private: creates the full HTML structure based on current state
  _createHTML() {
    const viewport = document.createElement("div");
    viewport.className = `viewport animate-fade-in viewport-container ${
      !this.isInput ? "cursor-pointer transition-all" : ""
    } ${this.selected ? "output-viewport-selected" : ""}`;

    viewport.innerHTML = `
      <div class="viewport-header">
        <span class="text-sm font-medium text-foreground ${
          !this.isInput && "flex items-center gap-2"
        }">
        ${this.title}
        ${this.selected ? '<span class="active-badge">Active</span>' : ""}
        </span>
        <span class="data-label">${
          this.displayWidth > 0
            ? `${this.displayWidth} x ${this.displayHeight}`
            : `${this.isInput ? "No Image" : "No Output"}`
        }</span>
      </div>

      <div class="viewport-body">
        <!-- Original Image Canvas -->
        <div class="viewport-canvas-area">
        ${
          this.grayscale
            ? '<canvas class="max-w-full max-h-full object-contain" style="width:' +
              this.displayWidth +
              "px; height:" +
              this.displayHeight +
              'px;"></canvas>'
            : `<div class="viewport-empty-text"> <p class="text-signal-${
                this.isInput ? "cyan" : "magenta"
              }">${
                this.isInput
                  ? "Double-click to load image"
                  : "Output will appear here"
              }</p></div>`
        }
          ${
            this.grayscale
              ? '<div class="viewport-bc-overlay">B:' +
                this.brightness.toFixed(0) +
                " C:" +
                this.contrast.toFixed(0) +
                "</div>"
              : ""
          }
          
        </div>

        <!-- FT Section -->
        <div class="viewport-ft-section">
          <div class="viewport-ft-header">
            <select class="select-trigger select-trigger-ft select-content select-scroll-btn">
              <option class="select-item" value="magnitude">FT Magnitude</option>
              <option class="select-item" value="phase">FT Phase</option>
              <option class="select-item" value="real">FT Real</option>
              <option class="select-item" value="imaginary">FT Imaginary</option>
            </select>
          </div>

          <div class="viewport-canvas-area">
          ${
            this.ftMagnitude
              ? '<canvas class="max-w-full max-h-full object-contain" style="width:' +
                this.displayWidth +
                "px; height:" +
                this.displayHeight +
                'px;"></canvas>'
              : `<div class="viewport-empty-text-sm">${
                  this.isInput ? "Load image to see FT" : "Mix image to see FT"
                }</div>`
          }
          ${
            this.ftMagnitude
              ? '<div class="viewport-bc-overlay">B:' +
                this.ftBrightness.toFixed(0) +
                " C:" +
                this.ftContrast.toFixed(0) +
                "</div>"
              : ""
          }
          </div>
        </div>
      </div>

      <input type="file" accept="image/*" class="input-hidden" style="display:none">
    `;

    return viewport;
  }

  // Public: fully re-creates the viewport element from scratch
  // Public: updates the viewport by overwriting innerHTML while keeping the same element
  // Public: fully re-creates the viewport element from scratch and replaces it in the DOM
  render() {
    if (!this.element || !this.element.parentNode) return;

    // Create the brand new HTML structure
    const newElement = this._createHTML();

    // Replace the old element with the new one in the DOM
    this.container.replaceChild(newElement, this.element);

    // Update the reference to the new element
    this.element = newElement;

    // Re-cache all DOM references (critical after full replacement)
    this.imageCanvas = this.element.querySelector("canvas"); // first canvas = original image
    this.ftCanvas = this.element.querySelectorAll("canvas")[1] || null;
    this.fileInput = this.element.querySelector(".input-hidden");
    this.select = this.element.querySelector("select");
    this.dataLabel = this.element.querySelector(".data-label");
    this.bcOverlay =
      this.element.querySelectorAll(".viewport-bc-overlay")[0] || null;
    this.ftBcOverlay =
      this.element.querySelectorAll(".viewport-bc-overlay")[1] || null;
    this.canvasArea = this.element.querySelectorAll(".viewport-canvas-area")[0];
    this.ftCanvasArea = this.element.querySelectorAll(
      ".viewport-canvas-area"
    )[1];
    this.emptyText = this.element.querySelector(".viewport-empty-text");
    this.ftEmptyText = this.element.querySelector(".viewport-empty-text-sm");

    // Re-attach all event listeners
    this.setupEvents();

    // Redraw image and FT if data exists
    if (this.grayscale) this.renderImage();
    if (this.ftMagnitude) this.renderFT();
  }

  // New method to change selection state
  setSelected(selected) {
    console.log("Setting selected to:", selected);
    if (this.isInput || this.selected === selected) return;

    this.selected = selected;
    this.render(); // full re-render with new state
  }

  // Keep all your existing methods unchanged...
  setupEvents() {
    /* ... same as before ... */
  }
  setupDrag(area, callback) {
    /* ... same ... */
  }
  setImage(grayscaleData, width, height, displayW, displayH) {
    /* ... */
  }
  setFT(mag, phase, real, imag, paddedW, paddedH) {
    /* ... */
  }
  renderImage() {
    /* ... same ... */
  }
  renderFT() {
    /* ... same ... */
  }
  setRegion(percentage, type, show) {
    this.regionPercentage = percentage;
    this.regionType = type;
    this.showRegion = show;
    this.renderFT();
  }

  set onImageLoad(callback) {
    this._onImageLoad = callback;
  }
}
