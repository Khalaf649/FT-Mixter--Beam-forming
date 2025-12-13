import { Viewport } from "./shared/Viewport.js";
import { ControlPanel } from "./shared/ControlPanel.js";
import { WorkerManager } from "./shared/WorkerManager.js";
import { Mixer } from "./shared/Mixer.js";
import { toGrayscale } from "./shared/utils/imageProcessing.js";
// import computeFFT from "./shared/utils/computeFFT.js";
export class FTMixer {
  constructor() {
    this.content = document.getElementById("ft-content"); // parent component exsists in html
    this.inputs = [];
    this.outputs = [];
    this.workerManager = new WorkerManager();
    this.mixer = new Mixer(this.workerManager, this);
    this.controlPanel = null;
    this.selectedOutput = 0; // Default to first output

    this.createLayout();
    this.createViewports();
    this.createControlPanel();
  }

  createLayout() {
    this.content.innerHTML = "";
    // Create main layout container
    const layout = document.createElement("div");
    layout.id = "ft-mixer-layout";
    layout.className = "ft-mixer-layout";

    // Create grid for input viewport
    const grid = document.createElement("div");
    grid.id = "ft-mixer-grid";
    grid.className = "ft-mixer-grid";

    // Create sidebar for controls
    const sidebar = document.createElement("div");
    sidebar.id = "ft-mixer-sidebar";
    sidebar.className = "ft-mixer-sidebar";

    // Create output column for output viewport
    const outputColumn = document.createElement("div");
    outputColumn.id = "ft-mixer-output-column";
    outputColumn.className = "ft-mixer-output-column";

    // Assemble layout
    layout.appendChild(grid);
    layout.appendChild(sidebar);
    layout.appendChild(outputColumn);

    // Append to document or container
    this.content.appendChild(layout);
  }

  hide() {
    this.content.style.display = "none";
    this.mixer.cancel(); // Cancel any running mix
  }

  show() {
    this.content.style.display = "block";
  }
  updateOutput(result, targetIndex) {
    const output = this.outputs[targetIndex];
    output.setImage(
      result.image,
      result.width,
      result.height,
      result.displayW,
      result.displayH
    );
    output.setFT(
      result.mag,
      result.phase,
      result.real,
      result.imag,
      result.paddedW,
      result.paddedH
    );
  }
  unifyAllSizes() {
    let minSize = Infinity;
    this.inputs.forEach((vp) => {
      if (vp.width > 0)
        minSize = Math.min(minSize, Math.min(vp.width, vp.height));
    });
    if (minSize === Infinity) return;

    [...this.inputs, ...this.outputs].forEach((vp) => vp.resize(minSize));
  }
  mix(config) {
    this.mixer.mix(config, this.inputs, config.targetOutput);
  }
  createViewports() {
    const inputGrid = document.getElementById("ft-mixer-grid");
    const outputColumn = document.getElementById("ft-mixer-output-column");

    // 4 Input Viewports
    for (let i = 0; i < 4; i++) {
      const vp = new Viewport(inputGrid, i, `Image ${i + 1}`, true);
      vp.onImageLoad = (id, file) => this.handleImageLoad(id, file);
      this.inputs.push(vp);
    }
    ``;
    // 2 Output Viewports
    for (let i = 0; i < 2; i++) {
      const vp = new Viewport(outputColumn, i, `Output ${i + 1}`, false);
      this.outputs.push(vp);
    }
    this.updateActivePort();
  }

  createControlPanel() {
    const sidebar = document.getElementById("ft-mixer-sidebar");
    this.controlPanel = new ControlPanel(sidebar, this);
  }
  handleImageLoad(id, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Convert to grayscale + compute FT in utils
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // This will be in utils/imageProcessing.js
        const grayscale = toGrayscale(imageData);
        const { mag, phase, real, imag } = computeFFT(grayscale);

        const size = Math.min(img.width, img.height);
        this.inputs[id].setImage(grayscale, img.width, img.height, size, size);
        this.inputs[id].setFT(mag, phase, real, imag, size, size);

        this.unifyAllSizes(); // Required by task
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  setActivePort(index) {
    this.selectedOutput = index;
    this.updateActivePort();
  }

  updateActivePort() {
    this.outputs[this.selectedOutput].setSelected(true);
    this.outputs[1 - this.selectedOutput].setSelected(false);
  }
}
