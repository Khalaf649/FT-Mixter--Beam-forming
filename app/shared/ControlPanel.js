export class ControlPanel {
  constructor(layoutContainer, FTmixer) {
    this.FTmixer = FTmixer;
    this.layoutContainer = layoutContainer;
    this.currentMode = "component"; // 'component' or 'region'
    this.valueType = "real-imag"; // 'mag-phase' or 'real-imag'
    this.regionSize = 0.5; // percentage
    this.regionType = "inner"; // 'inner' or 'outer'
    this.selectedOutput = 1;
    this.isProcessing = false;
    this.loadedImageIndices = [
      { componentA: 0.25, componentB: 0.25 },
      { componentA: 0.25, componentB: 0.25 },
      { componentA: 0.25, componentB: 0.25 },
      { componentA: 0.25, componentB: 0.25 },
    ];
    // i want to add a attirbute for realimag mag/phase selection

    // i want anothe name

    this.render();
    this.bindEvents();
  }
  render() {
    this.layoutContainer.innerHTML = "";
    this.createLayout();
  }

  createLayout() {
    // Create control panel container
    const controlPanel = document.createElement("div");
    controlPanel.id = "control-panel";
    controlPanel.className = "control-panel mixer-controls-container";
    controlPanel.innerHTML = `
    <div class="mixer-mode-toggle">
      <button data-mode="component" 
        class="btn btn-sm flex-1 ${
          this.currentMode === "component" ? "btn-default" : "btn-secondary"
        }"
      >
        Component
      </button>
      <button data-mode="region"
        class="btn btn-sm flex-1 ${
          this.currentMode === "region" ? "btn-default" : "btn-secondary"
        }"
      >
        Region
      </button>
    </div>
    <div class="mixer-section-header">
    <h3 class="mixer-section-title">${
      this.currentMode === "component" ? "Components Mixer" : "Region Mixer"
    }</h3> 
<select class="select-trigger select-trigger-sm select-content select-scroll-btn" id="value-type-select">
          <option value="mag-phase" ${
            this.valueType === "mag-phase" ? "selected" : ""
          }>Mag/Phase</option>
          <option value="real-imag" ${
            this.valueType === "real-imag" ? "selected" : ""
          }>Real/Imag</option>
        </select>
    </div>
    
${
  this.currentMode === "region"
    ? `
        <div class="region-global-controls">
          <div class="region-slider-row">
            <div class="region-slider-header">
              <span class="region-slider-label">Size (all images)</span>
              <span class="region-value">${Math.round(
                this.regionSize * 100
              )}%</span>
            </div>
            <div class="slider-root">
              <div class="slider-track">
                <div class="slider-range" style="width: ${
                  this.regionSize * 100
                }%"></div>
              </div>
              <div class="slider-thumb" style="left: ${
                this.regionSize * 100
              }%"></div>
              <input
                type="range"
                class="slider-input"
                id="global-size-slider"
                value="${Math.round(this.regionSize * 100)}"
                min="10"
                max="100"
                step="5"
              >
            </div>
          </div>

          <div class="region-selector-row">
            <label class="region-selector-label">Region</label>
            <select id="global-region-select" class="select-trigger select-trigger-sm select-content select-scroll-btn">
              <option value="inner" ${
                this.regionType === "inner" ? "selected" : ""
              }>Inner</option>
              <option value="outer" ${
                this.regionType === "outer" ? "selected" : ""
              }>Outer</option>
            </select>
          </div>
        </div>
      `
    : ""
}
  
    ${
      this.loadedImageIndices.length > 0
        ? `<div id="weights-list" class="mixer-weights-list"> </div>`
        : ""
    }
    ${
      this.loadedImageIndices.length === 0
        ? `<p class="region-empty-text">Load image to configure mixer</p>`
        : ""
    }
  <div class="output-target-section">
  <h4 class="mixer-section-title">Output Target</h4>
  <div class="output-buttons">
    <button data-output="1" class="btn btn-sm flex-1 ${
      this.selectedOutput === 1 ? "btn-default" : "btn-secondary"
    }">
      Output 1
    </button>

    <button data-output="2" class="btn btn-sm flex-1 ${
      this.selectedOutput === 2 ? "btn-default" : "btn-secondary"
    }">
      Output 2
    </button>
  </div>
</div>


<div class="mix-action-section">
  ${
    this.isProcessing
      ? ""
      : '<button class="btn w-full gradient-primary text-primary-foreground"><i data-lucide="play"></i> Mix Images</button>'
  }
</div>

    </div>
  `;
    this.layoutContainer.appendChild(controlPanel);
    this.weightsList = controlPanel.querySelector("#weights-list");

    this.renderWeights();
  }

  renderWeights() {
    this.weightsList.innerHTML = this.loadedImageIndices
      .map(
        (w, idx) => `
      <div class="weight-slider-container">
        <div class="weight-slider-header">
          <span class="weight-slider-label">Image ${idx + 1}</span>
        </div>
<div class="weight-slider-grid">

  <div class="weight-slider-col">
    <div class="weight-slider-row">
      <span class="text-signal-cyan">${
        this.valueType === "mag-phase" ? "Magnitude" : "Real"
      }</span>
      <span class="weight-value">${(w.componentA * 100).toFixed(0)}%</span>
    </div>

    <div class="slider-root" data-type="magnitude" data-idx="${idx}">
      <div class="slider-track">
        <div class="slider-range" style="width: ${w.componentA * 100}%"></div>
      </div>
      <div class="slider-thumb" style="left: ${w.componentA * 100}%"></div>
      <input 
        type="range" 
        class="slider-input"
        value="${w.componentA * 100}"
        min="0"
        max="100"
        step="1"
      >
    </div>
  </div>

  <div class="weight-slider-col">
    <div class="weight-slider-row">
      <span class="text-signal-magenta">${
        this.valueType === "mag-phase" ? "Phase" : "Imaginary"
      }</span>
      <span class="weight-value">${(w.componentB * 100).toFixed(0)}%</span>
    </div>

    <div class="slider-root" data-type="phase" data-idx="${idx}">
      <div class="slider-track">
        <div class="slider-range" style="width: ${w.componentB * 100}%"></div>
      </div>
      <div class="slider-thumb" style="left: ${w.componentB * 100}%"></div>
      <input 
        type="range" 
        class="slider-input"
        value="${w.componentB * 100}"
        min="0"
        max="100"
        step="1"
      >
    </div>
  </div>

</div>

      </div>
    `
      )
      .join("");
  }

  bindEvents() {
    this.layoutContainer.addEventListener("click", (e) => {
      // Mode toggle
      const modeBtn = e.target.closest(".mixer-mode-toggle button");
      if (modeBtn) {
        this.currentMode = modeBtn.dataset.mode;
        this.render();
        return;
      }

      // Output buttons
      const outputBtn = e.target.closest(".output-buttons button");
      if (outputBtn) {
        this.selectedOutput = parseInt(outputBtn.dataset.output);
        this.render();
        this.FTmixer.setActivePort(this.selectedOutput - 1);

        return;
      }

      // Mix button
      const mixBtn = e.target.closest(".mix-action-section button");
      if (mixBtn) {
        // we create a config object to pass to the mixer
        const config = {
          mode: this.currentMode,
          valueType: this.valueType,
          regionSize: this.regionSize,
          regionType: this.regionType,
          weights: this.loadedImageIndices,
        };
        console.log("Mixing with config:", config);
        this.FTmixer.mix(config);
        return;
        // TODO: add event listener
      }
    });

    this.layoutContainer.addEventListener("change", (e) => {
      // Value type select
      if (e.target.id === "value-type-select") {
        this.valueType = e.target.value;
        this.render();
        return;
      }

      // Region select
      if (e.target.id === "global-region-select") {
        this.regionType = e.target.value;
        this.render();
        return;
      }
    });

    this.layoutContainer.addEventListener("input", (e) => {
      // Global region size slider
      if (e.target.id === "global-size-slider") {
        const value = parseInt(e.target.value);
        this.regionSize = value / 100;

        const sliderRoot = e.target.closest(".slider-root");
        sliderRoot.querySelector(".slider-range").style.width = `${value}%`;
        sliderRoot.querySelector(".slider-thumb").style.left = `${value}%`;
        sliderRoot
          .closest(".region-slider-row")
          .querySelector(".region-value").textContent = `${value}%`;

        return;
      }

      // Weight sliders
      if (e.target.classList.contains("slider-input")) {
        const input = e.target;
        const value = parseInt(input.value);
        const sliderRoot = input.closest(".slider-root");
        const idx = parseInt(sliderRoot.dataset.idx);
        const type = sliderRoot.dataset.type;

        sliderRoot.querySelector(".slider-range").style.width = `${value}%`;
        sliderRoot.querySelector(".slider-thumb").style.left = `${value}%`;

        sliderRoot
          .closest(".weight-slider-col")
          .querySelector(".weight-value").textContent = `${value}%`;

        if (type === "magnitude") {
          this.loadedImageIndices[idx].componentA = value / 100;
        } else {
          this.loadedImageIndices[idx].componentB = value / 100;
        }
      }
    });
  }
}
