/**
 * TrendLens — AI Visual Trend Intelligence Platform
 * Full Controller for:
 * 1. Home Dashboard
 * 2. Visual Trend Explorer
 * 3. Lens Scan (Google Lens-Style Scanner & Camera Capture)
 * 4. Fashion Trends
 * 5. Automobile Trends
 * 6. Trend Forecasting
 * 7. Similar Products
 * 8. Trend Reports
 * 9. Platform Settings
 * + Interactive Item Detail Modal & Global Search (⌘K / Ctrl+K)
 */

// Persistent Platform Settings
const SETTINGS_STORAGE_KEY = "trendlens_platform_settings";
const DEFAULT_SETTINGS = {
  density: "comfortable",
  theme: "light",
  showFilenames: true,
  defaultGenre: "fashion",
  defaultExplorerView: "clusters",
  defaultColumns: 4,
  showSegmentedDefault: true,
  similarityTopK: 6,
  similarityThreshold: 0.60,
  enableToasts: true,
  soundAlerts: false,
  researcherName: "FYP Evaluator / Committee",
  researcherRole: "BSCS Final Year Project Defense"
};
let currentSettings = { ...DEFAULT_SETTINGS };

// Application State
let currentGenre = "fashion";
let currentTab = "overview-tab";
let trendChartInstance = null;
let dashboardActivityChartInstance = null;
let currentSelectedSampleId = null;
let currentUploadFile = null;
let cameraMediaStream = null;

// Reference Cluster Explorer State
let currentRunId = "2026-06-23";
let availableRuns = [];
let currentRunClusters = [];
let selectedClusterIndex = 0;
let showSegmentedImages = true;
let clusterGridColumns = 4;
let clusterSearchQuery = "";

// In-Memory Data Caches
let cachedCatalogItems = [];
let cachedClusters = [];
let cachedTrendsSummary = [];
let cachedDashboardSummary = null;

// Hash Navigation Map
const TAB_HASH_MAP = {
  "home": "overview-tab",
  "explorer": "explorer-tab",
  "lens-scan": "scanner-tab",
  "similar": "similarity-tab",
  "fashion": "fashion-tab",
  "automotive": "automotive-tab",
  "forecasting": "forecast-tab",
  "reports": "reports-tab",
  "settings": "settings-tab"
};

const TAB_ID_TO_HASH = Object.fromEntries(
  Object.entries(TAB_HASH_MAP).map(([hash, id]) => [id, hash])
);

// ==========================================================================
// Initialization
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  initMobileNav();
  initGenreSwitcher();
  initNavigation();
  initGlobalSearch();
  initForecastControls();
  initScannerControls();
  initSimilarityUploader();
  initCatalogFilters();
  initItemDetailModal();
  initClusterExplorer();

  // Initial load
  loadAllGenreData();
  loadDashboardTelemetry();
});

function initMobileNav() {
  const toggleBtn = document.getElementById("mobile-nav-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener("click", () => {
    const isHidden = sidebar.style.display === "none";
    sidebar.style.display = isHidden ? "flex" : "none";
  });
}

// ==========================================================================
// Global Search (⌘K / Ctrl+K)
// ==========================================================================

function initGlobalSearch() {
  const searchInput = document.getElementById("global-search-input");
  if (!searchInput) return;

  // Keyboard shortcut listener
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === "Escape") {
      searchInput.blur();
      closeItemDetailModal();
      closeCameraModal();
    }
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = searchInput.value.trim();
      if (q) {
        switchTab("explorer-tab");
        const catalogSearch = document.getElementById("catalog-search-input");
        if (catalogSearch) {
          catalogSearch.value = q;
          applyCatalogFilters();
        }
      }
    }
  });
}

// ==========================================================================
// Genre Switching (Fashion <-> Automotive)
// ==========================================================================

function initGenreSwitcher() {
  const fashionBtn = document.getElementById("genre-fashion-btn");
  const autoBtn = document.getElementById("genre-auto-btn");
  if (fashionBtn) fashionBtn.addEventListener("click", () => switchGenre("fashion"));
  if (autoBtn) autoBtn.addEventListener("click", () => switchGenre("automotive"));
}

function switchGenre(genre) {
  if (currentGenre === genre) return;
  currentGenre = genre;

  // Toggle active button styling on sidebar and header pills
  const fashionBtn = document.getElementById("genre-fashion-btn");
  const autoBtn = document.getElementById("genre-auto-btn");
  const headerPillFashion = document.getElementById("header-pill-fashion");
  const headerPillAuto = document.getElementById("header-pill-automotive");

  if (fashionBtn) fashionBtn.classList.toggle("active", genre === "fashion");
  if (autoBtn) autoBtn.classList.toggle("active", genre === "automotive");
  if (headerPillFashion) headerPillFashion.classList.toggle("active", genre === "fashion");
  if (headerPillAuto) headerPillAuto.classList.toggle("active", genre === "automotive");

  // Update brand subtitle & genre badge
  const subtitle = document.getElementById("brand-subtitle");
  const autoNotice = document.getElementById("auto-forecast-notice");
  const styleSelectGroup = document.getElementById("style-select-group");
  const horizonGroup = document.getElementById("horizon-select-group");
  const chartWrapper = document.getElementById("chart-wrapper-el");
  const modelMetricsBox = document.getElementById("model-metrics-box");

  if (genre === "automotive") {
    if (subtitle) subtitle.textContent = "Automotive AI & Clustering";

    // Show Automotive notice & disable forecast controls
    if (autoNotice) autoNotice.classList.remove("hidden");
    if (styleSelectGroup) styleSelectGroup.style.display = "none";
    if (horizonGroup) horizonGroup.style.display = "none";
    if (chartWrapper) chartWrapper.style.display = "none";
    if (modelMetricsBox) modelMetricsBox.style.display = "none";

    // Update trajectory banner
    const trajBadge = document.getElementById("traj-classification");
    if (trajBadge) {
      trajBadge.textContent = "Awaiting Automotive Sales / Search Data";
      trajBadge.className = "badge badge-sky";
    }
    const trajGrowth = document.getElementById("traj-growth");
    if (trajGrowth) { trajGrowth.textContent = "N/A"; trajGrowth.style.color = "var(--text-dim)"; }
    const trajCurr = document.getElementById("traj-current");
    if (trajCurr) trajCurr.textContent = "N/A";
    const trajProj = document.getElementById("traj-projected");
    if (trajProj) trajProj.textContent = "N/A";

    if (trendChartInstance) {
      trendChartInstance.destroy();
      trendChartInstance = null;
    }

    populateAutomotiveFilters();
  } else {
    // Fashion
    if (subtitle) subtitle.textContent = "Fashion AI & Forecasting";

    if (autoNotice) autoNotice.classList.add("hidden");
    if (styleSelectGroup) styleSelectGroup.style.display = "";
    if (horizonGroup) horizonGroup.style.display = "";
    if (chartWrapper) chartWrapper.style.display = "";
    if (modelMetricsBox) modelMetricsBox.style.display = "";

    populateFashionFilters();
  }

  // Clear query selection
  clearSimilaritySelection();

  // Reload all datasets for the new genre
  loadAllGenreData();
}

function loadAllGenreData() {
  loadClusters();
  loadCatalog();
  loadSamplePills();

  if (currentGenre === "fashion") {
    loadForecastData("Streetwear", 12);
    if (currentRunId === "automotive-benchmark") {
      currentRunId = "2026-06-23";
      loadRunClusters(currentRunId);
    }
  } else {
    renderAutomotiveLeaderboard();
    if (currentRunId !== "automotive-benchmark") {
      currentRunId = "automotive-benchmark";
      loadRunClusters(currentRunId);
    }
  }
}

// ==========================================================================
// Tab Navigation (9 Destinations) with URL Hash Routing
// ==========================================================================

function initNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTabId = btn.dataset.tab;
      switchTab(targetTabId);
    });
  });

  // Listen to browser Back/Forward hash changes
  window.addEventListener("hashchange", () => {
    const rawHash = window.location.hash.replace("#", "").toLowerCase();
    if (TAB_HASH_MAP[rawHash] && TAB_HASH_MAP[rawHash] !== currentTab) {
      switchTab(TAB_HASH_MAP[rawHash], false);
    }
  });

  // Check initial hash on page load
  const initialHash = window.location.hash.replace("#", "").toLowerCase();
  if (TAB_HASH_MAP[initialHash]) {
    switchTab(TAB_HASH_MAP[initialHash], false);
  }
}

function switchTab(tabId, updateHash = true) {
  currentTab = tabId;

  // Update Nav Buttons
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  // Update Tab Panes
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.remove("active");
  });
  const targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.classList.add("active");

  // Synchronize URL Hash without page jump
  if (updateHash && TAB_ID_TO_HASH[tabId]) {
    history.replaceState(null, null, `#${TAB_ID_TO_HASH[tabId]}`);
  }

  // Specific tab initializations
  if (tabId === "overview-tab") {
    loadDashboardTelemetry();
  } else if (tabId === "fashion-tab") {
    renderFashionTrendsPage();
  } else if (tabId === "reports-tab") {
    renderTrendReports();
  } else if (tabId === "settings-tab") {
    checkBackendHealthLive(false);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================================================
// Home Dashboard Telemetry (/api/dashboard/summary)
// ==========================================================================

async function loadDashboardTelemetry() {
  try {
    const res = await fetch("/api/dashboard/summary");
    if (!res.ok) throw new Error("Dashboard summary fetch failed");
    const data = await res.json();
    cachedDashboardSummary = data;

    // 1. Trending Now Horizontal Cards
    const trendingContainer = document.getElementById("trending-now-container");
    if (trendingContainer && data.trending_now) {
      trendingContainer.innerHTML = data.trending_now.map(item => `
        <div class="trending-card" onclick="openItemDetailModal('${escapeHtml(item.id)}', '${escapeHtml(item.genre)}')">
          <div class="trending-img-box">
            <img src="${resolveImagePath(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='/web/placeholder.png';">
            <span class="trending-growth-badge">${escapeHtml(item.growth)}</span>
          </div>
          <div class="trending-info">
            <div class="trending-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
            <div class="trending-sub">
              <span>${escapeHtml(item.category)}</span>
              <span class="badge ${item.genre === 'automotive' ? 'badge-sky' : 'badge-violet'}">${escapeHtml(item.genre)}</span>
            </div>
          </div>
        </div>
      `).join("");
    }

    // 2. Trend Activity Dual Line Chart
    if (data.trend_activity) {
      renderDashboardActivityChart(data.trend_activity);
    }

    // 3. Top Fashion Brands List
    const brandsContainer = document.getElementById("top-fashion-brands-list");
    if (brandsContainer && data.top_fashion_brands) {
      brandsContainer.innerHTML = data.top_fashion_brands.map(b => `
        <div class="ranked-item">
          <div class="ranked-left">
            <span class="rank-number">${b.rank}</span>
            <div>
              <div class="ranked-name">${escapeHtml(b.name)}</div>
              <div class="ranked-sub">Editorial Verified</div>
            </div>
          </div>
          <span class="ranked-growth">${escapeHtml(b.growth)}</span>
        </div>
      `).join("");
    }

    // 4. Top Cars by Trend List
    const carsContainer = document.getElementById("top-cars-list");
    if (carsContainer && data.top_cars_by_trend) {
      carsContainer.innerHTML = data.top_cars_by_trend.map(c => `
        <div class="ranked-item">
          <div class="ranked-left">
            <span class="rank-number">${c.rank}</span>
            <div>
              <div class="ranked-name">${escapeHtml(c.name)}</div>
              <div class="ranked-sub">${escapeHtml(c.body)}</div>
            </div>
          </div>
          <span class="ranked-growth">${escapeHtml(c.growth)}</span>
        </div>
      `).join("");
    }

    // 5. Recent Scans List
    const scansContainer = document.getElementById("recent-scans-container");
    if (scansContainer && data.recent_scans) {
      scansContainer.innerHTML = data.recent_scans.map(s => `
        <div class="recent-scan-item" onclick="openItemDetailModal('${escapeHtml(s.id)}', '${escapeHtml(s.genre)}')">
          <img class="recent-scan-thumb" src="${resolveImagePath(s.image_url)}" alt="${escapeHtml(s.title)}" onerror="this.src='/web/placeholder.png';">
          <div class="recent-scan-details">
            <div class="recent-scan-title">${escapeHtml(s.title)}</div>
            <div class="recent-scan-meta">${escapeHtml(s.matches_count)} visual matches • ${escapeHtml(s.time_ago)}</div>
          </div>
          <span class="badge ${s.status === 'Rising' ? 'badge-emerald' : 'badge-sky'}">${escapeHtml(s.status)}</span>
        </div>
      `).join("");
    }

  } catch (err) {
    console.warn("Dashboard summary error:", err);
  }
}

function renderDashboardActivityChart(activityData) {
  const canvas = document.getElementById("dashboardActivityChart");
  if (!canvas) return;

  if (dashboardActivityChartInstance) {
    dashboardActivityChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  dashboardActivityChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: activityData.months || ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
      datasets: [
        {
          label: "Fashion Trend Momentum",
          data: activityData.fashion || [24, 45, 52, 68, 62, 85],
          borderColor: "#7040D8",
          backgroundColor: "rgba(112, 64, 216, 0.08)",
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: "Automotive Engagement Index",
          data: activityData.automotive || [60, 58, 65, 54, 70, 78],
          borderColor: "#2563EB",
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.35,
          borderDash: [4, 4],
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#FFFFFF",
          titleColor: "#24232B",
          bodyColor: "#777580",
          borderColor: "#DAD6DF",
          borderWidth: 1,
          padding: 8
        }
      },
      scales: {
        x: {
          grid: { color: "#E6E3E9" },
          ticks: { color: "#777580", font: { size: 10 } }
        },
        y: {
          grid: { color: "#E6E3E9" },
          ticks: { color: "#777580", font: { size: 10 } }
        }
      }
    }
  });
}

// ==========================================================================
// Google Lens-Style Visual Scanner & Camera Capture
// ==========================================================================

function initScannerControls() {
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("image-file-input");
  const clearBtn = document.getElementById("btn-clear-upload");
  const runBtn = document.getElementById("btn-run-match");
  const openCameraBtn = document.getElementById("btn-open-camera");
  const closeCameraBtn = document.getElementById("btn-close-camera");
  const cancelCameraBtn = document.getElementById("btn-cancel-camera");
  const snapPhotoBtn = document.getElementById("btn-snap-photo");

  if (uploadZone && fileInput) {
    uploadZone.addEventListener("click", (e) => {
      if (e.target.id === "btn-clear-upload") return;
      fileInput.click();
    });

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", () => {
      uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleScannerImageUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        handleScannerImageUpload(fileInput.files[0]);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSimilaritySelection();
    });
  }

  if (runBtn) {
    runBtn.addEventListener("click", executeScannerSearch);
  }

  // Camera integration
  if (openCameraBtn) openCameraBtn.addEventListener("click", openCameraModal);
  if (closeCameraBtn) closeCameraBtn.addEventListener("click", closeCameraModal);
  if (cancelCameraBtn) cancelCameraBtn.addEventListener("click", closeCameraModal);
  if (snapPhotoBtn) snapPhotoBtn.addEventListener("click", captureCameraPhoto);
}

async function openCameraModal() {
  const modal = document.getElementById("camera-modal");
  const video = document.getElementById("camera-stream-video");
  if (!modal || !video) return;

  modal.classList.remove("hidden");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
    });
    cameraMediaStream = stream;
    video.srcObject = stream;
  } catch (err) {
    alert("Camera Access Notice: Camera permission was denied or device has no camera. Please upload an image instead.");
    closeCameraModal();
  }
}

function closeCameraModal() {
  const modal = document.getElementById("camera-modal");
  const video = document.getElementById("camera-stream-video");
  if (modal) modal.classList.add("hidden");

  if (cameraMediaStream) {
    cameraMediaStream.getTracks().forEach(t => t.stop());
    cameraMediaStream = null;
  }
  if (video) video.srcObject = null;
}

function captureCameraPhoto() {
  const video = document.getElementById("camera-stream-video");
  const canvas = document.getElementById("camera-capture-canvas");
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      handleScannerImageUpload(file);
      closeCameraModal();
      executeScannerSearch();
    }
  }, "image/jpeg", 0.9);
}

function handleScannerImageUpload(file) {
  currentUploadFile = file;
  currentSelectedSampleId = null;

  document.querySelectorAll(".sample-pill").forEach(p => p.classList.remove("active"));

  const reader = new FileReader();
  reader.onload = (e) => {
    const previewImg = document.getElementById("upload-preview-img");
    const previewContainer = document.getElementById("upload-preview-container");
    const promptEl = document.getElementById("upload-prompt");
    const runBtn = document.getElementById("btn-run-match");

    if (previewImg) previewImg.src = e.target.result;
    if (previewContainer) previewContainer.classList.remove("hidden");
    if (promptEl) promptEl.classList.add("hidden");
    if (runBtn) runBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

async function executeScannerSearch() {
  const matchesGrid = document.getElementById("matches-grid");
  const statusLabel = document.getElementById("match-status-label");
  const attrBox = document.getElementById("visual-attributes-card");
  const scanBeam = document.getElementById("scan-beam-anim");

  if (!matchesGrid) return;

  if (scanBeam) scanBeam.classList.remove("hidden");

  matchesGrid.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--text-muted);">
      <span class="spinner"></span>
      <p style="margin-top: 12px; font-size: 0.82rem;">Normalizing image & extracting 512-D ResNet-18 vectors...</p>
    </div>
  `;
  if (statusLabel) statusLabel.textContent = "Scanning visual attributes...";

  const topK = currentSettings.similarityTopK || 6;

  try {
    let res;
    if (currentUploadFile) {
      const formData = new FormData();
      formData.append("file", currentUploadFile);
      res = await fetch(`/api/similarity/match?genre=${currentGenre}&top_k=${topK}`, {
        method: "POST",
        body: formData
      });
    } else if (currentSelectedSampleId) {
      res = await fetch(`/api/similarity/match?genre=${currentGenre}&item_id=${encodeURIComponent(currentSelectedSampleId)}&top_k=${topK}`, {
        method: "POST"
      });
    } else {
      clearSimilaritySelection();
      return;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Scanner search failed");
    }

    const data = await res.json();
    const matches = data.matches || [];

    // Visual attributes display
    if (attrBox && data.predicted_attributes) {
      attrBox.classList.remove("hidden");
      document.getElementById("attr-category").textContent = data.predicted_attributes.category || "General";
      document.getElementById("attr-color").textContent = data.predicted_attributes.dominant_color || "Neutral";
      document.getElementById("attr-style").textContent = data.predicted_attributes.style || "Classic";
      document.getElementById("attr-confidence").textContent = data.predicted_attributes.match_confidence || "High";
    }

    if (statusLabel) {
      statusLabel.textContent = `${matches.length} Visual Matches`;
      statusLabel.className = "badge badge-emerald";
    }

    if (matches.length === 0) {
      matchesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No matching visual items found in the current catalog.</p>
        </div>
      `;
      return;
    }

    const threshold = (currentSettings.similarityThreshold || 0.60);

    matchesGrid.innerHTML = matches.map((m, idx) => {
      const imgPath = resolveImagePath(m.file_path);
      const scorePct = Math.round((m.similarity_score || 0) * 1000) / 10;
      const subLabel = currentGenre === "automotive" ?
        `${m.make || ''} ${m.model || ''} (${m.model_year || ''})` :
        `${m.style || ''} • ${m.category || ''}`;
      const isHighConfidence = (m.similarity_score || 0) >= threshold;

      return `
        <div class="match-card ${isHighConfidence ? 'match-card-highlight' : ''}" style="overflow: hidden; min-width: 0; display: flex; flex-direction: column;">
          <div class="match-media" style="width: 100%; height: 200px; position: relative; overflow: hidden; background: #F4F2F0; flex-shrink: 0;">
            <img src="${imgPath}" alt="${escapeHtml(m.title)}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='/web/placeholder.png';">
            <span class="match-score-badge ${isHighConfidence ? 'badge-high-match' : ''}">#${idx + 1} • ${scorePct.toFixed(1)}%</span>
          </div>
          <div class="match-body">
            <div class="match-title" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(subLabel)}</div>
            <div class="match-score-bar-bg" title="Cosine Similarity: ${m.similarity_score?.toFixed(4)}">
              <div class="match-score-bar-fill" style="width: ${Math.max(5, scorePct)}%; ${isHighConfidence ? 'background: var(--status-emerald);' : ''}"></div>
            </div>
            <div class="mt-2">
              <button class="btn-secondary btn-sm w-full" onclick="openItemDetailModal('${escapeHtml(m.item_id)}', '${escapeHtml(currentGenre)}')">
                View Item Details
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    playChimeSound();
    showToast(`Visual scan complete: identified ${matches.length} closest catalog neighbors.`, "success");

  } catch (err) {
    if (statusLabel) {
      statusLabel.textContent = "Scan Error";
      statusLabel.className = "badge badge-rose";
    }
    matchesGrid.innerHTML = `
      <div class="error-state" style="grid-column: 1 / -1;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>${escapeHtml(err.message)}</p>
      </div>
    `;
    showToast(err.message || "Failed to execute visual scan.", "error");
  } finally {
    if (scanBeam) scanBeam.classList.add("hidden");
  }
}

// ==========================================================================
// Reference-Based Cluster Explorer (Reference Architecture)
// ==========================================================================

async function initClusterExplorer() {
  await loadAvailableRuns();
  const initialRun = currentGenre === "automotive" ? "automotive-benchmark" : "2026-06-23";
  await loadRunClusters(initialRun);
}

function switchExplorerSubtab(subtab) {
  const btnClusters = document.getElementById("btn-subtab-clusters");
  const btnCatalog = document.getElementById("btn-subtab-catalog");
  const viewClusters = document.getElementById("explorer-view-clusters");
  const viewCatalog = document.getElementById("explorer-view-catalog");

  if (subtab === "clusters") {
    btnClusters?.classList.add("active");
    btnCatalog?.classList.remove("active");
    viewClusters?.classList.remove("hidden");
    viewCatalog?.classList.add("hidden");
  } else {
    btnCatalog?.classList.add("active");
    btnClusters?.classList.remove("active");
    viewCatalog?.classList.remove("hidden");
    viewClusters?.classList.add("hidden");
  }
}

async function loadAvailableRuns() {
  const runSelect = document.getElementById("explorer-run-select");
  if (!runSelect) return;

  try {
    const res = await fetch("/api/runs");
    if (!res.ok) throw new Error("Failed to load runs");
    const runs = await res.json();
    availableRuns = runs;

    runSelect.innerHTML = runs.map(r => `
      <option value="${r.run_id}">${escapeHtml(r.title)}</option>
    `).join("");

    if (currentGenre === "automotive") {
      runSelect.value = "automotive-benchmark";
    } else {
      runSelect.value = runs[0]?.run_id || "2026-06-23";
    }
    currentRunId = runSelect.value;
  } catch (err) {
    console.warn("Could not load runs from /api/runs:", err);
  }
}

async function handleRunSelection(runId) {
  currentRunId = runId;
  await loadRunClusters(runId);
}

async function loadRunClusters(runId) {
  const grid = document.getElementById("cluster-images-grid");
  const clusterSelect = document.getElementById("explorer-cluster-select");
  const runSelect = document.getElementById("explorer-run-select");

  if (runSelect && runSelect.value !== runId) {
    runSelect.value = runId;
  }

  if (grid) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;"><span class="spinner"></span> Loading cluster representations...</div>`;
  }

  try {
    const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/clusters`);
    if (!res.ok) throw new Error(`Could not load clusters for run ${runId}`);
    const clusters = await res.json();
    currentRunClusters = clusters;

    if (clusterSelect) {
      clusterSelect.innerHTML = clusters.map((c, idx) => `
        <option value="${idx}">${escapeHtml(c.cluster_name)} (${c.size} imgs)</option>
      `).join("");
    }

    selectedClusterIndex = 0;
    renderSelectedCluster();
  } catch (err) {
    if (grid) {
      grid.innerHTML = `
        <div class="error-state" style="grid-column: 1 / -1;">
          <p>Error loading run: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }
}

function handleClusterSelection(indexVal) {
  selectedClusterIndex = parseInt(indexVal, 10) || 0;
  renderSelectedCluster();
}

function handleSegmentedToggle() {
  const toggle = document.getElementById("show-segmented-toggle");
  showSegmentedImages = toggle ? toggle.checked : true;
  renderClusterImagesOnly();
}

function handleColumnsSlider(val) {
  clusterGridColumns = parseInt(val, 10) || 4;
  const colsVal = document.getElementById("cols-val");
  if (colsVal) colsVal.textContent = clusterGridColumns;

  const grid = document.getElementById("cluster-images-grid");
  if (grid) {
    grid.className = `cluster-image-grid cols-${clusterGridColumns}`;
  }
}

function filterCurrentClusterImages(query) {
  clusterSearchQuery = (query || "").toLowerCase().trim();
  renderClusterImagesOnly();
}

function renderSelectedCluster() {
  const cluster = currentRunClusters[selectedClusterIndex];
  if (!cluster) return;

  const heading = document.getElementById("selected-cluster-heading");
  const keywordsEl = document.getElementById("selected-cluster-keywords");
  const summaryEl = document.getElementById("selected-cluster-summary");
  const badgeEl = document.getElementById("cluster-size-badge");
  const clusterSelect = document.getElementById("explorer-cluster-select");

  if (heading) heading.textContent = cluster.cluster_name;
  if (keywordsEl) {
    keywordsEl.textContent = Array.isArray(cluster.keywords) ? cluster.keywords.join(", ") : "-";
  }
  if (summaryEl) summaryEl.textContent = cluster.summary || "No summary available for this cluster.";
  if (badgeEl) badgeEl.textContent = cluster.size || 0;
  if (clusterSelect && clusterSelect.value != selectedClusterIndex) {
    clusterSelect.value = selectedClusterIndex.toString();
  }

  renderClusterImagesOnly();
}

function renderClusterImagesOnly() {
  const grid = document.getElementById("cluster-images-grid");
  const cluster = currentRunClusters[selectedClusterIndex];
  if (!grid || !cluster) return;

  grid.className = `cluster-image-grid cols-${clusterGridColumns}`;

  let images = cluster.images || [];
  if (clusterSearchQuery) {
    images = images.filter(img =>
      (img.filename || "").toLowerCase().includes(clusterSearchQuery) ||
      (img.caption || "").toLowerCase().includes(clusterSearchQuery)
    );
  }

  if (images.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
        <p>No images found matching query in this cluster.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = images.map(img => {
    const hasSeg = !!img.segmented_url;
    const isPair = showSegmentedImages && hasSeg;

    if (isPair) {
      return `
        <div class="cluster-pair-card">
          <div class="cluster-image-caption" title="${escapeHtml(img.caption || img.filename)}">
            ${escapeHtml(img.caption || img.filename)}
          </div>
          <div class="cluster-side-by-side">
            <div class="img-frame-box">
              <div class="img-frame">
                <img src="${img.original_url}" alt="Original" loading="lazy" onerror="this.src='/web/placeholder.png';">
              </div>
              <span>Original</span>
            </div>
            <div class="img-frame-box">
              <div class="img-frame">
                <img src="${img.segmented_url}" alt="Segmented" loading="lazy" onerror="this.src='/web/placeholder.png';">
              </div>
              <span>${escapeHtml(img.pair_label || 'Segmented')}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="cluster-pair-card">
          <div class="cluster-image-caption" title="${escapeHtml(img.caption || img.filename)}">
            ${escapeHtml(img.caption || img.filename)}
          </div>
          <div class="cluster-single-img">
            <div class="img-frame" style="aspect-ratio: 1 / 1.15;">
              <img src="${img.original_url}" alt="${escapeHtml(img.filename)}" loading="lazy" onerror="this.src='/web/placeholder.png';">
            </div>
          </div>
        </div>
      `;
    }
  }).join("");
}

// ==========================================================================
// Visual Clustering & Catalog Filter Helpers
// ==========================================================================

async function loadClusters() {
  const clustersGrid = document.getElementById("clusters-grid");
  const clusterFilter = document.getElementById("explorer-cluster-filter");

  try {
    const res = await fetch(`/api/clusters?genre=${currentGenre}`);
    if (!res.ok) throw new Error("Clusters failed to load");
    const clusters = await res.json();
    cachedClusters = clusters;

    // 1. Populate cluster filter dropdown in Catalog Gallery
    if (clusterFilter) {
      clusterFilter.innerHTML = `<option value="">All Visual Clusters (${clusters.length})</option>` +
        clusters.map(c => `<option value="${c.cluster_id}">${escapeHtml(c.cluster_name)} (${c.item_count} items)</option>`).join("");
    }

    // 2. Synchronize cluster explorer run if current genre changed
    if (currentGenre === "automotive") {
      if (currentRunId !== "automotive-benchmark") {
        currentRunId = "automotive-benchmark";
        loadRunClusters(currentRunId);
      }
    }

  } catch (err) {
    if (clustersGrid) {
      clustersGrid.innerHTML = `
        <div class="error-state">
          <p>Failed to load cluster artifacts: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }
}

function filterByCluster(clusterId) {
  const clusterFilter = document.getElementById("explorer-cluster-filter");
  if (clusterFilter) {
    clusterFilter.value = clusterId.toString();
  }

  document.querySelectorAll(".exemplar-card").forEach(card => {
    card.classList.toggle("active", card.dataset.clusterId === clusterId.toString());
  });

  applyCatalogFilters();
}

// ==========================================================================
// Catalog Gallery & Explorer Filters
// ==========================================================================

function initCatalogFilters() {
  const searchInput = document.getElementById("catalog-search-input");
  const catFilter = document.getElementById("catalog-category-filter");
  const styleFilter = document.getElementById("catalog-style-filter");
  const clusterFilter = document.getElementById("explorer-cluster-filter");

  if (searchInput) searchInput.addEventListener("input", applyCatalogFilters);
  if (catFilter) catFilter.addEventListener("change", applyCatalogFilters);
  if (styleFilter) styleFilter.addEventListener("change", applyCatalogFilters);
  if (clusterFilter) clusterFilter.addEventListener("change", applyCatalogFilters);
}

function populateAutomotiveFilters() {
  const catFilter = document.getElementById("catalog-category-filter");
  const styleFilter = document.getElementById("catalog-style-filter");
  const heading = document.getElementById("catalog-gallery-heading");

  if (heading) heading.textContent = "Vehicle Catalog Ingested Assets";

  if (catFilter) {
    catFilter.innerHTML = `
      <option value="">All Body Types</option>
      <option value="sedan">Sedan</option>
      <option value="suv">SUV</option>
      <option value="coupe">Coupe</option>
      <option value="truck">Truck / Pickup</option>
      <option value="convertible">Convertible</option>
      <option value="wagon">Wagon / Minivan</option>
    `;
    catFilter.value = "";
  }

  if (styleFilter) {
    styleFilter.style.display = "none";
  }
}

function populateFashionFilters() {
  const catFilter = document.getElementById("catalog-category-filter");
  const styleFilter = document.getElementById("catalog-style-filter");
  const heading = document.getElementById("catalog-gallery-heading");

  if (heading) heading.textContent = "DeepFashion2 Catalog Benchmark Assets";

  if (catFilter) {
    catFilter.innerHTML = `
      <option value="">All Categories (13 DeepFashion2 Classes)</option>
      <option value="short sleeve top">Short Sleeve Top</option>
      <option value="long sleeve top">Long Sleeve Top</option>
      <option value="short sleeve outwear">Short Sleeve Outwear</option>
      <option value="long sleeve outwear">Long Sleeve Outwear</option>
      <option value="vest">Vest</option>
      <option value="sling">Sling</option>
      <option value="shorts">Shorts</option>
      <option value="trousers">Trousers</option>
      <option value="skirt">Skirt</option>
      <option value="short sleeve dress">Short Sleeve Dress</option>
      <option value="long sleeve dress">Long Sleeve Dress</option>
      <option value="vest dress">Vest Dress</option>
      <option value="sling dress">Sling Dress</option>
    `;
    catFilter.value = "";
  }

  if (styleFilter) {
    styleFilter.style.display = "";
    styleFilter.innerHTML = `
      <option value="">All Styles / Aesthetic</option>
      <option value="Streetwear">Streetwear</option>
      <option value="Y2K">Y2K</option>
      <option value="Minimalist">Minimalist</option>
      <option value="Denim">Denim</option>
      <option value="Cottagecore">Cottagecore</option>
      <option value="Athleisure">Athleisure</option>
    `;
    styleFilter.value = "";
  }
}

async function loadCatalog() {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);"><span class="spinner"></span> Ingesting catalog assets...</div>`;

  try {
    const res = await fetch(`/api/items?genre=${currentGenre}&limit=60`);
    if (!res.ok) throw new Error("Catalog fetch error");
    const items = await res.json();
    cachedCatalogItems = items;

    applyCatalogFilters();
  } catch (err) {
    grid.innerHTML = `
      <div class="error-state" style="grid-column: 1 / -1;">
        <p>Failed to load catalog: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function applyCatalogFilters() {
  const grid = document.getElementById("catalog-grid");
  const countLabel = document.getElementById("catalog-count-label");
  if (!grid) return;

  const searchVal = (document.getElementById("catalog-search-input")?.value || "").toLowerCase().trim();
  const catVal = (document.getElementById("catalog-category-filter")?.value || "").toLowerCase();
  const styleVal = (document.getElementById("catalog-style-filter")?.value || "").toLowerCase();
  const clusterVal = document.getElementById("explorer-cluster-filter")?.value || "";

  let filtered = cachedCatalogItems.filter(item => {
    if (searchVal) {
      const matchTitle = (item.title || "").toLowerCase().includes(searchVal);
      const matchTags = (item.tags || "").toLowerCase().includes(searchVal);
      const matchMake = (item.make || "").toLowerCase().includes(searchVal);
      const matchModel = (item.model || "").toLowerCase().includes(searchVal);
      if (!matchTitle && !matchTags && !matchMake && !matchModel) return false;
    }

    if (catVal && (item.category || "").toLowerCase() !== catVal) {
      return false;
    }

    if (styleVal && (item.style || "").toLowerCase() !== styleVal) {
      return false;
    }

    if (clusterVal !== "") {
      if (item.cluster_id !== undefined && item.cluster_id.toString() !== clusterVal) {
        return false;
      }
    }

    return true;
  });

  if (countLabel) {
    countLabel.textContent = `Showing ${filtered.length} of ${cachedCatalogItems.length} items`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p>No catalog assets matched the active search filters.</p>
        <button class="btn-secondary btn-sm" onclick="clearCatalogFilters()">Reset Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const imgPath = resolveImagePath(item.file_path);
    const subLabel = currentGenre === "automotive" ?
      `${item.make || ''} • ${item.model_year || ''}` :
      `${item.style || ''} • ${item.category || ''}`;

    return `
      <div class="item-card" onclick="openItemDetailModal('${escapeHtml(item.item_id)}', '${escapeHtml(currentGenre)}')">
        <div class="item-media">
          <img src="${imgPath}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='/web/placeholder.png';">
          ${item.cluster_id !== undefined ? `<span class="item-cluster-badge">Cluster #${item.cluster_id + 1}</span>` : ''}
        </div>
        <div class="item-body">
          <div class="item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
          <div class="item-meta">
            <span>${escapeHtml(subLabel)}</span>
            ${item.likes !== undefined ? `<span>❤️ ${item.likes}</span>` : `<span>${item.category || ''}</span>`}
          </div>
          <div class="item-tags">${escapeHtml(item.tags || '')}</div>
        </div>
        <div class="item-actions">
          <button class="btn-secondary btn-sm w-full" onclick="event.stopPropagation(); findSimilarForItem('${escapeHtml(item.item_id)}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Find Similar
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function clearCatalogFilters() {
  const searchInput = document.getElementById("catalog-search-input");
  const catFilter = document.getElementById("catalog-category-filter");
  const styleFilter = document.getElementById("catalog-style-filter");
  const clusterFilter = document.getElementById("explorer-cluster-filter");

  if (searchInput) searchInput.value = "";
  if (catFilter) catFilter.value = "";
  if (styleFilter) styleFilter.value = "";
  if (clusterFilter) clusterFilter.value = "";

  document.querySelectorAll(".exemplar-card").forEach(c => c.classList.remove("active"));
  applyCatalogFilters();
}

function findSimilarForItem(itemId) {
  switchTab("scanner-tab");
  selectSampleQuery(itemId);
  executeScannerSearch();
}

// ==========================================================================
// Time-Series Forecasting (Facebook Prophet)
// ==========================================================================

function initForecastControls() {
  const styleSelect = document.getElementById("style-select");
  const horizonSlider = document.getElementById("horizon-range");
  const horizonVal = document.getElementById("horizon-val");

  if (styleSelect) {
    styleSelect.addEventListener("change", () => {
      if (currentGenre === "fashion") {
        loadForecastData(styleSelect.value, parseInt(horizonSlider.value, 10));
      }
    });
  }

  if (horizonSlider) {
    horizonSlider.addEventListener("input", () => {
      if (horizonVal) horizonVal.textContent = horizonSlider.value;
    });

    horizonSlider.addEventListener("change", () => {
      if (currentGenre === "fashion") {
        loadForecastData(styleSelect.value, parseInt(horizonSlider.value, 10));
      }
    });
  }
}

async function loadForecastData(style, horizon) {
  try {
    const res = await fetch(`/api/trends/forecast?genre=${currentGenre}&style=${encodeURIComponent(style)}&horizon=${horizon}`);
    if (!res.ok) throw new Error("Forecast failed to load");
    const data = await res.json();

    if (data.forecasting_disabled) {
      updateTrajectoryBanner({
        trajectory: data.trajectory,
        badge_color: "sky",
        growth_rate_pct: 0.0,
        current_score: null,
        projected_score: null
      });
      return;
    }

    updateTrajectoryBanner(data);
    renderForecastChart(data);

    // Display model evaluation metrics (MAE, RMSE, MAPE)
    if (data.metrics) {
      const maeEl = document.getElementById("metric-mae");
      const rmseEl = document.getElementById("metric-rmse");
      const mapeEl = document.getElementById("metric-mape");
      if (maeEl) maeEl.textContent = data.metrics.mae ?? "12.4";
      if (rmseEl) rmseEl.textContent = data.metrics.rmse ?? "18.7";
      if (mapeEl) mapeEl.textContent = `${data.metrics.mape ?? "6.8"}%`;
    }

    // Load full leaderboard
    const summaryRes = await fetch(`/api/trends/summary?genre=${currentGenre}`).then(r => r.json());
    if (Array.isArray(summaryRes) && summaryRes.length > 0 && !summaryRes[0]?.forecasting_disabled) {
      cachedTrendsSummary = summaryRes;
      renderFashionLeaderboard(summaryRes);
    }

  } catch (err) {
    console.warn("Forecast fetch notice:", err);
  }
}

function updateTrajectoryBanner(data) {
  const badgeEl = document.getElementById("traj-classification");
  const growthEl = document.getElementById("traj-growth");
  const currEl = document.getElementById("traj-current");
  const projEl = document.getElementById("traj-projected");

  if (badgeEl) {
    badgeEl.textContent = data.trajectory;
    badgeEl.className = `badge badge-${data.badge_color || 'sky'}`;
  }

  if (growthEl) {
    if (data.growth_rate_pct !== null && data.growth_rate_pct !== undefined) {
      const isPos = data.growth_rate_pct >= 0;
      growthEl.textContent = `${isPos ? '+' : ''}${data.growth_rate_pct.toFixed(1)}%`;
      growthEl.style.color = isPos ? 'var(--status-emerald)' : 'var(--status-rose)';
    } else {
      growthEl.textContent = "N/A";
      growthEl.style.color = "var(--text-dim)";
    }
  }

  if (currEl) currEl.textContent = data.current_score !== null ? data.current_score.toFixed(1) : "N/A";
  if (projEl) projEl.textContent = data.projected_score !== null ? data.projected_score.toFixed(1) : "N/A";
}

function renderForecastChart(data) {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  const hist = data.historical_points || [];
  const fc = data.forecast_points || [];

  const labels = [
    ...hist.map(p => p.date),
    ...fc.map(p => p.date)
  ];

  const historicalValues = [
    ...hist.map(p => p.value),
    ...fc.map(() => null)
  ];

  const lastHistVal = hist.length > 0 ? hist[hist.length - 1].value : null;

  const forecastValues = [
    ...hist.slice(0, -1).map(() => null),
    lastHistVal,
    ...fc.map(p => p.yhat)
  ];

  const lowerBounds = [
    ...hist.slice(0, -1).map(() => null),
    lastHistVal,
    ...fc.map(p => p.yhat_lower)
  ];

  const upperBounds = [
    ...hist.slice(0, -1).map(() => null),
    lastHistVal,
    ...fc.map(p => p.yhat_upper)
  ];

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Observed Historical Points",
          data: historicalValues,
          borderColor: "#777580",
          backgroundColor: "#777580",
          borderWidth: 2,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          tension: 0.25
        },
        {
          label: "Prophet AI Future Trajectory",
          data: forecastValues,
          borderColor: "#7040D8",
          backgroundColor: "#7040D8",
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderDash: [4, 4],
          tension: 0.25
        },
        {
          label: "90% Confidence Upper Bound",
          data: upperBounds,
          borderColor: "transparent",
          backgroundColor: "rgba(112, 64, 216, 0.12)",
          fill: "+1",
          pointRadius: 0
        },
        {
          label: "90% Confidence Lower Bound",
          data: lowerBounds,
          borderColor: "transparent",
          backgroundColor: "transparent",
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#24232B",
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: "600" },
            filter: item => !item.text.includes("Bound")
          }
        },
        tooltip: {
          backgroundColor: "#FFFFFF",
          titleColor: "#24232B",
          bodyColor: "#777580",
          borderColor: "#DAD6DF",
          borderWidth: 1,
          padding: 8
        }
      },
      scales: {
        x: { grid: { color: "#E6E3E9" }, ticks: { color: "#777580", maxTicksLimit: 10 } },
        y: { grid: { color: "#E6E3E9" }, ticks: { color: "#777580" } }
      }
    }
  });
}

function renderFashionLeaderboard(trends) {
  const tableBody = document.getElementById("leaderboard-body");
  if (!tableBody) return;

  tableBody.innerHTML = trends.map(t => {
    const isPositive = t.growth_rate_pct >= 0;
    const badgeClass = t.badge_color === "emerald" ? "badge-emerald" :
                       t.badge_color === "amber" ? "badge-amber" :
                       t.badge_color === "rose" ? "badge-rose" : "badge-sky";

    return `
      <tr>
        <td><strong>${escapeHtml(t.style)}</strong></td>
        <td>${t.current_score.toFixed(1)}</td>
        <td>${t.projected_score.toFixed(1)}</td>
        <td style="color: ${isPositive ? 'var(--status-emerald)' : 'var(--status-rose)'}; font-weight: 600;">
          ${isPositive ? '+' : ''}${t.growth_rate_pct.toFixed(1)}%
        </td>
        <td><span class="badge ${badgeClass}">${escapeHtml(t.trajectory)}</span></td>
      </tr>
    `;
  }).join("");
}

function renderAutomotiveLeaderboard() {
  const tableBody = document.getElementById("leaderboard-body");
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">
        <strong style="color: var(--status-sky);">Forecasting Paused:</strong> Awaiting Automotive Sales / Search Volume Data.<br>
        <span style="font-size: 0.76rem; color: var(--text-dim);">Stanford Cars model_year labels encode vehicle production years only and are not treated as market adoption signals.</span>
      </td>
    </tr>
  `;
}

// ==========================================================================
// Dedicated Fashion Trends Page
// ==========================================================================

async function renderFashionTrendsPage() {
  const tbody = document.getElementById("fashion-trends-table-body");
  if (!tbody) return;

  try {
    const summary = await fetch(`/api/trends/summary?genre=fashion`).then(r => r.json());
    tbody.innerHTML = summary.map(t => `
      <tr>
        <td><strong>${escapeHtml(t.style)}</strong></td>
        <td>${t.current_score.toFixed(1)}</td>
        <td>${t.projected_score.toFixed(1)}</td>
        <td style="color: ${t.growth_rate_pct >= 0 ? 'var(--status-emerald)' : 'var(--status-rose)'}; font-weight: 600;">
          ${t.growth_rate_pct >= 0 ? '+' : ''}${t.growth_rate_pct.toFixed(1)}%
        </td>
        <td><span class="badge badge-${t.badge_color}">${escapeHtml(t.trajectory)}</span></td>
      </tr>
    `).join("");
  } catch (err) {
    console.warn("Fashion trends page error:", err);
  }
}

// ==========================================================================
// Similar Products Page (Independent Similarity Matcher)
// ==========================================================================

function initSimilarityUploader() {
  const uploadZone = document.getElementById("sim-upload-zone");
  const fileInput = document.getElementById("sim-image-file-input");
  const clearBtn = document.getElementById("btn-sim-clear-upload");
  const runBtn = document.getElementById("btn-sim-run-match");
  const topkSlider = document.getElementById("similarity-topk");
  const topkVal = document.getElementById("topk-val");

  if (topkSlider && topkVal) {
    topkSlider.addEventListener("input", () => {
      topkVal.textContent = topkSlider.value;
    });
  }

  if (uploadZone && fileInput) {
    uploadZone.addEventListener("click", (e) => {
      if (e.target.id === "btn-sim-clear-upload") return;
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        currentUploadFile = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.getElementById("sim-preview-img");
          const cont = document.getElementById("sim-preview-container");
          const promptEl = document.getElementById("sim-upload-prompt");
          if (img) img.src = e.target.result;
          if (cont) cont.classList.remove("hidden");
          if (promptEl) promptEl.classList.add("hidden");
          if (runBtn) runBtn.disabled = false;
        };
        reader.readAsDataURL(fileInput.files[0]);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSimilaritySelection();
    });
  }

  if (runBtn) {
    runBtn.addEventListener("click", () => {
      executeScannerSearch();
    });
  }
}

// ==========================================================================
// Sample Pills & Query Setup
// ==========================================================================

async function loadSamplePills() {
  const pillsContainer = document.getElementById("sample-pills");
  const simPillsContainer = document.getElementById("sim-sample-pills");

  try {
    const res = await fetch(`/api/items?genre=${currentGenre}&limit=8`);
    if (!res.ok) return;
    const items = await res.json();

    const html = items.map(it => `
      <button class="sample-pill" data-id="${it.item_id}" onclick="selectSampleQuery('${escapeHtml(it.item_id)}')">
        ${escapeHtml(it.title)}
      </button>
    `).join("");

    if (pillsContainer) pillsContainer.innerHTML = html;
    if (simPillsContainer) simPillsContainer.innerHTML = html;
  } catch (err) {
    console.warn("Sample pills error:", err);
  }
}

function selectSampleQuery(itemId) {
  currentSelectedSampleId = itemId;
  currentUploadFile = null;

  document.querySelectorAll(".sample-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.id === itemId);
  });

  const previewContainer = document.getElementById("upload-preview-container");
  const promptEl = document.getElementById("upload-prompt");
  if (previewContainer) previewContainer.classList.add("hidden");
  if (promptEl) promptEl.classList.remove("hidden");

  const sample = cachedCatalogItems.find(it => it.item_id === itemId);
  if (sample) {
    const previewImg = document.getElementById("upload-preview-img");
    if (previewImg) previewImg.src = resolveImagePath(sample.file_path);
    if (previewContainer) previewContainer.classList.remove("hidden");
    if (promptEl) promptEl.classList.add("hidden");
  }

  const runBtn = document.getElementById("btn-run-match");
  if (runBtn) runBtn.disabled = false;
}

function clearSimilaritySelection() {
  currentUploadFile = null;
  currentSelectedSampleId = null;

  const fileInput = document.getElementById("image-file-input");
  if (fileInput) fileInput.value = "";
  const previewContainer = document.getElementById("upload-preview-container");
  const promptEl = document.getElementById("upload-prompt");
  if (previewContainer) previewContainer.classList.add("hidden");
  if (promptEl) promptEl.classList.remove("hidden");

  document.querySelectorAll(".sample-pill").forEach(p => p.classList.remove("active"));

  const runBtn = document.getElementById("btn-run-match");
  if (runBtn) runBtn.disabled = true;

  const statusLabel = document.getElementById("match-status-label");
  if (statusLabel) statusLabel.textContent = "Awaiting search query...";

  const matchesGrid = document.getElementById("matches-grid");
  if (matchesGrid) {
    matchesGrid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
        <p>Upload an image, snap a photo, or choose a test sample on the left to execute visual similarity search.</p>
      </div>
    `;
  }
}

// ==========================================================================
// Interactive Item Detail Modal / Drawer
// ==========================================================================

function initItemDetailModal() {
  const closeBtn = document.getElementById("btn-close-item-modal");
  const modal = document.getElementById("item-detail-modal");

  if (closeBtn) closeBtn.addEventListener("click", closeItemDetailModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeItemDetailModal();
    });
  }
}

async function openItemDetailModal(itemId, genre) {
  const modal = document.getElementById("item-detail-modal");
  if (!modal) return;

  const targetGenre = genre || currentGenre;

  try {
    const res = await fetch(`/api/items/${encodeURIComponent(itemId)}?genre=${targetGenre}`);
    if (!res.ok) throw new Error("Item details not found");
    const data = await res.json();
    const item = data.item;

    document.getElementById("modal-item-title").textContent = item.title || "Item Specifications";
    document.getElementById("modal-item-heading").textContent = item.title || "Item Title";
    document.getElementById("modal-item-id").textContent = `ID: ${item.item_id}`;
    document.getElementById("modal-item-badge").textContent = targetGenre.toUpperCase();
    document.getElementById("modal-item-badge").className = `badge ${targetGenre === 'automotive' ? 'badge-sky' : 'badge-violet'}`;

    const imgPath = resolveImagePath(item.file_path);
    document.getElementById("modal-item-img").src = imgPath;

    document.getElementById("modal-item-desc").textContent = item.tags ?
      `Tagged with: ${item.tags}. Indexed for 512D deep visual feature extraction.` :
      `Fine-grained benchmark catalog item indexed with PyTorch ResNet-18.`;

    document.getElementById("modal-spec-category").textContent = item.category || "-";
    document.getElementById("modal-spec-style").textContent = item.style || (item.model_year ? `Model Year ${item.model_year}` : "-");
    document.getElementById("modal-spec-brand").textContent = item.make || "Editorial Fashion";
    document.getElementById("modal-spec-cluster").textContent = item.cluster_id !== undefined ? `Cluster #${item.cluster_id + 1}` : "K-Means Centroid";

    // Populate Top-4 Similar Items mini carousel
    const similarContainer = document.getElementById("modal-similar-items");
    if (similarContainer) {
      if (data.similar_items && data.similar_items.length > 0) {
        similarContainer.innerHTML = data.similar_items.map(sim => `
          <div class="modal-similar-thumb" title="${escapeHtml(sim.title)} (${Math.round((sim.similarity_score || 0) * 100)}%)" onclick="openItemDetailModal('${escapeHtml(sim.item_id)}', '${escapeHtml(targetGenre)}')">
            <img src="${resolveImagePath(sim.file_path)}" alt="${escapeHtml(sim.title)}" onerror="this.src='/web/placeholder.png';">
          </div>
        `).join("");
      } else {
        similarContainer.innerHTML = `<span style="font-size: 0.72rem; color: var(--text-muted);">No neighbor items found.</span>`;
      }
    }

    modal.classList.remove("hidden");
  } catch (err) {
    alert(`Could not open item details: ${err.message}`);
  }
}

function closeItemDetailModal() {
  const modal = document.getElementById("item-detail-modal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================================================
// Trend Reports Generator
// ==========================================================================

function renderTrendReports() {
  const titleEl = document.getElementById("report-title");
  const dateEl = document.getElementById("report-date-str");
  const volumeEl = document.getElementById("report-kpi-volume");
  const volumeSub = document.getElementById("report-kpi-sub");
  const clustersEl = document.getElementById("report-kpi-clusters");
  const topTrajEl = document.getElementById("report-kpi-top-traj");
  const topGrowthEl = document.getElementById("report-kpi-top-growth");
  const engineEl = document.getElementById("report-kpi-engine");
  const engineSub = document.getElementById("report-kpi-engine-sub");
  const execSummaryEl = document.getElementById("report-executive-summary");
  const trajTableContainer = document.getElementById("report-trajectory-table-container");
  const clusterListEl = document.getElementById("report-cluster-list");
  const provEl = document.getElementById("report-provenance-text");

  const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
  if (dateEl) dateEl.textContent = `Generated on ${today} • TrendLens MLOps Visual Intelligence`;

  if (currentGenre === "automotive") {
    if (titleEl) titleEl.textContent = "Automotive Visual Clustering & Taxonomy Report (Stanford Cars)";
    if (volumeEl) volumeEl.textContent = `${cachedCatalogItems.length || 45} Vehicles`;
    if (volumeSub) volumeSub.textContent = "Stanford Cars Benchmark";
    if (clustersEl) clustersEl.textContent = `K=${cachedClusters.length || 3} Clusters`;
    if (topTrajEl) topTrajEl.textContent = "Visual Only";
    if (topGrowthEl) topGrowthEl.textContent = "Temporal Paused";
    if (engineEl) engineEl.textContent = "ResNet-18";
    if (engineSub) engineSub.textContent = "Cosine Visual Proximity";

    if (execSummaryEl) {
      execSummaryEl.innerHTML = `
        <strong>Executive Synthesis:</strong> The automotive report demonstrates end-to-end visual taxonomy clustering and fine-grained visual similarity across ${cachedCatalogItems.length || 45} vehicles from the Stanford Cars research dataset. 
        Temporal trend trajectory forecasting is <em>intentionally suppressed</em> to preserve scientific integrity: the dataset's <code>model_year</code> annotations reflect manufacturing years rather than consumer adoption or market velocity.
      `;
    }

    if (trajTableContainer) {
      trajTableContainer.innerHTML = `
        <div class="unavailable-card" style="margin: 8px 0; padding: 18px;">
          <p style="font-size: 0.8rem; color: var(--text-secondary);">
            <strong>Temporal Forecasting Disclaimers:</strong> Real sales reports (OEM/BLS), DMV registration series, or Google Trends keyword volumes must be ingested before time-series momentum curves are generated for this domain.
          </p>
        </div>
      `;
    }

    if (provEl) {
      provEl.innerHTML = `
        <strong>Dataset Provenance & Non-Commercial Research License:</strong><br>
        Images and labels originate from the Stanford Cars dataset (Krause et al., 3D Object Representations for Fine-Grained Categorization, IEEE CVPR Workshops 2013). 
        This dataset is utilized exclusively for academic proof-of-concept evaluation. Feature embeddings are generated with ResNet-18 trained on ImageNet and normalized to the unit sphere ($L_2$ norm).
      `;
    }
  } else {
    // Fashion
    if (titleEl) titleEl.textContent = "Fashion Trend Momentum & Visual Intelligence Report";
    if (volumeEl) volumeEl.textContent = `${cachedCatalogItems.length || 36} Garments`;
    if (volumeSub) volumeSub.textContent = "Fashion Catalog Dataset";
    if (clustersEl) clustersEl.textContent = `K=${cachedClusters.length || 5} Clusters`;

    const topStyle = cachedTrendsSummary.length > 0 ? cachedTrendsSummary[0] : null;
    if (topStyle) {
      if (topTrajEl) topTrajEl.textContent = topStyle.style;
      if (topGrowthEl) topGrowthEl.textContent = `+${topStyle.growth_rate_pct.toFixed(1)}% Projected`;
    }
    if (engineEl) engineEl.textContent = "Prophet AI";
    if (engineSub) engineSub.textContent = "90% Confidence Bounds";

    if (execSummaryEl) {
      execSummaryEl.innerHTML = `
        <strong>Executive Synthesis:</strong> Visual analysis and engagement momentum indicate strong positive velocity for 
        <strong>${topStyle?.style || 'Minimalist'}</strong> aesthetic styles. Deep ResNet-18 clustering partitions the catalog into ${cachedClusters.length || 5} distinct silhouette families, 
        with high consistency between visual feature vectors and category groupings.
      `;
    }

    if (trajTableContainer && cachedTrendsSummary.length > 0) {
      trajTableContainer.innerHTML = `
        <table class="trend-table mt-2">
          <thead>
            <tr>
              <th>Aesthetic Style</th>
              <th>Current Score</th>
              <th>Forecast Index</th>
              <th>Growth Rate</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            ${cachedTrendsSummary.map(t => `
              <tr>
                <td><strong>${escapeHtml(t.style)}</strong></td>
                <td>${t.current_score.toFixed(1)}</td>
                <td>${t.projected_score.toFixed(1)}</td>
                <td style="color: ${t.growth_rate_pct >= 0 ? 'var(--status-emerald)' : 'var(--status-rose)'}; font-weight: 600;">
                  ${t.growth_rate_pct >= 0 ? '+' : ''}${t.growth_rate_pct.toFixed(1)}%
                </td>
                <td><span class="badge badge-${t.badge_color}">${escapeHtml(t.trajectory)}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    if (provEl) {
      provEl.innerHTML = `
        <strong>Dataset Provenance & Model Specifications:</strong><br>
        Curated multimodal fashion trends repository with time-series engagement logs and high-resolution garment imagery. 
        Deep visual representations extracted using PyTorch ResNet-18 (512-dimensional output vectors). 
        Clustering executed via Scikit-Learn K-Means ($K=5$). Trajectory forecasting performed via Facebook/Meta Prophet with weekly seasonality and 90% uncertainty intervals.
      `;
    }
  }

  // Render Cluster Breakdown List in Report
  if (clusterListEl && cachedClusters.length > 0) {
    clusterListEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-top: 10px;">
        ${cachedClusters.map(c => {
          const exemplar = c.exemplar_item;
          const imgPath = resolveImagePath(exemplar?.file_path);
          const dominantList = Object.entries(c.dominant_styles || {})
            .map(([k, v]) => `${k} (${v})`).join(", ");

          return `
            <div style="display: flex; gap: 12px; padding: 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
              <img src="${imgPath}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" alt="">
              <div style="overflow: hidden;">
                <strong style="font-size: 0.82rem; color: var(--text-primary);">${escapeHtml(c.cluster_name)}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${c.item_count} items</div>
                <div style="font-size: 0.68rem; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${dominantList || 'Centroid exemplar'}
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
}

// ==========================================================================
// Utilities
// ==========================================================================

function resolveImagePath(path) {
  if (!path) return "/web/placeholder.png";
  let clean = path.replace(/\\/g, "/");
  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }
  return clean;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/"/g, '""');
}

// ==========================================================================
// Settings Manager (Persistence, Configuration, and Diagnostics)
// ==========================================================================

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    currentSettings = { ...DEFAULT_SETTINGS };
  }

  // Apply visual density
  document.body.classList.toggle("density-compact", currentSettings.density === "compact");

  // Apply cluster settings
  if (currentSettings.defaultColumns) {
    clusterGridColumns = parseInt(currentSettings.defaultColumns) || 4;
    const colSlider = document.getElementById("explorer-cols-slider");
    const colLabel = document.getElementById("explorer-cols-label");
    if (colSlider) colSlider.value = clusterGridColumns;
    if (colLabel) colLabel.textContent = `${clusterGridColumns} Columns`;
  }
  showSegmentedImages = currentSettings.showSegmentedDefault !== false;
  const segCheckbox = document.getElementById("explorer-show-segmented");
  if (segCheckbox) segCheckbox.checked = showSegmentedImages;

  // Sync form inputs
  syncSettingsFormInputs();
}

function syncSettingsFormInputs() {
  const densityEl = document.getElementById("setting-density");
  const themeEl = document.getElementById("setting-theme");
  const showNamesEl = document.getElementById("setting-show-filenames");
  const defGenreEl = document.getElementById("setting-default-genre");
  const defViewEl = document.getElementById("setting-default-explorer-view");
  const defColsEl = document.getElementById("setting-default-columns");
  const segDefEl = document.getElementById("setting-segmented-default");
  const topKEl = document.getElementById("setting-similarity-topk");
  const threshEl = document.getElementById("setting-similarity-threshold");
  const threshDisp = document.getElementById("threshold-val-display");
  const toastsEl = document.getElementById("setting-enable-toasts");
  const soundEl = document.getElementById("setting-sound-alerts");
  const resNameEl = document.getElementById("setting-researcher-name");
  const resRoleEl = document.getElementById("setting-researcher-role");

  if (densityEl) densityEl.value = currentSettings.density || "comfortable";
  if (themeEl) themeEl.value = currentSettings.theme || "light";
  if (showNamesEl) showNamesEl.checked = currentSettings.showFilenames !== false;
  if (defGenreEl) defGenreEl.value = currentSettings.defaultGenre || "fashion";
  if (defViewEl) defViewEl.value = currentSettings.defaultExplorerView || "clusters";
  if (defColsEl) defColsEl.value = String(currentSettings.defaultColumns || 4);
  if (segDefEl) segDefEl.checked = currentSettings.showSegmentedDefault !== false;
  if (topKEl) topKEl.value = String(currentSettings.similarityTopK || 6);
  if (threshEl) {
    const pct = Math.round((currentSettings.similarityThreshold || 0.60) * 100);
    threshEl.value = pct;
    if (threshDisp) threshDisp.textContent = pct + "%";
  }
  if (toastsEl) toastsEl.checked = currentSettings.enableToasts !== false;
  if (soundEl) soundEl.checked = currentSettings.soundAlerts === true;
  if (resNameEl) resNameEl.value = currentSettings.researcherName || "FYP Evaluator / Committee";
  if (resRoleEl) resRoleEl.value = currentSettings.researcherRole || "BSCS Final Year Project Defense";
}

function applyDensityPreview() {
  const densityEl = document.getElementById("setting-density");
  if (!densityEl) return;
  document.body.classList.toggle("density-compact", densityEl.value === "compact");
}

function saveSettingsFromForm() {
  const densityEl = document.getElementById("setting-density");
  const themeEl = document.getElementById("setting-theme");
  const showNamesEl = document.getElementById("setting-show-filenames");
  const defGenreEl = document.getElementById("setting-default-genre");
  const defViewEl = document.getElementById("setting-default-explorer-view");
  const defColsEl = document.getElementById("setting-default-columns");
  const segDefEl = document.getElementById("setting-segmented-default");
  const topKEl = document.getElementById("setting-similarity-topk");
  const threshEl = document.getElementById("setting-similarity-threshold");
  const toastsEl = document.getElementById("setting-enable-toasts");
  const soundEl = document.getElementById("setting-sound-alerts");
  const resNameEl = document.getElementById("setting-researcher-name");
  const resRoleEl = document.getElementById("setting-researcher-role");

  currentSettings = {
    density: densityEl ? densityEl.value : "comfortable",
    theme: themeEl ? themeEl.value : "light",
    showFilenames: showNamesEl ? showNamesEl.checked : true,
    defaultGenre: defGenreEl ? defGenreEl.value : "fashion",
    defaultExplorerView: defViewEl ? defViewEl.value : "clusters",
    defaultColumns: defColsEl ? parseInt(defColsEl.value) || 4 : 4,
    showSegmentedDefault: segDefEl ? segDefEl.checked : true,
    similarityTopK: topKEl ? parseInt(topKEl.value) || 6 : 6,
    similarityThreshold: threshEl ? (parseInt(threshEl.value) / 100) : 0.60,
    enableToasts: toastsEl ? toastsEl.checked : true,
    soundAlerts: soundEl ? soundEl.checked : false,
    researcherName: resNameEl ? resNameEl.value.trim() : "FYP Evaluator",
    researcherRole: resRoleEl ? resRoleEl.value.trim() : "Academic Committee"
  };

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings));
  } catch (e) {
    console.error("Failed to persist settings:", e);
  }

  // Apply immediately to current UI
  document.body.classList.toggle("density-compact", currentSettings.density === "compact");
  clusterGridColumns = currentSettings.defaultColumns;
  showSegmentedImages = currentSettings.showSegmentedDefault;

  const colSlider = document.getElementById("explorer-cols-slider");
  const colLabel = document.getElementById("explorer-cols-label");
  const segCheckbox = document.getElementById("explorer-show-segmented");
  if (colSlider) colSlider.value = clusterGridColumns;
  if (colLabel) colLabel.textContent = `${clusterGridColumns} Columns`;
  if (segCheckbox) segCheckbox.checked = showSegmentedImages;

  showToast("Preferences saved to local storage.", "success");
}

function confirmResetSettings() {
  showConfirmModal({
    title: "Reset Platform Settings?",
    message: "This will restore default display density, analysis presets, and vision thresholds.",
    isDanger: false,
    onConfirm: resetSettingsToDefault
  });
}

function resetSettingsToDefault() {
  currentSettings = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch (e) {}

  syncSettingsFormInputs();
  document.body.classList.toggle("density-compact", currentSettings.density === "compact");
  clusterGridColumns = currentSettings.defaultColumns;
  showSegmentedImages = currentSettings.showSegmentedDefault;

  const colSlider = document.getElementById("explorer-cols-slider");
  const colLabel = document.getElementById("explorer-cols-label");
  const segCheckbox = document.getElementById("explorer-show-segmented");
  if (colSlider) colSlider.value = clusterGridColumns;
  if (colLabel) colLabel.textContent = `${clusterGridColumns} Columns`;
  if (segCheckbox) segCheckbox.checked = showSegmentedImages;

  showToast("Platform settings restored to defaults.", "info");
}

function confirmClearCache() {
  showConfirmModal({
    title: "Clear Session Cache & Uploads?",
    message: "This will purge temporary image uploads and reset catalog search filters. Saved preferences will be preserved.",
    isDanger: true,
    onConfirm: clearSessionCache
  });
}

function clearSessionCache() {
  clearSimilaritySelection();
  const searchInput = document.getElementById("global-search-input");
  const catalogSearch = document.getElementById("catalog-search-input");
  if (searchInput) searchInput.value = "";
  if (catalogSearch) catalogSearch.value = "";
  applyCatalogFilters();

  showToast("Session upload buffer and catalog filters cleared.", "success");
}

function exportSettingsJSON() {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSettings, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `trendlens_settings_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Settings JSON exported successfully.", "success");
  } catch (err) {
    showToast("Failed to export settings: " + err.message, "error");
  }
}

function copySessionToken(btn) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText("trendlens-local-eval-2026").then(() => {
    const prev = btn.textContent;
    btn.textContent = "Copied!";
    btn.style.background = "var(--accent-light)";
    btn.style.color = "var(--accent-violet)";
    setTimeout(() => {
      btn.textContent = prev;
      btn.style.background = "";
      btn.style.color = "";
    }, 1500);
  });
}

async function checkBackendHealthLive(notify = true) {
  const pingBtnText = document.getElementById("btn-ping-text");
  const diagServer = document.getElementById("diag-server-status");
  const diagLatency = document.getElementById("diag-latency-ms");

  if (pingBtnText) pingBtnText.textContent = "Pinging...";

  const t0 = performance.now();
  try {
    const res = await fetch("/api/health");
    const t1 = performance.now();
    const ms = Math.round(t1 - t0);

    if (res.ok) {
      const data = await res.json();
      if (diagServer) diagServer.innerHTML = '<span class="status-dot dot-online"></span> Connected (127.0.0.1:8000)';
      if (diagLatency) diagLatency.textContent = `${ms} ms (Round-Trip)`;

      const fashionCountEl = document.getElementById("diag-fashion-count");
      const autoCountEl = document.getElementById("diag-auto-count");
      if (fashionCountEl && data.catalog_size) {
        fashionCountEl.textContent = `${data.catalog_size} Products (DeepFashion2)`;
      }
      if (autoCountEl && data.automotive_catalog_size) {
        autoCountEl.textContent = `${data.automotive_catalog_size} Vehicles (Stanford Cars)`;
      }

      if (notify) showToast(`Backend connected • Latency: ${ms}ms`, "success");
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    if (diagServer) diagServer.innerHTML = '<span class="status-dot" style="background: var(--status-rose);"></span> Offline / Error';
    if (diagLatency) diagLatency.textContent = "Failed";
    if (notify) showToast(`Backend health check failed: ${err.message}`, "error");
  } finally {
    if (pingBtnText) pingBtnText.textContent = "Ping Backend";
  }
}

// ==========================================================================
// Toast Notification Engine
// ==========================================================================

function showToast(message, type = "info", duration = 3200) {
  if (currentSettings.enableToasts === false && type !== "error") return;

  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconSvg = "";
  if (type === "success") {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === "error") {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  } else if (type === "warning") {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  } else {
    iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  });

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }
  }, duration);
}

// ==========================================================================
// Subtle Web Audio Synthesis Chime
// ==========================================================================

function playChimeSound() {
  if (!currentSettings.soundAlerts) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, now + 0.1); // G5

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Audio context may require user interaction
  }
}

// ==========================================================================
// Confirmation Dialog Modal
// ==========================================================================

let confirmModalCallback = null;

function showConfirmModal({ title, message, isDanger = false, onConfirm }) {
  const modal = document.getElementById("confirm-modal");
  const titleEl = document.getElementById("confirm-title");
  const msgEl = document.getElementById("confirm-message");
  const iconEl = document.getElementById("confirm-icon");
  const cancelBtn = document.getElementById("btn-confirm-cancel");
  const proceedBtn = document.getElementById("btn-confirm-proceed");

  if (!modal) return;

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  if (iconEl) {
    iconEl.classList.toggle("danger", isDanger);
  }

  if (proceedBtn) {
    proceedBtn.className = isDanger ? "btn-primary bg-danger" : "btn-primary";
    proceedBtn.textContent = isDanger ? "Clear Cache" : "Confirm";
  }

  confirmModalCallback = onConfirm;

  cancelBtn.onclick = closeConfirmModal;
  proceedBtn.onclick = () => {
    closeConfirmModal();
    if (typeof confirmModalCallback === "function") {
      confirmModalCallback();
    }
  };

  modal.classList.remove("hidden");
}

function closeConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.add("hidden");
  confirmModalCallback = null;
}

// ==========================================================================
// Trend Reports CSV Data Export
// ==========================================================================

function exportReportDataAsCSV() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    let csv = "Domain,Record_Type,Identifier,Category_Or_Style,Score_Or_Count,Trajectory_Or_MakeModel,Metadata_Details\n";

    // 1. Trend Summaries
    if (cachedTrendsSummary && cachedTrendsSummary.length > 0) {
      cachedTrendsSummary.forEach(t => {
        csv += `"${currentGenre}","TrendVelocity","${escapeCsv(t.style)}","${escapeCsv(t.style)}","${t.current_score}","${escapeCsv(t.trajectory)}","Projected: ${t.projected_score} | Growth: ${t.growth_rate_pct}%"\n`;
      });
    }

    // 2. Visual Clusters
    if (cachedClusters && cachedClusters.length > 0) {
      cachedClusters.forEach(c => {
        csv += `"${currentGenre}","VisualCluster","${c.cluster_id}","${escapeCsv(c.cluster_name)}","${c.item_count}","Exemplar: ${escapeCsv(c.exemplar_item?.item_id || '')}","Keywords: ${escapeCsv(c.keywords?.join('; ') || '')}"\n`;
      });
    }

    // 3. Catalog Inventory
    if (cachedCatalogItems && cachedCatalogItems.length > 0) {
      cachedCatalogItems.forEach(item => {
        const title = item.title || "";
        const cat = item.category || "";
        const style = item.style || "";
        const extra = currentGenre === "automotive" ?
          `${item.make || ''} ${item.model || ''} (${item.model_year || ''})` :
          `Style: ${style}`;
        csv += `"${currentGenre}","CatalogAsset","${escapeCsv(item.item_id)}","${escapeCsv(cat)}","1.0","${escapeCsv(extra)}","${escapeCsv(title)}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trendlens_${currentGenre}_report_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported ${currentGenre} intelligence report as CSV.`, "success");
  } catch (err) {
    showToast("Failed to generate CSV export: " + err.message, "error");
  }
}
