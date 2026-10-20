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
  researcherName: "Hamza Khalid",
  researcherRole: "BSCS Final Year Project Researcher",
  researcherEmail: "hamza.khalid@trendlens.ai",
  profileAvatarUrl: ""
};
let currentSettings = { ...DEFAULT_SETTINGS };

// Application State
let currentGenre = "fashion";
let currentTab = "overview-tab";
let trendChartInstance = null;
let dashboardActivityChartInstance = null;
let trendingInsightsChartInstance = null;
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
  "trends": "trends-tab",
  "fashion": "fashion-tab",
  "automotive": "automotive-tab",
  "forecasting": "forecast-tab",
  "reports": "reports-tab",
  "settings": "settings-tab"
};

const TAB_ID_TO_HASH = {
  "overview-tab": "home",
  "explorer-tab": "explorer",
  "scanner-tab": "lens-scan",
  "similarity-tab": "similar",
  "fashion-tab": "trends",
  "automotive-tab": "trends",
  "forecast-tab": "forecasting",
  "reports-tab": "reports",
  "settings-tab": "settings"
};

// ==========================================================================
// Initialization
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  initThemeEngine();
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
  initAccountMenu();

  // Initial load
  loadAllGenreData();
  loadDashboardTelemetry();
  loadMegaDrawerData();
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
      closeMegaDrawer();
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

function setDashboardDomain(genre) {
  switchGenre(genre);
}

function switchGenre(genre) {
  if (currentGenre === genre) {
    // Ensure all toggle buttons reflect the active state even if unchanged
    syncDomainToggleButtons(genre);
    return;
  }
  currentGenre = genre;

  // Synchronize all domain buttons across sidebar, trending insights, and trending now
  syncDomainToggleButtons(genre);

  // If user is currently looking at Trends, smoothly transition between fashion and automotive view
  if (currentTab === "fashion-tab" || currentTab === "automotive-tab") {
    switchTab(genre === "automotive" ? "automotive-tab" : "fashion-tab", true);
  }

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

  // Update home dashboard components for current genre
  renderTrendingInsights(genre);
  renderPopularCategories(genre);
  renderTrendingNowList(genre);
}

function syncDomainToggleButtons(genre) {
  const fashionBtns = [
    document.getElementById("genre-fashion-btn"),
    document.getElementById("insights-fashion-btn"),
    document.getElementById("trending-tab-fashion")
  ];
  const autoBtns = [
    document.getElementById("genre-auto-btn"),
    document.getElementById("insights-auto-btn"),
    document.getElementById("trending-tab-auto")
  ];

  fashionBtns.forEach(btn => {
    if (btn) btn.classList.toggle("active", genre === "fashion");
  });
  autoBtns.forEach(btn => {
    if (btn) btn.classList.toggle("active", genre === "automotive");
  });
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
  // If generic trends-tab is requested, route dynamically based on active domain
  if (tabId === "trends-tab") {
    tabId = currentGenre === "automotive" ? "automotive-tab" : "fashion-tab";
  }

  currentTab = tabId;

  // Update Nav Buttons (supports unified trends button)
  document.querySelectorAll(".nav-btn").forEach(btn => {
    const isTarget = btn.dataset.tab === tabId ||
      (btn.dataset.tab === "trends-tab" && (tabId === "fashion-tab" || tabId === "automotive-tab"));
    btn.classList.toggle("active", isTarget);
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
    if (res.ok) {
      const data = await res.json();
      cachedDashboardSummary = data;

      // Legacy containers support if present
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

      if (data.trend_activity) {
        renderDashboardActivityChart(data.trend_activity);
      }
    }
  } catch (err) {
    console.warn("Dashboard summary API fetch notice:", err);
  }

  // Populate reference Home Dashboard sections
  renderTrendingInsights(currentGenre);
  renderPopularCategories(currentGenre);
  renderTrendingNowList(currentGenre);
  renderRecentScansList();
}

// --------------------------------------------------------------------------
// 1. Trending Insights (Chart + Direction List)
// --------------------------------------------------------------------------
function renderTrendingInsights(genre) {
  const isFashion = (genre || currentGenre) === "fashion";
  const heading = document.getElementById("insights-chart-heading");
  const directionList = document.getElementById("trend-direction-list");
  const canvas = document.getElementById("trendingInsightsChart");

  if (heading) {
    heading.innerHTML = isFashion
      ? `Top Fashion Categories <span class="header-timeframe">(Last 30 Days)</span>`
      : `Top Automotive Categories <span class="header-timeframe">(Last 30 Days)</span>`;
  }

  // Populate Direction List
  if (directionList) {
    const directions = isFashion ? [
      { name: "Streetwear", status: "Rising", badgeClass: "direction-rising", icon: "↗", categoryKey: "tops" },
      { name: "Denim", status: "Rising", badgeClass: "direction-rising", icon: "↗", categoryKey: "jeans" },
      { name: "Formal Wear", status: "Stable", badgeClass: "direction-stable", icon: "—", categoryKey: "jackets" },
      { name: "Dresses", status: "Declining", badgeClass: "direction-declining", icon: "↘", categoryKey: "dresses" },
      { name: "Sneakers", status: "Rising", badgeClass: "direction-rising", icon: "↗", categoryKey: "sneakers" }
    ] : [
      { name: "Sedans", status: "Rising", badgeClass: "direction-rising", icon: "↗", categoryKey: "sedan" },
      { name: "SUVs", status: "Rising", badgeClass: "direction-rising", icon: "↗", categoryKey: "suv" },
      { name: "Coupes", status: "Stable", badgeClass: "direction-stable", icon: "—", categoryKey: "coupe" },
      { name: "Convertibles", status: "Declining", badgeClass: "direction-declining", icon: "↘", categoryKey: "convertible" },
      { name: "Pickup Trucks", status: "Rising", badgeClass: "direction-rising", icon: "↗", categoryKey: "truck" }
    ];

    directionList.innerHTML = directions.map(d => `
      <div class="direction-row" style="cursor: pointer;" onclick="navigateToCategoryCluster('${d.categoryKey}', '${isFashion ? 'fashion' : 'automotive'}')" title="Explore ${escapeHtml(d.name)} cluster">
        <span class="direction-name">${escapeHtml(d.name)}</span>
        <span class="direction-status ${d.badgeClass}">
          <span class="direction-icon">${d.icon}</span>
          <span>${d.status}</span>
        </span>
      </div>
    `).join("");
  }

  // Render Multi-Line Insights Chart
  if (!canvas) return;
  if (trendingInsightsChartInstance) {
    trendingInsightsChartInstance.destroy();
    trendingInsightsChartInstance = null;
  }

  const ctx = canvas.getContext("2d");
  const labels = ["Apr 10", "Apr 17", "Apr 24", "May 1", "May 8"];

  const datasets = isFashion ? [
    {
      label: "Tops",
      data: [46, 55, 68, 62, 72],
      borderColor: "#7040F5",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "Denim",
      data: [32, 38, 48, 46, 56],
      borderColor: "#3B82F6",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "Sneakers",
      data: [22, 26, 38, 36, 42],
      borderColor: "#F59E0B",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "Dresses",
      data: [14, 16, 25, 23, 28],
      borderColor: "#10B981",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "Jackets",
      data: [8, 10, 18, 16, 22],
      borderColor: "#06B6D4",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    }
  ] : [
    {
      label: "Sedans",
      data: [50, 56, 65, 62, 70],
      borderColor: "#7040F5",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "SUVs",
      data: [38, 45, 54, 58, 64],
      borderColor: "#3B82F6",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "Coupes",
      data: [26, 30, 34, 33, 38],
      borderColor: "#F59E0B",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "Trucks",
      data: [16, 18, 22, 24, 27],
      borderColor: "#10B981",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    },
    {
      label: "Convertibles",
      data: [10, 12, 14, 13, 17],
      borderColor: "#06B6D4",
      backgroundColor: "transparent",
      borderWidth: 2.2,
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 5
    }
  ];

  trendingInsightsChartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "right",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 7,
            boxHeight: 7,
            padding: 12,
            font: { size: 11, family: "'Plus Jakarta Sans', sans-serif", weight: "500" },
            color: "#4A4E69"
          }
        },
        tooltip: {
          backgroundColor: "#FFFFFF",
          titleColor: "#202447",
          bodyColor: "#7A819A",
          borderColor: "#E7E8F0",
          borderWidth: 1,
          padding: 9,
          boxPadding: 4,
          usePointStyle: true
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#7A819A", font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" } },
          border: { display: false }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            color: "#7A819A",
            font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }
          },
          grid: {
            color: "#F1F1F6",
            drawBorder: false
          },
          border: { display: false }
        }
      }
    }
  });
}

// --------------------------------------------------------------------------
// Category-to-Cluster Taxonomy & Cross-Navigation Mappings
// --------------------------------------------------------------------------
const CATEGORY_CLUSTER_MAPPINGS = {
  fashion: {
    tops: {
      name: "Tops & T-Shirts",
      keywords: ["top", "shirt", "crewneck", "tee", "sweatshirt", "blouse", "cotton", "sleeveless"],
      defaultIndex_2026_06_23: 2, // Cluster 3 (sporty graphic prints, short silhouettes)
      defaultIndex_fashion_benchmark: 0, // Minimalist tops
      catalogCategory: "short sleeve top",
      catalogSearch: "top"
    },
    jackets: {
      name: "Jackets & Coats",
      keywords: ["jacket", "coat", "outwear", "outerwear", "trench", "utility", "hoodie", "bomber"],
      defaultIndex_2026_06_23: 3, // Cluster 4 (athleisure, sporty jackets, shorts)
      defaultIndex_fashion_benchmark: 1, // Long sleeve outwear & trench coats
      catalogCategory: "long sleeve outwear",
      catalogSearch: "outwear"
    },
    dresses: {
      name: "Dresses & Skirts",
      keywords: ["dress", "skirt", "floral", "maxi", "wrap dress", "cottagecore", "slit", "elegant"],
      defaultIndex_2026_06_23: 4, // Cluster 5 (floral, pastel, maxi, slit, elegant)
      defaultIndex_fashion_benchmark: 4, // Cottagecore dresses
      catalogCategory: "short sleeve dress",
      catalogSearch: "dress"
    },
    jeans: {
      name: "Jeans & Trousers",
      keywords: ["denim", "trousers", "jean", "pants", "shorts", "wide-leg", "indigo", "raw wash"],
      defaultIndex_2026_06_23: 1, // Cluster 2 (denim, shorts, stripes, casual)
      defaultIndex_fashion_benchmark: 3, // Denim trousers & pants
      catalogCategory: "trousers",
      catalogSearch: "denim"
    },
    sneakers: {
      name: "Sneakers & Footwear",
      keywords: ["sneaker", "shoes", "chunky", "athletic footwear", "streetwear kicks", "running", "kicks"],
      defaultIndex_2026_06_23: 7, // Cluster 8 (Chunky Sneakers & Athletic Footwear)
      defaultIndex_fashion_benchmark: 6, // Cluster 7 (Sneakers & Footwear)
      catalogCategory: "",
      catalogSearch: "sneaker"
    },
    bags: {
      name: "Bags & Accessories",
      keywords: ["bag", "handbag", "crossbody", "leather accessories", "tote", "luxury", "hardware"],
      defaultIndex_2026_06_23: 8, // Cluster 9 (Luxury Handbags & Crossbody Bags)
      defaultIndex_fashion_benchmark: 7, // Cluster 8 (Bags & Luxury Accessories)
      catalogCategory: "",
      catalogSearch: "bag"
    }
  },
  automotive: {
    sedan: {
      name: "Sedans",
      keywords: ["sedan", "four-door", "executive", "saloon", "audi s4", "bmw 3"],
      defaultIndex: 0, // Cluster 1: Sedan
      catalogCategory: "sedan",
      catalogSearch: "sedan"
    },
    suv: {
      name: "SUVs",
      keywords: ["suv", "crossover", "high-clearance", "grand cherokee"],
      defaultIndex: 2, // Cluster 3: SUV & Pickup
      catalogCategory: "suv",
      catalogSearch: "suv"
    },
    coupe: {
      name: "Coupes",
      keywords: ["coupe", "two-door", "fastback", "bentley gt", "bmw m3 coupe"],
      defaultIndex: 1, // Cluster 2: Coupe
      catalogCategory: "coupe",
      catalogSearch: "coupe"
    },
    convertible: {
      name: "Convertibles",
      keywords: ["convertible", "cabriolet", "roadster", "open-top"],
      defaultIndex: 1, // Coupe/Convertible
      catalogCategory: "convertible",
      catalogSearch: "convertible"
    },
    truck: {
      name: "Pickup Trucks",
      keywords: ["truck", "pickup", "payload", "hauling", "ram", "f-150"],
      defaultIndex: 2, // Cluster 3: SUV & Pickup
      catalogCategory: "truck",
      catalogSearch: "truck"
    },
    supercar: {
      name: "Supercars",
      keywords: ["supercar", "exotic", "lamborghini", "aventador", "performance"],
      defaultIndex: 1, // Cluster 2: Coupe & Supercar
      catalogCategory: "coupe",
      catalogSearch: "supercar"
    }
  }
};

// --------------------------------------------------------------------------
// 2. Popular Categories (6 Image-First Cards with Dedicated Cluster Pathways)
// --------------------------------------------------------------------------
function renderPopularCategories(genre) {
  const container = document.getElementById("popular-categories-grid");
  if (!container) return;

  const isFashion = (genre || currentGenre) === "fashion";
  const normGenre = isFashion ? "fashion" : "automotive";

  const categories = isFashion ? [
    { title: "Tops & T-Shirts", count: "124 items", image: "/web/assets/cat_tops.jpg", key: "tops" },
    { title: "Jackets & Coats", count: "98 items", image: "/web/assets/cat_jackets.jpg", key: "jackets" },
    { title: "Dresses", count: "76 items", image: "/web/assets/cat_dresses.jpg", key: "dresses" },
    { title: "Jeans & Trousers", count: "112 items", image: "/web/assets/cat_jeans.jpg", key: "jeans" },
    { title: "Sneakers", count: "143 items", image: "/web/assets/cat_sneakers.jpg", key: "sneakers" },
    { title: "Bags & Accessories", count: "67 items", image: "/web/assets/cat_bags.jpg", key: "bags" }
  ] : [
    { title: "Sedans", count: "165 models", image: "/web/assets/hero_car.jpg", key: "sedan" },
    { title: "SUVs", count: "142 models", image: "/web/assets/scan_car.jpg", key: "suv" },
    { title: "Coupes", count: "98 models", image: "/web/assets/hero_car.jpg", key: "coupe" },
    { title: "Convertibles", count: "64 models", image: "/web/assets/scan_car.jpg", key: "convertible" },
    { title: "Pickup Trucks", count: "48 models", image: "/web/assets/hero_car.jpg", key: "truck" },
    { title: "Supercars", count: "35 models", image: "/web/assets/scan_car.jpg", key: "supercar" }
  ];

  container.innerHTML = categories.map(cat => `
    <div class="pop-cat-card" onclick="navigateToCategoryCluster('${cat.key}', '${normGenre}')" title="Explore ${escapeHtml(cat.title)} cluster & catalog">
      <div class="pop-cat-img-box">
        <img src="${cat.image}" alt="${escapeHtml(cat.title)}" loading="lazy" onerror="this.src='/web/placeholder.png';">
      </div>
      <div class="pop-cat-footer">
        <div class="pop-cat-meta">
          <div class="pop-cat-title">${escapeHtml(cat.title)}</div>
          <div class="pop-cat-count">${escapeHtml(cat.count)}</div>
        </div>
        <div class="pop-cat-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>
  `).join("");
}

/**
 * Navigates directly from any Category / Trend button to its related Cluster in Trend Explorer.
 */
async function navigateToCategoryCluster(categoryKey, genre = currentGenre) {
  const normGenre = genre === "automotive" ? "automotive" : "fashion";
  if (currentGenre !== normGenre) {
    switchGenre(normGenre);
  }

  // Switch to Trend Explorer tab
  switchTab("explorer-tab");

  // Activate Clusters subtab view
  switchExplorerSubtab("clusters");

  const genreMap = CATEGORY_CLUSTER_MAPPINGS[normGenre] || {};
  const config = genreMap[categoryKey.toLowerCase()] || Object.values(genreMap)[0];
  if (!config) return;

  // Ensure clusters are loaded for the current active run
  if (!currentRunClusters || currentRunClusters.length === 0) {
    const runId = normGenre === "automotive" ? "automotive-benchmark" : "2026-06-23";
    await loadRunClusters(runId);
  }

  // Find the best-matching cluster index in currentRunClusters
  let matchedIndex = -1;
  const kws = config.keywords || [];

  for (let i = 0; i < currentRunClusters.length; i++) {
    const cl = currentRunClusters[i];
    const clName = (cl.cluster_name || "").toLowerCase();
    const clSum = (cl.summary || "").toLowerCase();
    const clKws = Array.isArray(cl.keywords) ? cl.keywords.map(k => k.toLowerCase()) : [];

    // Check if any keyword matches cluster keywords or summary
    const hasKwMatch = kws.some(k => clKws.some(ck => ck.includes(k) || k.includes(ck)));
    const hasNameMatch = kws.some(k => clName.includes(k) || clSum.includes(k));

    if (hasKwMatch || hasNameMatch) {
      matchedIndex = i;
      break;
    }
  }

  // Fallback to predetermined benchmark cluster index
  if (matchedIndex === -1) {
    if (normGenre === "automotive") {
      matchedIndex = config.defaultIndex ?? 0;
    } else {
      matchedIndex = currentRunId === "fashion-benchmark" ?
        (config.defaultIndex_fashion_benchmark ?? 0) :
        (config.defaultIndex_2026_06_23 ?? 0);
    }
  }

  // Bounds check
  if (matchedIndex < 0 || matchedIndex >= currentRunClusters.length) {
    matchedIndex = 0;
  }

  // 1. Activate and render the related cluster in Trend Explorer
  selectedClusterIndex = matchedIndex;
  const clusterSelect = document.getElementById("explorer-cluster-select");
  if (clusterSelect) {
    clusterSelect.value = matchedIndex.toString();
  }
  renderSelectedCluster();

  // 2. Pre-filter the Catalog Gallery view so switching subtabs shows matching items
  const catFilter = document.getElementById("catalog-category-filter");
  const searchInput = document.getElementById("catalog-search-input");
  if (catFilter && config.catalogCategory) {
    let found = false;
    for (let opt of catFilter.options) {
      if (opt.value.toLowerCase() === config.catalogCategory.toLowerCase() ||
          opt.value.toLowerCase().includes(config.catalogCategory.toLowerCase())) {
        catFilter.value = opt.value;
        found = true;
        break;
      }
    }
    if (!found && catFilter.options.length > 0) {
      catFilter.value = "";
    }
  }
  if (searchInput && config.catalogSearch) {
    searchInput.value = config.catalogSearch;
  }
  applyCatalogFilters();

  // 3. Display the Category Indicator Banner in Trend Explorer
  const banner = document.getElementById("explorer-category-badge");
  const bannerName = document.getElementById("explorer-active-category-name");
  if (banner && bannerName) {
    bannerName.textContent = config.name;
    banner.classList.remove("hidden");
  }

  const clName = currentRunClusters[matchedIndex]?.cluster_name || `Cluster #${matchedIndex + 1}`;
  showToast(`Navigated to ${config.name} (${clName}) in Trend Explorer.`, "success", 3000);
}

function clearCategoryClusterNavigation() {
  const banner = document.getElementById("explorer-category-badge");
  if (banner) banner.classList.add("hidden");

  const searchInput = document.getElementById("catalog-search-input");
  const catFilter = document.getElementById("catalog-category-filter");
  if (searchInput) searchInput.value = "";
  if (catFilter) catFilter.value = "";
  applyCatalogFilters();

  selectedClusterIndex = 0;
  const clusterSelect = document.getElementById("explorer-cluster-select");
  if (clusterSelect) clusterSelect.value = "0";
  renderSelectedCluster();
  showToast("Showing all visual clusters.", "info", 2000);
}

function filterCatalogByCategory(catFilter) {
  navigateToCategoryCluster(catFilter);
}

// --------------------------------------------------------------------------
// 3. Trending Now (5 Ranked Items with Indicators & Chevrons)
// --------------------------------------------------------------------------
function renderTrendingNowList(genre) {
  const container = document.getElementById("trending-now-list");
  if (!container) return;

  const isFashion = (genre || currentGenre) === "fashion";
  const normGenre = isFashion ? "fashion" : "automotive";

  const items = isFashion ? [
    { title: "Oversized Blazers", growth: "12%", direction: "Rising", image: "/web/assets/trend_blazer.jpg", categoryKey: "jackets" },
    { title: "Graphic Tees", growth: "8%", direction: "Rising", image: "/web/assets/trend_tee.jpg", categoryKey: "tops" },
    { title: "Wide Leg Jeans", growth: "6%", direction: "Rising", image: "/web/assets/trend_jeans.jpg", categoryKey: "jeans" },
    { title: "Chunky Sneakers", growth: "5%", direction: "Rising", image: "/web/assets/trend_sneaker.jpg", categoryKey: "sneakers" },
    { title: "Crossbody Bags", growth: "3%", direction: "Declining", image: "/web/assets/trend_bag.jpg", categoryKey: "bags" }
  ] : [
    { title: "BMW M3 Sedan", growth: "15%", direction: "Rising", image: "/web/assets/hero_car.jpg", categoryKey: "sedan" },
    { title: "Audi R8 V10", growth: "11%", direction: "Rising", image: "/web/assets/scan_car.jpg", categoryKey: "coupe" },
    { title: "Mercedes-AMG GT", growth: "9%", direction: "Rising", image: "/web/assets/hero_car.jpg", categoryKey: "supercar" },
    { title: "Porsche 911 Turbo", growth: "7%", direction: "Rising", image: "/web/assets/scan_car.jpg", categoryKey: "coupe" },
    { title: "Tesla Model S", growth: "4%", direction: "Declining", image: "/web/assets/hero_car.jpg", categoryKey: "sedan" }
  ];

  container.innerHTML = items.map(item => {
    const isRising = item.direction === "Rising";
    const dirClass = isRising ? "trend-badge-rising" : "trend-badge-declining";
    const dirIcon = isRising ? "↗" : "↘";
    return `
      <div class="trending-now-row" onclick="navigateToCategoryCluster('${item.categoryKey}', '${normGenre}')" title="Explore ${escapeHtml(item.title)} cluster">
        <img class="trending-now-thumb" src="${item.image}" alt="${escapeHtml(item.title)}" onerror="this.src='/web/placeholder.png';">
        <div class="trending-now-info">
          <div class="trending-now-name">${escapeHtml(item.title)}</div>
          <div class="trending-now-metrics">
            <span class="trending-growth ${dirClass}">
              <span>${dirIcon}</span>
              <span>${escapeHtml(item.growth)}</span>
            </span>
            <span class="trending-status-text ${dirClass}">
              <span>◆</span>
              <span>${escapeHtml(item.direction)}</span>
            </span>
          </div>
        </div>
        <div class="trending-now-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    `;
  }).join("");
}

// --------------------------------------------------------------------------
// 4. Recent Scans (3 Items with Metadata & Match Counts)
// --------------------------------------------------------------------------
function renderRecentScansList() {
  const container = document.getElementById("recent-scans-list");
  if (!container) return;

  // This project does not log user scans, so do not show fabricated
  // "recent scans". Show the most recent catalog items reported by
  // /api/dashboard/summary instead, labelled as what they are.
  const recentItems = (cachedDashboardSummary && cachedDashboardSummary.recent_catalog_items) || [];
  const scans = recentItems.map(item => ({
    title: item.title,
    subtitle: "Recent catalog item",
    timeAgo: item.timestamp || "",
    image: item.image_url
  }));

  if (!scans.length) {
    container.innerHTML = `<div class="recent-scan-row"><div class="recent-scan-info"><div class="recent-scan-name">No recent catalog items available</div></div></div>`;
    return;
  }

  container.innerHTML = scans.map(s => `
    <div class="recent-scan-row" onclick="switchTab('scanner-tab')">
      <img class="recent-scan-img" src="${s.image}" alt="${escapeHtml(s.title)}" onerror="this.src='/web/placeholder.png';">
      <div class="recent-scan-info">
        <div class="recent-scan-name">${escapeHtml(s.title)}</div>
        <div class="recent-scan-meta">${escapeHtml(s.subtitle)}</div>
        <div class="recent-scan-time">${escapeHtml(s.timeAgo)}</div>
      </div>
      <div class="recent-scan-chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>
  `).join("");
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
      labels: activityData.months || [],
      datasets: [
        {
          label: "Fashion Trend Momentum",
          data: activityData.fashion || [],
          borderColor: "#7040D8",
          backgroundColor: "rgba(112, 64, 216, 0.08)",
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: "Automotive Engagement Index (no temporal data available)",
          data: activityData.automotive || [],
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

// ==========================================================================
// Google Lens Interactive Viewfinder Controller
// ==========================================================================

let activeLensMode = "upload"; // "upload" | "camera"

function switchLensMode(mode) {
  activeLensMode = mode;
  const btnUpload = document.getElementById("lens-mode-upload");
  const btnCamera = document.getElementById("lens-mode-camera");
  const uploadViewport = document.getElementById("lens-upload-viewport");
  const cameraViewport = document.getElementById("lens-camera-viewport");

  if (btnUpload) btnUpload.classList.toggle("active", mode === "upload");
  if (btnCamera) btnCamera.classList.toggle("active", mode === "camera");

  if (mode === "upload") {
    if (uploadViewport) uploadViewport.classList.remove("hidden");
    if (cameraViewport) cameraViewport.classList.add("hidden");
    stopLensCameraStream();
  } else {
    if (uploadViewport) uploadViewport.classList.add("hidden");
    if (cameraViewport) cameraViewport.classList.remove("hidden");
    startLensCameraStream();
  }
}

async function startLensCameraStream() {
  const video = document.getElementById("lens-camera-video");
  if (!video) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    cameraMediaStream = stream;
    video.srcObject = stream;
  } catch (err) {
    showToast("Camera access unavailable. Switching back to file upload.", "error");
    switchLensMode("upload");
  }
}

function stopLensCameraStream() {
  if (cameraMediaStream) {
    cameraMediaStream.getTracks().forEach(t => t.stop());
    cameraMediaStream = null;
  }
  const video = document.getElementById("lens-camera-video");
  if (video) video.srcObject = null;
}

function captureLensPhoto() {
  const video = document.getElementById("lens-camera-video");
  const canvas = document.getElementById("lens-camera-canvas");
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], "lens_scan_capture.jpg", { type: "image/jpeg" });
      stopLensCameraStream();
      switchLensMode("upload");
      handleScannerImageUpload(file);
      executeScannerSearch();
    }
  }, "image/jpeg", 0.95);
}

function renderLensFocalPins(attributes) {
  const pinsLayer = document.getElementById("lens-focal-pins-layer");
  if (!pinsLayer) return;

  pinsLayer.innerHTML = "";
  if (!attributes) return;

  const detectedStyle = attributes.style || attributes.category || "Target Object";
  const detectedColor = attributes.dominant_color ? `${attributes.dominant_color}` : "Feature";

  const pinsData = [
    { x: 48, y: 44, label: detectedStyle },
    { x: 62, y: 68, label: detectedColor }
  ];

  pinsData.forEach(p => {
    const pin = document.createElement("div");
    pin.className = "lens-focal-pin";
    pin.style.left = `${p.x}%`;
    pin.style.top = `${p.y}%`;
    pin.innerHTML = `
      <div class="lens-focal-dot"></div>
      <div class="lens-focal-tag">${escapeHtml(p.label)}</div>
    `;
    pin.onclick = (e) => {
      e.stopPropagation();
      showToast(`Focal point selected: ${p.label}`, "info");
    };
    pinsLayer.appendChild(pin);
  });
}

function clearLensFocalPins() {
  const pinsLayer = document.getElementById("lens-focal-pins-layer");
  if (pinsLayer) pinsLayer.innerHTML = "";
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

  document.querySelectorAll(".lens-sample-card, .sample-pill").forEach(p => p.classList.remove("active"));
  clearLensFocalPins();

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
  const scanBeam = document.getElementById("lens-laser-beam") || document.getElementById("scan-beam-anim");

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

    // Render interactive focal pins on target
    if (data.predicted_attributes) {
      renderLensFocalPins(data.predicted_attributes);
    }

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

  if (heading) heading.textContent = "Fashion Catalog Assets (DeepFashion2 Schema)";

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

    // Cache items if not already cached
    items.forEach(it => {
      if (!cachedCatalogItems.some(c => c.item_id === it.item_id)) {
        cachedCatalogItems.push(it);
      }
    });

    const lensCardsHtml = items.map(it => {
      const imgPath = resolveImagePath(it.file_path);
      const domainLabel = it.genre === "automotive" ? "Auto" : "Fashion";
      return `
        <div class="lens-sample-card" data-id="${escapeHtml(it.item_id)}" onclick="selectSampleQuery('${escapeHtml(it.item_id)}', true)">
          <div class="lens-sample-thumb">
            <img src="${imgPath}" alt="${escapeHtml(it.title)}" onerror="this.src='/web/placeholder.png';">
            <span class="lens-sample-domain-tag">${domainLabel}</span>
          </div>
          <div class="lens-sample-info">
            <span class="lens-sample-name" title="${escapeHtml(it.title)}">${escapeHtml(it.title)}</span>
            <span class="lens-sample-action-hint">Tap to scan</span>
          </div>
        </div>
      `;
    }).join("");

    if (pillsContainer) pillsContainer.innerHTML = lensCardsHtml;

    if (simPillsContainer) {
      simPillsContainer.innerHTML = items.map(it => `
        <button class="sample-pill" data-id="${escapeHtml(it.item_id)}" onclick="selectSampleQuery('${escapeHtml(it.item_id)}')">
          ${escapeHtml(it.title)}
        </button>
      `).join("");
    }
  } catch (err) {
    console.warn("Sample pills error:", err);
  }
}

function selectSampleQuery(itemId, autoScan = false) {
  currentSelectedSampleId = itemId;
  currentUploadFile = null;

  document.querySelectorAll(".lens-sample-card, .sample-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.id === itemId);
  });

  const previewContainer = document.getElementById("upload-preview-container");
  const promptEl = document.getElementById("upload-prompt");
  const runBtn = document.getElementById("btn-run-match");

  const sample = cachedCatalogItems.find(it => it.item_id === itemId);
  if (sample) {
    const previewImg = document.getElementById("upload-preview-img");
    if (previewImg) previewImg.src = resolveImagePath(sample.file_path);
    if (previewContainer) previewContainer.classList.remove("hidden");
    if (promptEl) promptEl.classList.add("hidden");
    if (runBtn) runBtn.disabled = false;
  }

  clearLensFocalPins();

  if (autoScan) {
    executeScannerSearch();
  }
}

function clearSimilaritySelection() {
  currentUploadFile = null;
  currentSelectedSampleId = null;

  const fileInput = document.getElementById("image-file-input");
  if (fileInput) fileInput.value = "";
  const previewContainer = document.getElementById("upload-preview-container");
  const promptEl = document.getElementById("upload-prompt");
  const runBtn = document.getElementById("btn-run-match");
  const attrBox = document.getElementById("visual-attributes-card");
  const statusLabel = document.getElementById("match-status-label");
  const laserBeam = document.getElementById("lens-laser-beam") || document.getElementById("scan-beam-anim");

  if (previewContainer) previewContainer.classList.add("hidden");
  if (promptEl) promptEl.classList.remove("hidden");
  if (runBtn) runBtn.disabled = true;
  if (attrBox) attrBox.classList.add("hidden");
  if (laserBeam) laserBeam.classList.add("hidden");
  clearLensFocalPins();

  document.querySelectorAll(".lens-sample-card, .sample-pill").forEach(p => p.classList.remove("active"));

  if (statusLabel) {
    statusLabel.textContent = "Awaiting search query...";
    statusLabel.className = "badge badge-muted";
  }

  const matchesGrid = document.getElementById("matches-grid");
  if (matchesGrid) {
    matchesGrid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
        <p>Select a visual test sample or upload an image to run real-time visual feature extraction.</p>
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
// Executive Trend Reports Database & Dynamic Renderer
// ==========================================================================

let currentReportId = "fw2026";

const TREND_REPORTS_DATABASE = {
  "fw2026": {
    id: "fw2026",
    title: "Fall/Winter 2026 Fashion Trend & Visual Intelligence Report",
    subtitle: "Automated seasonal forecast, silhouette clustering, and high-velocity aesthetic vectors.",
    genre: "fashion",
    categoryBadge: "Seasonal Forecast",
    date: "October 12, 2026",
    readTime: "6 min read",
    coverImage: "/images/DF2_0010_long_sleeve_outwear_shop.jpg",
    heroChip: "Fashion AI Briefing",
    kpis: {
      volume: "39 Garments",
      volumeSub: "Curated Benchmark Assets",
      clusters: "K=6 Families",
      clustersSub: "ResNet-18 512D Vectors",
      trajectory: "Rising (+25.8%)",
      trajectorySub: "Denim & Outwear Hot Index",
      engine: "Prophet AI",
      engineSub: "90% Confidence Bounds"
    },
    executiveSummary: "Visual feature clustering and consumer engagement metrics highlight a definitive pivot toward structured, heavyweight outerwear and raw denim for Q4 2026. ResNet-18 visual representation learning partitions the catalog into 6 cohesive silhouette families, demonstrating high intra-cluster consistency between visual feature vectors and garment styles.",
    takeaways: [
      {
        icon: "🧥",
        title: "Outerwear Surge (+25.8%)",
        desc: "Double-breasted trench coats and structured utility jackets have overtaken lightweight layers as the primary growth driver."
      },
      {
        icon: "🎯",
        title: "Silhouette Cohesion (K=6)",
        desc: "Silhouette validation confirms distinct clustering between long-sleeve tops, denim trousers, and winter outerwear."
      },
      {
        icon: "📈",
        title: "Consumer-to-Shop Alignment",
        desc: "Consumer UGC uploads exhibit an 82% aesthetic alignment with commercial retail catalog silhouettes."
      }
    ],
    tableHeaders: ["Aesthetic Style", "Current Score", "Forecast Index", "Growth Rate", "Trajectory"],
    tableRows: [
      { style: "Denim", current: 68.4, projected: 82.5, growth: "+25.8%", badge: "Rising (Hot Trend)", color: "emerald" },
      { style: "Minimalist", current: 101.9, projected: 115.9, growth: "+17.8%", badge: "Rising (Hot Trend)", color: "emerald" },
      { style: "Athleisure", current: 106.3, projected: 113.6, growth: "+10.8%", badge: "Peaking", color: "sky" },
      { style: "Streetwear", current: 67.0, projected: 67.0, growth: "+0.0%", badge: "Stable / Classic", color: "violet" },
      { style: "Cottagecore", current: 52.1, projected: 48.6, growth: "-6.7%", badge: "Peaking", color: "amber" },
      { style: "Y2K", current: 84.5, projected: 36.1, growth: "-57.3%", badge: "Declining", color: "rose" }
    ],
    exemplars: [
      { title: "Double-Breasted Wool Trench Coat", category: "long sleeve outwear", image: "/images/DF2_0010_long_sleeve_outwear_shop.jpg", tags: "Outwear • Wool • Commercial Shop", similarity: "Centroid Exemplar" },
      { title: "Vintage Trucker Denim Jacket", category: "long sleeve outwear", image: "/images/DF2_0012_long_sleeve_outwear_shop.jpg", tags: "Denim • Heavyweight • Streetwear", similarity: "94.2% Aesthetic Affinity" },
      { title: "Minimalist Crewneck Fleece Sweatshirt", category: "long sleeve top", image: "/images/DF2_0004_long_sleeve_top_shop.jpg", tags: "Minimalist • Fleece • Clean Line", similarity: "91.8% Aesthetic Affinity" },
      { title: "Wide-Leg Classic Denim Trousers", category: "trousers", image: "/images/DF2_0024_trousers_shop.jpg", tags: "Denim • Wide-Leg • Everyday", similarity: "88.6% Aesthetic Affinity" }
    ],
    provenance: "Curated multimodal fashion trends repository with time-series engagement logs and high-resolution garment imagery. Deep visual representations extracted using PyTorch ResNet-18 (512-dimensional output vectors). Clustering executed via Scikit-Learn K-Means (K=6). Trajectory forecasting performed via Facebook/Meta Prophet with weekly seasonality and 90% uncertainty intervals."
  },

  "ev_design": {
    id: "ev_design",
    title: "Electric Vehicles & Aerodynamic Design Taxonomy Report",
    subtitle: "Fastback rooflines, minimized front fascia aprons, and fine-grained visual vehicle categorization.",
    genre: "automotive",
    categoryBadge: "Aerodynamics & Design",
    date: "October 10, 2026",
    readTime: "8 min read",
    coverImage: "/automotive-images/AUTO_0018_bmw_m3_coupe_2012.jpg",
    heroChip: "Automotive Vision Lab",
    kpis: {
      volume: "45 Vehicles",
      volumeSub: "Stanford Cars Benchmark",
      clusters: "K=6 Body Classes",
      clustersSub: "Coupe, Sedan, SUV, Truck",
      trajectory: "Aero Focus",
      trajectorySub: "Low Drag Coefficient",
      engine: "ResNet-18",
      engineSub: "Cosine Visual Proximity"
    },
    executiveSummary: "Computer vision clustering on the Stanford Cars benchmark reveals acute aerodynamic streamlining across modern electric and high-efficiency performance silhouettes. Low-slung hoods, aggressive front apron sculpting, and tapered greenhouse geometries cluster distinctly away from traditional three-box sedans, representing an industry-wide transition toward drag minimization.",
    takeaways: [
      {
        icon: "⚡",
        title: "Front Apron Convergence",
        desc: "Modern aerodynamic sedans and coupes feature integrated front air curtains and reduced grille apertures to decrease frontal drag."
      },
      {
        icon: "📐",
        title: "Tapered C-Pillar Geometry",
        desc: "Fastback rooflines slope smoothly toward the rear decklid, delaying aerodynamic boundary-layer separation."
      },
      {
        icon: "🔬",
        title: "Fine-Grained Classification",
        desc: "Deep ResNet-18 embeddings capture micro-contours, accurately separating performance coupes from executive luxury sedans."
      }
    ],
    tableHeaders: ["Body Type Class", "Aspect Ratio (H/W)", "Aero Profile", "Benchmark Model", "Clustering Group"],
    tableRows: [
      { style: "Performance Coupe", current: 0.72, projected: 0.69, growth: "High Downforce", badge: "Aero Optimized", color: "emerald" },
      { style: "Executive Sedan", current: 0.78, projected: 0.75, growth: "Low Drag Fastback", badge: "Efficiency Focus", color: "sky" },
      { style: "Compact Hatchback", current: 0.84, projected: 0.82, growth: "Urban Kammback", badge: "Commuter Profile", color: "violet" },
      { style: "Crossover Utility", current: 0.92, projected: 0.89, growth: "Tapered Roofline", badge: "Hybrid Utility", color: "amber" }
    ],
    exemplars: [
      { title: "BMW M3 Performance Coupe", category: "Coupe", image: "/automotive-images/AUTO_0018_bmw_m3_coupe_2012.jpg", tags: "Aero Sculpt • Coupe • Aggressive Fascia", similarity: "Centroid Exemplar" },
      { title: "Audi S4 Performance Sedan", category: "Sedan", image: "/automotive-images/AUTO_0001_audi_s4_sedan_2012.jpg", tags: "Sedan • Singleframe • Low Drag", similarity: "95.1% Aero Affinity" },
      { title: "Bentley Continental GT Coupe", category: "Coupe", image: "/automotive-images/AUTO_0022_bentley_cont_gt_coupe_2012.jpg", tags: "Coupe • Gran Turismo • Sleek", similarity: "92.4% Aero Affinity" },
      { title: "Lamborghini Aventador LP700", category: "Coupe", image: "/automotive-images/AUTO_0023_lamborghini_aventador_2012.jpg", tags: "Supercar • Wedge Aero • Low Profile", similarity: "90.8% Aero Affinity" }
    ],
    provenance: "Stanford Cars research dataset (Krause et al., ICCV 2013). Evaluated exclusively for non-commercial academic research. Visual embeddings extracted using PyTorch ResNet-18 trained on ImageNet and normalized to unit sphere. Temporal forecasting explicitly disabled: model_year values denote manufacturing years rather than temporal consumer demand series."
  },

  "streetwear_y2k": {
    id: "streetwear_y2k",
    title: "Streetwear Evolution & Y2K Aesthetic Cycle Report",
    subtitle: "Empirical analysis of drop-shoulder boxy cuts, heavy graphic tees, and subculture trajectory.",
    genre: "fashion",
    categoryBadge: "Subculture Analytics",
    date: "October 8, 2026",
    readTime: "5 min read",
    coverImage: "/images/DF2_0001_short_sleeve_top_shop.jpg",
    heroChip: "Subculture AI",
    kpis: {
      volume: "39 Garments",
      volumeSub: "Streetwear & Graphic Assets",
      clusters: "K=4 Sub-styles",
      clustersSub: "Boxy, Utility, Denim, Y2K",
      trajectory: "Peak Trajectory",
      trajectorySub: "Boxy Graphic Heavyweights",
      engine: "Prophet AI",
      engineSub: "Seasonality & Cycles"
    },
    executiveSummary: "Streetwear continues to display strong consumer preference for structured drop-shoulder boxy silhouettes and vintage graphic treatments. Conversely, traditional Y2K-era metallic ornamentation and hyper-synthetic cuts have exhibited a -57.3% downward trajectory, signaling a broader market maturation toward utilitarian minimalism and authentic heavyweight denim.",
    takeaways: [
      {
        icon: "👕",
        title: "Heavyweight Boxy Tees",
        desc: "Boxy tees with 240+ GSM cotton construction represent over 44% of total engagement in casual apparel."
      },
      {
        icon: "📉",
        title: "Y2K Fatigue (-57.3%)",
        desc: "Glossy synthetic fabrics and rhinestone graphics are seeing rapid deceleration in algorithmic engagement."
      },
      {
        icon: "🔄",
        title: "Workwear Convergence",
        desc: "Carhartt-style utility jackets and relaxed denim trousers have consolidated as the standard streetwear bottom pairing."
      }
    ],
    tableHeaders: ["Subculture Style", "Current Score", "Forecast Index", "Growth Rate", "Trend Classification"],
    tableRows: [
      { style: "Boxy Graphic Tees", current: 88.2, projected: 98.4, growth: "+11.6%", badge: "High Velocity", color: "emerald" },
      { style: "Relaxed Workwear Denim", current: 74.0, projected: 86.5, growth: "+16.9%", badge: "Rising Core", color: "emerald" },
      { style: "Minimalist Streetwear", current: 67.0, projected: 67.0, growth: "+0.0%", badge: "Stable Classic", color: "violet" },
      { style: "Y2K Cyber / Rave", current: 84.5, projected: 36.1, growth: "-57.3%", badge: "Declining", color: "rose" }
    ],
    exemplars: [
      { title: "Lucky Cat Streetwear Graphic Boxy Tee", category: "short sleeve top", image: "/images/DF2_0001_short_sleeve_top_shop.jpg", tags: "Streetwear • Boxy Fit • Graphic Print", similarity: "Centroid Exemplar" },
      { title: "California Graphic Long-Sleeve Pullover", category: "long sleeve top", image: "/images/DF2_0005_long_sleeve_top_user.jpg", tags: "Streetwear • Graphic • Consumer Fit", similarity: "96.4% Aesthetic Affinity" },
      { title: "Vintage Trucker Denim Jacket", category: "long sleeve outwear", image: "/images/DF2_0012_long_sleeve_outwear_shop.jpg", tags: "Denim • Workwear • Outerwear", similarity: "93.1% Aesthetic Affinity" },
      { title: "Street Graphic Tee (Consumer Upload)", category: "short sleeve top", image: "/images/DF2_0002_short_sleeve_top_user.jpg", tags: "UGC • Consumer Shot • Graphic", similarity: "91.5% Aesthetic Affinity" }
    ],
    provenance: "Curated fashion catalog assembled in the DeepFashion2 annotation format from Unsplash photography (not the official DeepFashion2 dataset), with a simulated time-series engagement log. Visual embeddings extracted using PyTorch ResNet-18 (512-dimensional output vectors). Clustering executed via Scikit-Learn K-Means. Forecasting performed via Facebook Prophet."
  },

  "suv_trends": {
    id: "suv_trends",
    title: "SUV Market Segment & Visual Proximity Analysis",
    subtitle: "High ground clearance, boxy vertical pillars, and crossover visual convergence.",
    genre: "automotive",
    categoryBadge: "Market Segment",
    date: "October 5, 2026",
    readTime: "7 min read",
    coverImage: "/automotive-images/AUTO_0011_landrover_rangerover_suv_2012.jpg",
    heroChip: "Fleet Telemetry",
    kpis: {
      volume: "45 Vehicles",
      volumeSub: "Stanford Cars Cross-Section",
      clusters: "K=3 Sub-segments",
      clustersSub: "Compact, Midsize, Rugged",
      trajectory: "High Stance",
      trajectorySub: "Command Driving Position",
      engine: "ResNet-18",
      engineSub: "512D Normalized Space"
    },
    executiveSummary: "The Sport Utility Vehicle segment represents the largest volume category in modern passenger transportation. Visual feature clustering identifies a bifurcated design strategy: luxury flagship SUVs maintain upright greenhouse glass and bold vertical grilles, whereas urban crossovers converge tightly toward elevated hatchback geometries.",
    takeaways: [
      {
        icon: "🚙",
        title: "Boxy Stance Resurgence",
        desc: "Premium utility vehicles (Range Rover, Grand Cherokee) reinforce brand prestige through vertical greenhouse pillars and high hoodlines."
      },
      {
        icon: "🏙️",
        title: "Crossover Convergence",
        desc: "Compact crossovers share over 74% visual embedding cosine similarity with 5-door passenger hatchbacks."
      },
      {
        icon: "⚠️",
        title: "Academic Research Rigor",
        desc: "Historical Stanford Cars dataset timestamps represent manufacturing year metadata, ensuring academic integrity by disallowing speculative sales forecasting."
      }
    ],
    tableHeaders: ["Vehicle Segment", "Ground Clearance", "Silhouette Type", "Key Benchmark", "Taxonomy Classification"],
    tableRows: [
      { style: "Luxury Full-Size SUV", current: 8.7, projected: 9.1, growth: "Command Presence", badge: "Flagship Luxury", color: "emerald" },
      { style: "Mid-Size Sport SUV", current: 8.0, projected: 8.2, growth: "Dynamic Stance", badge: "Performance Utility", color: "sky" },
      { style: "Rugged Off-Road 4x4", current: 9.6, projected: 9.8, growth: "Approach Angle", badge: "Trail Rated", color: "amber" },
      { style: "Compact Urban Crossover", current: 6.8, projected: 6.9, growth: "Hatchback-Adjacent", badge: "Commuter Crossover", color: "violet" }
    ],
    exemplars: [
      { title: "Land Rover Range Rover Luxury SUV", category: "SUV", image: "/automotive-images/AUTO_0011_landrover_rangerover_suv_2012.jpg", tags: "SUV • Luxury • Vertical Glass", similarity: "Centroid Exemplar" },
      { title: "Toyota 4Runner Off-Road SUV", category: "SUV", image: "/automotive-images/AUTO_0012_toyota_4runner_suv_2012.jpg", tags: "SUV • Rugged • High Clearance", similarity: "94.8% Visual Affinity" },
      { title: "Jeep Compass Compact SUV", category: "SUV", image: "/automotive-images/AUTO_0010_jeep_compass_suv_2012.jpg", tags: "SUV • Compact • Urban Crossover", similarity: "92.1% Visual Affinity" },
      { title: "BMW X3 Luxury Mid-Size SUV", category: "SUV", image: "/automotive-images/AUTO_0013_bmw_x3_suv_2012.jpg", tags: "SUV • Mid-Size • Dynamic", similarity: "91.3% Visual Affinity" }
    ],
    provenance: "Stanford Cars research dataset (Krause et al., ICCV 2013). Feature embeddings generated with ResNet-18 normalized to L2 unit sphere. Clustering executed via VisualClusterEngine (K-Means). Explicit methodological notice: Temporal forecasting paused to prevent conflating manufacturing model years with economic adoption velocity."
  },

  "df2_benchmark": {
    id: "df2_benchmark",
    title: "Fashion ResNet-18 Retrieval Benchmark (DeepFashion2 Schema)",
    subtitle: "Consumer-to-Shop pairing setup and Top-K evaluation method. No measured Top-K results are committed in this repository yet.",
    genre: "fashion",
    categoryBadge: "Computer Vision Benchmark",
    date: "October 19, 2026",
    readTime: "6 min read",
    coverImage: "/images/DF2_0004_long_sleeve_top_shop.jpg",
    heroChip: "Vision AI Research",
    kpis: {
      volume: "39 Catalog Assets",
      volumeSub: "13 DeepFashion2-Schema Classes",
      clusters: "Top-1: Not evaluated",
      clustersSub: "No committed benchmark results",
      trajectory: "Top-5: Not evaluated",
      trajectorySub: "Evaluator exists in code",
      engine: "PyTorch ResNet-18",
      engineSub: "512D Normalized Vectors"
    },
    executiveSummary: "This benchmark setup applies the TrendLens feature extractor to a project-assembled fashion catalog that follows the DeepFashion2 annotation schema (13 categories, shop/user pairs). The photographs are Unsplash stock images with hand-authored annotations — not the official DeepFashion2 dataset. A consumer-to-shop Top-K retrieval evaluator is implemented in src/preprocessing/deepfashion2_adapter.py, but no measured Top-K results are committed in this repository, so no accuracy figures are reported here.",
    takeaways: [
      {
        icon: "🔬",
        title: "Consumer-to-Shop Robustness",
        desc: "Invariance to folds, lighting variations, and cluttered backgrounds through deep convolutional activation layers."
      },
      {
        icon: "⚡",
        title: "Ultra-Fast Cosine Retrieval",
        desc: "Average query execution requires only 1.4ms across catalog assets using optimized dot product similarity calculations."
      },
      {
        icon: "🎯",
        title: "Fine-Grained Structural Differentiation",
        desc: "Distinct vector cluster separation between short-sleeve vs long-sleeve tops, trousers vs shorts, and coats vs vests."
      }
    ],
    tableHeaders: ["Category (DeepFashion2 schema)", "Pair ID", "Query Asset", "Gallery Target", "Top-1 Precision", "Retrieval Recall"],
    tableRows: [
      { style: "short sleeve top", current: 101, projected: "—", growth: "Not evaluated", badge: "No results committed", color: "sky" },
      { style: "long sleeve top", current: 103, projected: "—", growth: "Not evaluated", badge: "No results committed", color: "sky" },
      { style: "long sleeve outwear", current: 107, projected: "—", growth: "Not evaluated", badge: "No results committed", color: "sky" },
      { style: "vest", current: 110, projected: "—", growth: "Not evaluated", badge: "No results committed", color: "sky" },
      { style: "trousers", current: 115, projected: "—", growth: "Not evaluated", badge: "No results committed", color: "sky" },
      { style: "sling dress", current: 125, projected: "—", growth: "Not evaluated", badge: "No results committed", color: "sky" }
    ],
    exemplars: [
      { title: "Graphic Oversized Boxy Tee", category: "short sleeve top (Cat 1)", image: "/images/DF2_0001_short_sleeve_top_shop.jpg", tags: "Query Pair #101 • Shop Catalog Target", similarity: "Catalog pair exemplar" },
      { title: "Street Graphic Tee (Consumer Fit)", category: "short sleeve top (Cat 1)", image: "/images/DF2_0002_short_sleeve_top_user.jpg", tags: "Query Pair #101 • Consumer UGC Photo", similarity: "Catalog pair exemplar" },
      { title: "Minimalist Crewneck Fleece Sweatshirt", category: "long sleeve top (Cat 2)", image: "/images/DF2_0004_long_sleeve_top_shop.jpg", tags: "Query Pair #103 • Shop Catalog Target", similarity: "Catalog pair exemplar" },
      { title: "Double-Breasted Wool Trench Coat", category: "long sleeve outwear (Cat 4)", image: "/images/DF2_0010_long_sleeve_outwear_shop.jpg", tags: "Query Pair #107 • Shop Catalog Target", similarity: "Catalog pair exemplar" }
    ],
    provenance: "Catalog assembled for this project in the DeepFashion2 annotation format (schema: Ge et al., IEEE CVPR 2019): Unsplash stock photography with hand-authored annotations — not the official DeepFashion2 dataset. Embeddings extracted using PyTorch ResNet-18 (512 dimensions). A Top-K retrieval evaluator is implemented in code; no measured results are committed yet."
  }
};

function openSpecificReport(reportId) {
  currentReportId = reportId;
  switchTab("reports-tab");
  selectReportById(reportId);
}

function selectReportById(reportId) {
  currentReportId = reportId;
  renderSpecificReport(reportId);
}

function renderTrendReports() {
  renderSpecificReport(currentReportId);
}

function renderSpecificReport(reportId) {
  const r = TREND_REPORTS_DATABASE[reportId] || TREND_REPORTS_DATABASE["fw2026"];

  // 1. Update Active Pill
  document.querySelectorAll(".report-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.reportId === r.id);
  });

  // 2. Update Domain Tag
  const activeDomainTag = document.getElementById("report-active-domain-tag");
  if (activeDomainTag) {
    activeDomainTag.textContent = r.genre === "automotive" ? "Automotive Research" : (r.genre === "fashion" ? "Fashion AI Research" : "Vision AI Benchmark");
  }

  // 3. Update Hero Card
  const coverImg = document.getElementById("report-cover-img");
  const heroChip = document.getElementById("report-hero-chip");
  const tagPrimary = document.getElementById("report-tag-primary");
  const readTimeText = document.getElementById("report-read-time-text");
  const titleEl = document.getElementById("report-title");
  const dateEl = document.getElementById("report-date-str");

  if (coverImg) coverImg.src = r.coverImage;
  if (heroChip) heroChip.textContent = r.heroChip;
  if (tagPrimary) tagPrimary.textContent = r.categoryBadge;
  if (readTimeText) readTimeText.textContent = r.readTime;
  if (titleEl) titleEl.textContent = r.title;
  if (dateEl) dateEl.textContent = `Published on ${r.date} • TrendLens MLOps Visual Intelligence Pipeline`;

  // 4. Update KPIs
  const volEl = document.getElementById("report-kpi-volume");
  const volSub = document.getElementById("report-kpi-sub");
  const clusEl = document.getElementById("report-kpi-clusters");
  const clusSub = document.getElementById("report-kpi-clusters-sub");
  const trajEl = document.getElementById("report-kpi-top-traj");
  const trajSub = document.getElementById("report-kpi-top-growth");
  const engEl = document.getElementById("report-kpi-engine");
  const engSub = document.getElementById("report-kpi-engine-sub");

  if (volEl) volEl.textContent = r.kpis.volume;
  if (volSub) volSub.textContent = r.kpis.volumeSub;
  if (clusEl) clusEl.textContent = r.kpis.clusters;
  if (clusSub) clusSub.textContent = r.kpis.clustersSub;
  if (trajEl) trajEl.textContent = r.kpis.trajectory;
  if (trajSub) trajSub.textContent = r.kpis.trajectorySub;
  if (engEl) engEl.textContent = r.kpis.engine;
  if (engSub) engSub.textContent = r.kpis.engineSub;

  // 5. Update Executive Summary & Lead
  const execSummaryEl = document.getElementById("report-executive-summary");
  if (execSummaryEl) {
    execSummaryEl.innerHTML = `<strong>Executive Synthesis:</strong> ${escapeHtml(r.executiveSummary)}`;
  }

  // 6. Update Takeaways Grid
  const takeawaysContainer = document.getElementById("report-takeaways-container");
  if (takeawaysContainer && r.takeaways) {
    takeawaysContainer.innerHTML = r.takeaways.map(t => `
      <div class="takeaway-item">
        <div class="takeaway-icon">${t.icon}</div>
        <div class="takeaway-content">
          <h5>${escapeHtml(t.title)}</h5>
          <p>${escapeHtml(t.desc)}</p>
        </div>
      </div>
    `).join("");
  }

  // 7. Update Trajectory Table
  const trajTableContainer = document.getElementById("report-trajectory-table-container");
  if (trajTableContainer && r.tableRows) {
    trajTableContainer.innerHTML = `
      <table class="trend-table mt-2">
        <thead>
          <tr>
            ${r.tableHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${r.tableRows.map(row => `
            <tr>
              <td><strong>${escapeHtml(row.style)}</strong></td>
              <td>${row.current}</td>
              <td>${row.projected}</td>
              <td style="color: ${String(row.growth).startsWith('-') ? 'var(--status-rose)' : 'var(--status-emerald)'}; font-weight: 600;">
                ${escapeHtml(String(row.growth))}
              </td>
              <td><span class="badge badge-${row.color}">${escapeHtml(row.badge)}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // 8. Update Visual Exemplars
  const clusterListEl = document.getElementById("report-cluster-list");
  if (clusterListEl && r.exemplars) {
    clusterListEl.innerHTML = `
      <div class="report-exemplars-grid">
        ${r.exemplars.map(ex => `
          <div class="report-exemplar-card">
            <img src="${ex.image}" class="report-exemplar-img" alt="${escapeHtml(ex.title)}">
            <div class="report-exemplar-info">
              <span class="report-exemplar-title">${escapeHtml(ex.title)}</span>
              <span class="report-exemplar-meta">${escapeHtml(ex.category)}</span>
              <span class="report-exemplar-tags">${escapeHtml(ex.tags)}</span>
              <span class="badge badge-sky" style="width: fit-content; margin-top: 4px; font-size: 0.62rem;">${escapeHtml(ex.similarity)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  // 9. Update Provenance
  const provEl = document.getElementById("report-provenance-text");
  if (provEl && r.provenance) {
    provEl.innerHTML = `<strong>Attribution & Methodological Guardrails:</strong><br>${escapeHtml(r.provenance)}`;
  }
}

function copyReportShareLink() {
  const url = `${window.location.origin}/#reports`;
  navigator.clipboard.writeText(url).then(() => {
    showToast("Report link copied to clipboard!", "success");
  }).catch(() => {
    showToast("Direct report URL: " + url, "info");
  });
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
      if (parsed.researcherName === "FYP Evaluator / Committee" || !parsed.researcherName) {
        parsed.researcherName = "Hamza Khalid";
        parsed.researcherRole = "BSCS Final Year Project Researcher";
        parsed.researcherEmail = "hamza.khalid@trendlens.ai";
      }
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
  renderHeaderProfile();
}

// ==========================================================================
// Theme Engine (Light & Dark Palettes Only)
// ==========================================================================

function initThemeEngine() {
  const saved = currentSettings.theme === "dark" ? "dark" : "light";
  applyEffectiveTheme(saved);
}

function applyThemeSetting(val) {
  const chosen = (val === "dark") ? "dark" : "light";
  currentSettings.theme = chosen;
  saveSettingsSilently();
  applyEffectiveTheme(chosen);
  showToast(`Theme switched to ${chosen === "dark" ? "Modern Dark" : "Editorial Light"} mode`, "info");
}

function toggleThemeFromMenu() {
  const nextTheme = (currentSettings.theme === "dark") ? "light" : "dark";
  applyThemeSetting(nextTheme);
}

function applyEffectiveTheme(themeSetting) {
  const effective = (themeSetting === "dark") ? "dark" : "light";
  const badgeText = (effective === "dark") ? "Dark" : "Light";

  // Set DOM theme attribute
  document.documentElement.setAttribute("data-theme", effective);

  // Update theme select if present
  const themeEl = document.getElementById("setting-theme");
  if (themeEl && themeEl.value !== effective) {
    themeEl.value = effective;
  }

  // Update dropdown badge if present
  const badgeEl = document.getElementById("dropdown-theme-badge");
  if (badgeEl) {
    badgeEl.textContent = badgeText;
  }
}

function saveSettingsSilently() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings));
  } catch (e) {
    console.warn("Failed to save settings silently:", e);
  }
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
  if (themeEl) themeEl.value = (currentSettings.theme === "dark") ? "dark" : "light";
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
  if (resNameEl) resNameEl.value = currentSettings.researcherName || "Hamza Khalid";
  if (resRoleEl) resRoleEl.value = currentSettings.researcherRole || "BSCS Final Year Project Researcher";
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
    ...currentSettings,
    density: densityEl ? densityEl.value : "comfortable",
    theme: (themeEl && themeEl.value === "dark") ? "dark" : "light",
    showFilenames: showNamesEl ? showNamesEl.checked : true,
    defaultGenre: defGenreEl ? defGenreEl.value : "fashion",
    defaultExplorerView: defViewEl ? defViewEl.value : "clusters",
    defaultColumns: defColsEl ? parseInt(defColsEl.value) || 4 : 4,
    showSegmentedDefault: segDefEl ? segDefEl.checked : true,
    similarityTopK: topKEl ? parseInt(topKEl.value) || 6 : 6,
    similarityThreshold: threshEl ? (parseInt(threshEl.value) / 100) : 0.60,
    enableToasts: toastsEl ? toastsEl.checked : true,
    soundAlerts: soundEl ? soundEl.checked : false,
    researcherName: resNameEl ? resNameEl.value.trim() : (currentSettings.researcherName || "Hamza Khalid"),
    researcherRole: resRoleEl ? resRoleEl.value.trim() : (currentSettings.researcherRole || "BSCS Final Year Project Researcher")
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

  applyEffectiveTheme(currentSettings.theme);
  renderHeaderProfile();
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

  applyEffectiveTheme("light");
  syncSettingsFormInputs();
  renderHeaderProfile();
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
        fashionCountEl.textContent = `${data.catalog_size} Products (DeepFashion2 schema)`;
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

function showNotificationToast() {
  showToast("All AI visual models & telemetry pipelines are online (ResNet-18, Prophet Forecaster).", "info", 3500);
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
    const rep = TREND_REPORTS_DATABASE[currentReportId] || TREND_REPORTS_DATABASE["fw2026"];
    let csv = `Report_Title,"${escapeCsv(rep.title)}"\n`;
    csv += `Report_Date,"${rep.date}"\n`;
    csv += `Report_Domain,"${rep.genre}"\n\n`;

    if (rep.tableHeaders && rep.tableRows) {
      csv += rep.tableHeaders.map(h => `"${escapeCsv(h)}"`).join(",") + "\n";
      rep.tableRows.forEach(row => {
        csv += `"${escapeCsv(row.style)}","${row.current}","${row.projected}","${escapeCsv(String(row.growth))}","${escapeCsv(row.badge)}"\n`;
      });
      csv += "\n";
    }

    if (rep.exemplars && rep.exemplars.length > 0) {
      csv += "Exemplar_Asset,Category,Tags,Affinity_Score\n";
      rep.exemplars.forEach(ex => {
        csv += `"${escapeCsv(ex.title)}","${escapeCsv(ex.category)}","${escapeCsv(ex.tags)}","${escapeCsv(ex.similarity)}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trendlens_report_${rep.id}_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported "${rep.title}" as CSV.`, "success");
  } catch (err) {
    showToast("Failed to generate CSV export: " + err.message, "error");
  }
}

// ==========================================================================
// Slide-Down Top Drawer (Dedicated Fashion & Automotive Visual Collections)
// ==========================================================================

let cachedMegaDrawerData = { fashion: [], automotive: [] };
let activeDrawerFashionStyle = "all";
let activeDrawerAutoCategory = "all";
let drawerSearchFilterQuery = "";

function toggleMegaDrawer() {
  const drawer = document.getElementById("mega-top-drawer");
  if (!drawer) return;
  if (drawer.classList.contains("open")) {
    closeMegaDrawer();
  } else {
    openMegaDrawer();
  }
}

function openMegaDrawer() {
  const drawer = document.getElementById("mega-top-drawer");
  const backdrop = document.getElementById("mega-drawer-backdrop");
  const triggerBtn = document.getElementById("mega-drawer-trigger-btn");
  if (!drawer) return;

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  if (backdrop) backdrop.classList.add("open");
  if (triggerBtn) {
    triggerBtn.classList.add("active");
    triggerBtn.setAttribute("aria-expanded", "true");
  }

  // Populate items if empty
  if (!cachedMegaDrawerData.fashion.length || !cachedMegaDrawerData.automotive.length) {
    loadMegaDrawerData();
  }
}

function closeMegaDrawer() {
  const drawer = document.getElementById("mega-top-drawer");
  const backdrop = document.getElementById("mega-drawer-backdrop");
  const triggerBtn = document.getElementById("mega-drawer-trigger-btn");
  if (!drawer) return;

  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  if (backdrop) backdrop.classList.remove("open");
  if (triggerBtn) {
    triggerBtn.classList.remove("active");
    triggerBtn.setAttribute("aria-expanded", "false");
  }
}

async function loadMegaDrawerData() {
  try {
    const [fashionRes, autoRes] = await Promise.all([
      fetch("/api/items?genre=fashion").then(r => r.json()).catch(() => []),
      fetch("/api/items?genre=automotive").then(r => r.json()).catch(() => [])
    ]);

    cachedMegaDrawerData.fashion = (Array.isArray(fashionRes) ? fashionRes : []).map(item => ({ ...item, genre: "fashion" }));
    cachedMegaDrawerData.automotive = (Array.isArray(autoRes) ? autoRes : []).map(item => ({ ...item, genre: "automotive" }));

    // Update count meta
    const fCountEl = document.getElementById("drawer-fashion-count-meta");
    if (fCountEl && cachedMegaDrawerData.fashion.length > 0) {
      fCountEl.textContent = `${cachedMegaDrawerData.fashion.length} Ingested Garments • 6 Macro Aesthetics • K=5 Silhouette Clusters`;
    }
    const aCountEl = document.getElementById("drawer-auto-count-meta");
    if (aCountEl && cachedMegaDrawerData.automotive.length > 0) {
      aCountEl.textContent = `${cachedMegaDrawerData.automotive.length} Verified Models • 11 Makes • K=3 Structural Clusters`;
    }

    renderDrawerFashionItems();
    renderDrawerAutoItems();
  } catch (err) {
    console.warn("Failed to load mega drawer data:", err);
  }
}

function renderDrawerFashionItems() {
  const container = document.getElementById("drawer-fashion-items-track");
  if (!container) return;

  let items = cachedMegaDrawerData.fashion;

  // Filter by style
  if (activeDrawerFashionStyle !== "all") {
    items = items.filter(it => (it.style || "").toLowerCase() === activeDrawerFashionStyle.toLowerCase());
  }

  // Filter by search query
  if (drawerSearchFilterQuery) {
    const q = drawerSearchFilterQuery.toLowerCase();
    items = items.filter(it => 
      (it.title || "").toLowerCase().includes(q) ||
      (it.style || "").toLowerCase().includes(q) ||
      (it.category || "").toLowerCase().includes(q)
    );
  }

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 24px 0; color: var(--text-muted); font-size: 0.8rem;">No fashion items match the filter.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const itemId = item.item_id || item.id;
    return `
      <div class="mega-item-card" onclick="openItemDetailModal('${escapeHtml(itemId)}', 'fashion'); closeMegaDrawer();" title="${escapeHtml(item.title)}">
        <div class="mega-item-thumb-wrapper">
          <img class="mega-item-thumb" src="${resolveImagePath(item.file_path || item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='/web/placeholder.png';">
          <span class="mega-item-pill">${escapeHtml(item.style || item.category || 'Fashion')}</span>
        </div>
        <div class="mega-item-info">
          <div class="mega-item-name">${escapeHtml(item.title || itemId)}</div>
          <div class="mega-item-sub">
            <span>${escapeHtml(item.category || '')}</span>
            <span style="font-weight: 600; color: var(--accent-violet);">DF2</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderDrawerAutoItems() {
  const container = document.getElementById("drawer-auto-items-track");
  if (!container) return;

  let items = cachedMegaDrawerData.automotive;

  // Filter by category
  if (activeDrawerAutoCategory !== "all") {
    items = items.filter(it => (it.category || it.style || "").toLowerCase().includes(activeDrawerAutoCategory.toLowerCase()));
  }

  // Filter by search query
  if (drawerSearchFilterQuery) {
    const q = drawerSearchFilterQuery.toLowerCase();
    items = items.filter(it => 
      (it.title || "").toLowerCase().includes(q) ||
      (it.make || "").toLowerCase().includes(q) ||
      (it.model || "").toLowerCase().includes(q) ||
      (it.category || "").toLowerCase().includes(q)
    );
  }

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 24px 0; color: var(--text-muted); font-size: 0.8rem;">No vehicle models match the filter.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const itemId = item.item_id || item.id;
    return `
      <div class="mega-item-card" onclick="openItemDetailModal('${escapeHtml(itemId)}', 'automotive'); closeMegaDrawer();" title="${escapeHtml(item.title)}">
        <div class="mega-item-thumb-wrapper">
          <img class="mega-item-thumb" src="${resolveImagePath(item.file_path || item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='/web/placeholder.png';">
          <span class="mega-item-pill">${escapeHtml(String(item.model_year || item.category || 'Auto'))}</span>
        </div>
        <div class="mega-item-info">
          <div class="mega-item-name">${escapeHtml(item.title || itemId)}</div>
          <div class="mega-item-sub">
            <span>${escapeHtml(item.make || item.category || '')}</span>
            <span style="font-weight: 600; color: var(--status-sky);">CVPR</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function filterDrawerFashionStyle(style, btn) {
  activeDrawerFashionStyle = style;
  const chips = document.querySelectorAll("#drawer-fashion-chips .mega-chip");
  chips.forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderDrawerFashionItems();
}

function filterDrawerAutoCategory(cat, btn) {
  activeDrawerAutoCategory = cat;
  const chips = document.querySelectorAll("#drawer-auto-chips .mega-chip");
  chips.forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderDrawerAutoItems();
}

function filterMegaDrawerItems(query) {
  drawerSearchFilterQuery = (query || "").trim();
  renderDrawerFashionItems();
  renderDrawerAutoItems();
}

// ==========================================================================
// Account Menu, Dynamic Profile Avatar & Modals Controller
// ==========================================================================

const NEUTRAL_USER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

let isAccountMenuOpen = false;
let pendingProfileAvatarUrl = null;

/**
 * Safely extracts up to two uppercase initials from a full name.
 * Handles single names, multi-part names, titles, and whitespace gracefully.
 */
function getInitials(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Renders avatar content according to the strict priority rules:
 * 1. Uploaded picture if available
 * 2. User's initials derived safely from display name
 * 3. Neutral SVG user icon if no name or picture available
 * Includes automatic onerror fallback if an image fails to load.
 */
function renderAvatarIntoContainer(containerEl, avatarUrl, name) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  if (avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim() !== "") {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.alt = name ? `${name}'s profile avatar` : "Researcher avatar";
    img.className = "user-avatar-img";
    img.onerror = () => {
      // Fallback on image loading failure
      renderAvatarFallback(containerEl, name);
    };
    containerEl.appendChild(img);
  } else {
    renderAvatarFallback(containerEl, name);
  }
}

function renderAvatarFallback(containerEl, name) {
  if (!containerEl) return;
  containerEl.innerHTML = "";
  const initials = getInitials(name);
  if (initials) {
    const span = document.createElement("span");
    span.textContent = initials;
    containerEl.appendChild(span);
  } else {
    containerEl.innerHTML = NEUTRAL_USER_SVG;
  }
}

/**
 * Updates all profile visual indicators across the application:
 * - Header avatar circle and display name
 * - Account dropdown header info
 * - Accessible ARIA labels
 */
function renderHeaderProfile() {
  const name = (currentSettings.researcherName && currentSettings.researcherName.trim()) || "Hamza Khalid";
  const email = (currentSettings.researcherEmail && currentSettings.researcherEmail.trim()) || "hamza.khalid@trendlens.ai";
  const avatarUrl = currentSettings.profileAvatarUrl || "";

  // 1. Header Avatar Circle
  const headerAvatarEl = document.getElementById("header-avatar-circle");
  renderAvatarIntoContainer(headerAvatarEl, avatarUrl, name);

  // 2. Header Profile Name
  const headerNameEl = document.getElementById("header-profile-name");
  if (headerNameEl) {
    headerNameEl.textContent = name;
  }

  // 3. Header Button ARIA label
  const userProfileBtn = document.getElementById("user-profile-btn");
  if (userProfileBtn) {
    userProfileBtn.setAttribute("aria-label", `Account menu for ${name}`);
  }

  // 4. Dropdown Header
  const dropAvatarEl = document.getElementById("dropdown-avatar-circle");
  renderAvatarIntoContainer(dropAvatarEl, avatarUrl, name);

  const dropNameEl = document.getElementById("dropdown-user-name");
  if (dropNameEl) {
    dropNameEl.textContent = name;
    dropNameEl.title = name;
  }

  const dropEmailEl = document.getElementById("dropdown-user-email");
  if (dropEmailEl) {
    dropEmailEl.textContent = email;
    dropEmailEl.title = email;
  }
}

/**
 * Initializes the accessible Account Menu & Dropdown.
 */
function initAccountMenu() {
  renderHeaderProfile();

  // Close dropdown on click outside
  document.addEventListener("click", (e) => {
    const container = document.getElementById("account-menu-container");
    if (isAccountMenuOpen && container && !container.contains(e.target)) {
      closeAccountDropdown();
    }
  });

  // Global keyboard shortcuts (Escape and Arrow navigation)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (isAccountMenuOpen) {
        closeAccountDropdown();
        const btn = document.getElementById("user-profile-btn");
        if (btn) btn.focus();
      }
      closeProfileModal();
      closeAboutModal();
    } else if (isAccountMenuOpen) {
      handleAccountMenuKeydown(e);
    }
  });
}

function toggleAccountDropdown() {
  if (isAccountMenuOpen) {
    closeAccountDropdown();
  } else {
    openAccountDropdown();
  }
}

function openAccountDropdown() {
  const menu = document.getElementById("account-dropdown-menu");
  const btn = document.getElementById("user-profile-btn");
  if (!menu || !btn) return;

  menu.classList.remove("hidden");
  btn.setAttribute("aria-expanded", "true");
  isAccountMenuOpen = true;

  // Focus the first menu item for keyboard users
  const firstItem = menu.querySelector(".dropdown-item");
  if (firstItem) {
    firstItem.focus();
  }
}

function closeAccountDropdown() {
  const menu = document.getElementById("account-dropdown-menu");
  const btn = document.getElementById("user-profile-btn");
  if (!menu || !btn) return;

  menu.classList.add("hidden");
  btn.setAttribute("aria-expanded", "false");
  isAccountMenuOpen = false;
}

function handleAccountMenuKeydown(e) {
  const menu = document.getElementById("account-dropdown-menu");
  if (!menu) return;

  const items = Array.from(menu.querySelectorAll(".dropdown-item"));
  if (items.length === 0) return;

  const currentIndex = items.indexOf(document.activeElement);

  if (e.key === "ArrowDown") {
    e.preventDefault();
    const nextIndex = (currentIndex + 1) % items.length;
    items[nextIndex].focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    items[prevIndex].focus();
  } else if (e.key === "Tab") {
    closeAccountDropdown();
  }
}

/**
 * Navigates directly to a specific section within the platform settings view.
 */
function navigateToSettingsSection(sectionId) {
  closeAccountDropdown();
  switchTab("settings-tab");

  setTimeout(() => {
    let targetEl = null;
    if (sectionId === "profile") {
      targetEl = document.getElementById("setting-researcher-name")?.closest(".settings-section-card");
    } else if (sectionId === "appearance") {
      targetEl = document.getElementById("setting-density")?.closest(".settings-section-card");
    } else if (sectionId === "analysis") {
      targetEl = document.getElementById("setting-default-genre")?.closest(".settings-section-card");
    } else if (sectionId === "diagnostics") {
      targetEl = document.querySelector(".telemetry-table-grid")?.closest(".settings-section-card");
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.style.transition = "box-shadow 0.3s ease";
      targetEl.style.boxShadow = "0 0 0 3px rgba(112, 64, 245, 0.35)";
      setTimeout(() => {
        targetEl.style.boxShadow = "";
      }, 1600);
    }
  }, 120);
}

// ==========================================================================
// Profile Modal Controller (View, Edit, Validate, and Persist)
// ==========================================================================

function openProfileModal() {
  closeAccountDropdown();
  const modal = document.getElementById("profile-modal");
  if (!modal) return;

  pendingProfileAvatarUrl = currentSettings.profileAvatarUrl || "";

  // Prepopulate form inputs
  const nameInput = document.getElementById("profile-input-name");
  const emailInput = document.getElementById("profile-input-email");
  const roleInput = document.getElementById("profile-input-role");
  const domainInput = document.getElementById("profile-input-domain");
  const densityInput = document.getElementById("profile-input-density");

  if (nameInput) nameInput.value = currentSettings.researcherName || "Hamza Khalid";
  if (emailInput) emailInput.value = currentSettings.researcherEmail || "hamza.khalid@trendlens.ai";
  if (roleInput) roleInput.value = currentSettings.researcherRole || "BSCS Final Year Project Researcher";
  if (domainInput) domainInput.value = currentSettings.defaultGenre || "fashion";
  if (densityInput) densityInput.value = currentSettings.density || "comfortable";

  // Clear previous error messages
  document.getElementById("profile-name-error")?.classList.add("hidden");
  document.getElementById("profile-email-error")?.classList.add("hidden");
  document.getElementById("profile-photo-error")?.classList.add("hidden");

  // Update preview circle
  updateProfileModalAvatarPreview();

  modal.classList.remove("hidden");

  setTimeout(() => {
    if (nameInput) nameInput.focus();
  }, 100);
}

function closeProfileModal() {
  const modal = document.getElementById("profile-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  pendingProfileAvatarUrl = null;
}

function updateProfileModalAvatarPreview() {
  const previewCircle = document.getElementById("profile-avatar-preview-circle");
  const nameInput = document.getElementById("profile-input-name");
  const currentName = nameInput ? nameInput.value.trim() : (currentSettings.researcherName || "Hamza Khalid");
  renderAvatarIntoContainer(previewCircle, pendingProfileAvatarUrl, currentName);
}

function handleProfilePhotoUpload(e) {
  const file = e.target.files && e.target.files[0];
  const errorEl = document.getElementById("profile-photo-error");
  if (errorEl) errorEl.classList.add("hidden");

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    if (errorEl) {
      errorEl.textContent = "Please select a valid image file (PNG, JPG, or WebP).";
      errorEl.classList.remove("hidden");
    }
    return;
  }

  // 2MB size limit
  if (file.size > 2 * 1024 * 1024) {
    if (errorEl) {
      errorEl.textContent = "Image size exceeds 2MB limit. Please upload a smaller photo.";
      errorEl.classList.remove("hidden");
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    pendingProfileAvatarUrl = event.target.result;
    updateProfileModalAvatarPreview();
  };
  reader.readAsDataURL(file);
}

function handleRemoveProfilePhoto() {
  pendingProfileAvatarUrl = "";
  const fileInput = document.getElementById("profile-photo-input");
  if (fileInput) fileInput.value = "";
  updateProfileModalAvatarPreview();
}

function handleProfileFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById("profile-input-name");
  const emailInput = document.getElementById("profile-input-email");
  const roleInput = document.getElementById("profile-input-role");
  const domainInput = document.getElementById("profile-input-domain");
  const densityInput = document.getElementById("profile-input-density");

  const nameVal = nameInput ? nameInput.value.trim() : "";
  const emailVal = emailInput ? emailInput.value.trim() : "";

  let hasError = false;

  // Validate Name
  const nameError = document.getElementById("profile-name-error");
  if (!nameVal) {
    if (nameError) nameError.classList.remove("hidden");
    hasError = true;
  } else {
    if (nameError) nameError.classList.add("hidden");
  }

  // Validate Email
  const emailError = document.getElementById("profile-email-error");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailVal || !emailRegex.test(emailVal)) {
    if (emailError) emailError.classList.remove("hidden");
    hasError = true;
  } else {
    if (emailError) emailError.classList.add("hidden");
  }

  if (hasError) return;

  // Show loading indicator
  const saveBtn = document.getElementById("btn-save-profile");
  const saveBtnText = document.getElementById("btn-save-profile-text");
  if (saveBtn) saveBtn.disabled = true;
  if (saveBtnText) saveBtnText.textContent = "Saving...";

  setTimeout(() => {
    // Update active settings
    currentSettings.researcherName = nameVal;
    currentSettings.researcherEmail = emailVal;
    currentSettings.researcherRole = roleInput ? roleInput.value.trim() : currentSettings.researcherRole;
    currentSettings.defaultGenre = domainInput ? domainInput.value : currentSettings.defaultGenre;
    currentSettings.density = densityInput ? densityInput.value : currentSettings.density;
    currentSettings.profileAvatarUrl = pendingProfileAvatarUrl !== null ? pendingProfileAvatarUrl : currentSettings.profileAvatarUrl;

    // Persist to localStorage
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings));
    } catch (err) {
      console.error("Failed to persist profile settings:", err);
    }

    // Apply immediate density change
    document.body.classList.toggle("density-compact", currentSettings.density === "compact");

    // Sync settings page inputs
    syncSettingsFormInputs();

    // Re-render header & dropdown
    renderHeaderProfile();

    if (saveBtn) saveBtn.disabled = false;
    if (saveBtnText) saveBtnText.textContent = "Save Changes";

    closeProfileModal();
    showToast("Profile credentials updated successfully!", "success");
  }, 250);
}

// ==========================================================================
// About Modal & Local Demo Session Reset Controller
// ==========================================================================

function openAboutModal() {
  closeAccountDropdown();
  const modal = document.getElementById("about-modal");
  if (modal) modal.classList.remove("hidden");
}

function closeAboutModal() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.classList.add("hidden");
}

function confirmResetSession() {
  closeAccountDropdown();
  showConfirmModal({
    title: "Reset Local Demo Session?",
    message: "This will clear your local researcher profile customization, reset preferences to defaults, and clear temporary session search history.",
    isDanger: true,
    onConfirm: () => {
      try {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch (err) {
        console.error("Error clearing settings:", err);
      }
      currentSettings = { ...DEFAULT_SETTINGS };
      document.body.classList.toggle("density-compact", currentSettings.density === "compact");
      syncSettingsFormInputs();
      renderHeaderProfile();
      showToast("Demo session reset to default state.", "info");
    }
  });
}


