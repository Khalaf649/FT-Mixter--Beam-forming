// shared/Viewport.js
import {
  applyBrightnessContrast,
  toGrayscale,
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
    this.selected = !isInput && selected;

    this.onImageLoad = null;
    this.createHTML(container);
    this.setupEvents();
  }

  createHTML(container) {
    const viewport = document.createElement("div");
    viewport.className = `viewport animate-fade-in viewport-container ${
      !this.isInput ? "cursor-pointer transition-all" : ""
    } ${this.selected && "output-viewport-selected"}`;

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

    container.appendChild(viewport);

    // Cache elements
    this.element = viewport;
    this.imageCanvas = viewport.querySelector(".image-canvas");
    this.ftCanvas = viewport.querySelector(".ft-canvas");
    this.fileInput = viewport.querySelector(".input-hidden");
    this.select = viewport.querySelector("select");
    this.dataLabel = viewport.querySelector(".data-label");
    this.bcOverlay = viewport.querySelectorAll(".viewport-bc-overlay")[0];
    this.ftBcOverlay = viewport.querySelectorAll(".viewport-bc-overlay")[1];
    this.canvasArea = viewport.querySelectorAll(".viewport-canvas-area")[0];
    this.ftCanvasArea = viewport.querySelectorAll(".viewport-canvas-area")[1];
    this.emptyText = viewport.querySelector(".viewport-empty-text");
    this.ftEmptyText = viewport.querySelector(".viewport-empty-text-sm");
  }

  setupEvents() {
    if (this.isInput) {
      this.canvasArea.addEventListener("dblclick", () =>
        this.fileInput.click()
      );
      this.fileInput.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file && this.onImageLoad) this.onImageLoad(this.id, file);
        e.target.value = "";
      });
    }

    this.select.addEventListener("change", (e) => {
      this.ftComponent = e.target.value;
      this.renderFT();
    });

    // Image canvas: brightness/contrast
    this.setupDrag(this.canvasArea, (b, c) => {
      this.brightness = b;
      this.contrast = c;
      this.bcOverlay.textContent = `B:${b.toFixed(0)} C:${c.toFixed(0)}`;
      this.renderImage();
    });

    // FT canvas: brightness/contrast
    this.setupDrag(this.ftCanvasArea, (b, c) => {
      this.ftBrightness = b;
      this.ftContrast = c;
      this.ftBcOverlay.textContent = `B:${b.toFixed(0)} C:${c.toFixed(0)}`;
      this.renderFT();
    });
  }

  setupDrag(area, callback) {
    let isDragging = false;
    let startX, startY, startB, startC;

    area.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startB =
        callback === this.renderImage ? this.brightness : this.ftBrightness;
      startC = callback === this.renderImage ? this.contrast : this.ftContrast;
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const b = Math.max(-100, Math.min(100, startB - dy * 0.5));
      const c = Math.max(-100, Math.min(100, startC + dx * 0.5));
      callback(b, c);
    });

    document.addEventListener("mouseup", () => (isDragging = false));
    area.addEventListener("mouseleave", () => (isDragging = false));
  }

  setImage(grayscaleData, width, height, displayW, displayH) {
    this.grayscale = grayscaleData;
    this.width = width;
    this.height = height;
    this.displayWidth = displayW;
    this.displayHeight = displayH;
    this.dataLabel.textContent = `${displayW}×${displayH}`;
    if (this.emptyText) this.emptyText.style.display = "none";
    this.renderImage();
  }

  setFT(mag, phase, real, imag, paddedW, paddedH) {
    this.ftMagnitude = mag;
    this.ftPhase = phase;
    this.ftReal = real;
    this.ftImaginary = imag;
    this.paddedWidth = paddedW;
    this.paddedHeight = paddedH;
    if (this.ftEmptyText) this.ftEmptyText.style.display = "none";
    this.renderFT();
  }

  renderImage() {
    if (!this.grayscale || !this.imageCanvas) return;
    const ctx = this.imageCanvas.getContext("2d");
    this.imageCanvas.width = this.displayWidth;
    this.imageCanvas.height = this.displayHeight;
    const adjusted = applyBrightnessContrast(
      this.grayscale,
      this.brightness,
      this.contrast
    );
    const imageData = grayscaleToImageData(adjusted, this.width, this.height);
    ctx.putImageData(imageData, 0, 0);
  }

  renderFT() {
    if (!this.ftCanvas || !this.ftMagnitude) return;
    let data = null;
    let useLog = true;
    switch (this.ftComponent) {
      case "magnitude":
        data = this.ftMagnitude;
        break;
      case "phase":
        data = this.ftPhase;
        useLog = false;
        break;
      case "real":
        data = this.ftReal;
        useLog = false;
        break;
      case "imaginary":
        data = this.ftImaginary;
        useLog = false;
        break;
    }

    const ctx = this.ftCanvas.getContext("2d");
    this.ftCanvas.width = this.displayWidth;
    this.ftCanvas.height = this.displayHeight;

    const normalized = normalizeForDisplay(data, useLog);
    const adjusted = applyBrightnessContrast(
      normalized,
      this.ftBrightness,
      this.ftContrast
    );
    const imageData = grayscaleToImageData(
      adjusted,
      this.paddedWidth,
      this.paddedHeight
    );
    ctx.putImageData(imageData, 0, 0);

    // Region overlay — EXACT same as your React
    if (this.showRegion && this.regionPercentage > 0) {
      const rw = (this.paddedWidth * this.regionPercentage) / 100;
      const rh = (this.paddedHeight * this.regionPercentage) / 100;
      const sx = (this.paddedWidth - rw) / 2;
      const sy = (this.paddedHeight - rh) / 2;

      ctx.fillStyle =
        this.regionType === "inner"
          ? "rgba(0, 200, 255, 0.3)"
          : "rgba(255, 100, 200, 0.3)";

      if (this.regionType === "inner") {
        ctx.fillRect(sx, sy, rw, rh);
      } else {
        ctx.fillRect(0, 0, this.paddedWidth, this.paddedHeight);
        ctx.clearRect(sx, sy, rw, rh);
      }

      ctx.strokeStyle =
        this.regionType === "inner"
          ? "hsl(190, 95%, 55%)"
          : "hsl(300, 80%, 60%)";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, rw, rh);
    }
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
// i want to add a method to set it as selected or not
