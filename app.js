const API_BASE = "https://jakeconcha.pythonanywhere.com/api/catalog";

const STORES = {
  delu: {
    slug: "delu",
    title: "deluLubes",
    badge: "deluLubes Catalog",
    description:
      "Smooth lubricants, flavors, and adult essentials in a browse-first storefront with bot checkout handoff.",
    botUrl: "https://t.me/delulubesbot",
    accent: "#4ee1ff",
    accentSecondary: "#9ef3ff",
    accentGlow: "rgba(78, 225, 255, 0.24)",
    accentGold: "#ffe4a3",
    fallbackImage:
      "https://raw.githubusercontent.com/jcitservices-ai/delulubes/main/assets/welcome.png",
  },
  poppers: {
    slug: "poppers",
    title: "PoppersGuyPH",
    badge: "PoppersGuyPH Catalog",
    description:
      "Fast browse experience for PoppersGuyPH with category filters, stock-aware product cards, and bot ordering.",
    botUrl: "https://t.me/PoppersGuyPHbot",
    accent: "#c81d39",
    accentSecondary: "#f1c16b",
    accentGlow: "rgba(200, 29, 57, 0.28)",
    accentGold: "#f6d18d",
    fallbackImage:
      "https://raw.githubusercontent.com/jcitservices-ai/delulubes/main/poppersguyph/assets/pgphlogo.png",
  },
};

const tele = window.Telegram?.WebApp;
if (tele) {
  tele.ready();
  tele.expand();
}

const state = {
  store: null,
  products: [],
  categories: [],
  activeCategory: "All",
  search: "",
};

function openAiCheckout() {
  const url = new URL(window.location.href);
  url.searchParams.set("open_chat", "1");
  url.searchParams.delete("ai_checkout");
  url.hash = "";
  window.location.href = url.toString();
}

function detectStore() {
  const host = window.location.hostname.replace(/^www\./, "").toLowerCase();
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const firstSegment = path.split("/")[0];
  const searchStore = new URLSearchParams(window.location.search).get("store");

  if (
    host === "poppers.jcit.digital" ||
    host === "project-jaz0l.vercel.app" ||
    host === "project-jaz0l-jakeconcha-7757s-projects.vercel.app"
  ) {
    return STORES.poppers;
  }

  if (host === "delu.jcit.digital") {
    return STORES.delu;
  }

  return STORES[firstSegment] || STORES[path] || STORES[searchStore] || STORES.delu;
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function applyStoreTheme(store) {
  document.title = `${store.title} Catalog`;
  document.documentElement.dataset.store = store.slug;
  document.documentElement.style.setProperty("--accent", store.accent);
  document.documentElement.style.setProperty("--accent-2", store.accentSecondary || store.accent);
  document.documentElement.style.setProperty("--accent-glow", store.accentGlow || "rgba(78, 225, 255, 0.24)");
  document.documentElement.style.setProperty("--accent-gold", store.accentGold || store.accentSecondary || store.accent);
  document.getElementById("store-title").textContent = store.title;
  document.getElementById("store-badge").textContent = store.badge;
  document.getElementById("store-description").textContent = store.description;
}

function renderFilters() {
  const wrap = document.getElementById("filters");
  wrap.innerHTML = "";
  ["All", ...state.categories].forEach((category) => {
    const button = document.createElement("button");
    button.className = `filter-button${state.activeCategory === category ? " is-active" : ""}`;
    button.type = "button";
    button.textContent = category;
    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderFilters();
      renderProducts();
    });
    wrap.appendChild(button);
  });
}

function filteredProducts() {
  return state.products.filter((product) => {
    const matchCategory =
      state.activeCategory === "All" || product.category === state.activeCategory;
    const haystack = [product.name, product.category, product.description, product.sku]
      .join(" ")
      .toLowerCase();
    const matchSearch = haystack.includes(state.search.toLowerCase());
    return matchCategory && matchSearch;
  });
}

function resolveProductImage(product) {
  const image = String(product.image_url || "").trim();
  if (!image || image.toLowerCase() === "none") {
    return state.store.fallbackImage;
  }
  return image;
}

function renderProducts() {
  const list = filteredProducts();
  const grid = document.getElementById("product-grid");
  const template = document.getElementById("product-card-template");
  grid.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No products match this filter yet.";
    grid.appendChild(empty);
    return;
  }

  list.forEach((product) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const image = node.querySelector(".product-card__image");
    image.src = resolveProductImage(product);
    image.alt = product.name;
    node.querySelector(".product-card__category").textContent = product.category;
    node.querySelector(".product-card__stock").textContent = `${product.stock_label} in stock`;
    node.querySelector(".product-card__title").textContent = product.name;
    node.querySelector(".product-card__description").textContent =
      product.description || "No description yet.";
    node.querySelector(".product-card__price").textContent = peso(product.price);
    const actionButton = node.querySelector(".product-card__button");
    actionButton.addEventListener("click", openAiCheckout);
    grid.appendChild(node);
  });
}

function updateMeta() {
  document.getElementById("product-count").textContent = `${state.products.length} items`;
  document.getElementById("category-count").textContent = `${state.categories.length} categories`;
}

async function loadCatalog() {
  const response = await fetch(`${API_BASE}/${state.store.slug}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${state.store.slug} catalog`);
  }
  const payload = await response.json();
  state.products = payload.products || [];
  state.categories = payload.categories || [];
  updateMeta();
  renderFilters();
  renderProducts();
}

function bindEvents() {
  document.getElementById("search").addEventListener("input", (event) => {
    state.search = event.target.value || "";
    renderProducts();
  });

  document.getElementById("copy-link").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      document.getElementById("copy-link").textContent = "Link Copied";
      setTimeout(() => {
        document.getElementById("copy-link").textContent = "Copy Store Link";
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  });
}

async function main() {
  state.store = detectStore();
  applyStoreTheme(state.store);
  bindEvents();
  try {
    await loadCatalog();
  } catch (error) {
    console.error(error);
    document.getElementById("product-grid").innerHTML =
      '<div class="empty-state">Catalog failed to load. Please try again in a moment.</div>';
  }
}

main();
