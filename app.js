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
    description: "Browse and order in a few taps.",
    botUrl: "https://t.me/PoppersGuyPHbot",
    accent: "#f4c542",
    accentSecondary: "#ffe18a",
    accentGlow: "rgba(244, 197, 66, 0.24)",
    accentGold: "#d6a300",
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
  cart: {
    cart_session_id: "",
    items: [],
  },
  lastQuote: null,
};

function referralStorageKey() {
  return `${state.store.slug}_referral_code`;
}

function getTelegramMiniAppUser() {
  const user = tele?.initDataUnsafe?.user;
  if (!user || typeof user !== "object") {
    return null;
  }
  const firstName = String(user.first_name || "").trim();
  const lastName = String(user.last_name || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const username = String(user.username || "").trim().replace(/^@/, "");
  const userId = String(user.id || "").trim();
  return {
    id: userId,
    username,
    firstName,
    lastName,
    fullName,
    displayTelegram: username ? `@${username}` : userId,
    initData: String(tele?.initData || "").trim(),
  };
}

function getTrackingLink(orderId) {
  const url = new URL(`/${state.store.slug}/track`, window.location.origin);
  if (orderId) {
    url.searchParams.set("order_id", orderId);
  }
  return url.toString();
}

function getOwnReferralCode() {
  const telegramUser = getTelegramMiniAppUser();
  if (telegramUser?.username) {
    return `PGPH-${telegramUser.username.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 10)}`;
  }
  if (telegramUser?.id) {
    return `PGPH-${String(telegramUser.id).slice(-6)}`;
  }
  return `PGPH-${state.cart.cart_session_id.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(-6)}`;
}

function readStoredReferralCode() {
  try {
    return String(window.localStorage.getItem(referralStorageKey()) || "").trim().toUpperCase();
  } catch (_) {
    return "";
  }
}

function writeStoredReferralCode(code) {
  try {
    if (!code) {
      window.localStorage.removeItem(referralStorageKey());
      return;
    }
    window.localStorage.setItem(referralStorageKey(), String(code || "").trim().toUpperCase());
  } catch (_) {
    // Ignore storage failures.
  }
}

function showOrderSuccessPopup(order) {
  const wrap = document.getElementById("order-success");
  if (!wrap || !order) {
    return;
  }
  const number = document.getElementById("order-success-number");
  const link = document.getElementById("order-success-track-link");
  if (number) {
    number.textContent = order.order_id || "-";
  }
  if (link) {
    link.href = getTrackingLink(order.order_id);
  }
  wrap.hidden = false;
  document.body.classList.add("has-order-success");
  wrap.querySelectorAll("[data-order-success-close]").forEach((node) => {
    node.addEventListener(
      "click",
      () => {
        wrap.hidden = true;
        document.body.classList.remove("has-order-success");
      },
      { once: true }
    );
  });
}

function renderReferralPanel() {
  const ownCode = document.getElementById("own-referral-code");
  const checkoutField = document.querySelector('input[name="referral_code"]');
  const params = new URLSearchParams(window.location.search);
  const incomingCode = String(params.get("ref") || "").trim().toUpperCase();
  const savedCode = incomingCode || readStoredReferralCode();
  if (incomingCode) {
    writeStoredReferralCode(incomingCode);
  }
  if (ownCode) {
    ownCode.textContent = getOwnReferralCode();
  }
  if (checkoutField && savedCode && !checkoutField.value.trim()) {
    checkoutField.value = savedCode;
  }
}

function showMiniAppGuide() {
  if (!tele || currentPage() !== "catalog") {
    return;
  }
  const guide = document.getElementById("miniapp-guide");
  if (!guide) {
    return;
  }
  guide.hidden = false;
  document.body.classList.add("has-miniapp-guide");
  guide.querySelectorAll("[data-guide-close]").forEach((node) => {
    node.addEventListener(
      "click",
      () => {
        guide.hidden = true;
        document.body.classList.remove("has-miniapp-guide");
      },
      { once: true }
    );
  });
}

function currentPage() {
  return document.body?.dataset.page || "catalog";
}

function addressDraftStorageKey() {
  return `${state.store.slug}_delivery_address_draft`;
}

function checkoutDraftStorageKey() {
  return `${state.store.slug}_checkout_draft`;
}

function cartStorageKey() {
  return `${state.store.slug}_catalog_cart`;
}

function readStoredAddressDraft() {
  try {
    const raw = window.localStorage.getItem(addressDraftStorageKey());
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeStoredAddressDraft(value) {
  try {
    window.localStorage.setItem(addressDraftStorageKey(), JSON.stringify(value || {}));
  } catch (_) {
    // Ignore storage failures.
  }
}

function readStoredCheckoutDraft() {
  try {
    const raw = window.localStorage.getItem(checkoutDraftStorageKey());
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function writeStoredCheckoutDraft(value) {
  try {
    window.localStorage.setItem(checkoutDraftStorageKey(), JSON.stringify(value || {}));
  } catch (_) {
    // Ignore storage failures.
  }
}

function makeCartSessionId() {
  if (window.crypto?.randomUUID) {
    return `${state.store.slug}-${window.crypto.randomUUID()}`;
  }
  return `${state.store.slug}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredCart() {
  try {
    const raw = window.localStorage.getItem(cartStorageKey());
    const parsed = raw ? JSON.parse(raw) : null;
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return {
      cart_session_id: parsed?.cart_session_id || makeCartSessionId(),
      items,
    };
  } catch (_) {
    return {
      cart_session_id: makeCartSessionId(),
      items: [],
    };
  }
}

function writeStoredCart(cart) {
  window.localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
}

function upsertCartItem(product) {
  const cart = state.cart.cart_session_id ? state.cart : readStoredCart();
  const targetSku = String(product.sku || "").trim();
  const existing = cart.items.find((item) => String(item.sku || "").trim() === targetSku);
  if (existing) {
    existing.qty = Number(existing.qty || 0) + 1;
    existing.name = product.name;
    existing.price = Number(product.price || 0);
    existing.category = product.category;
  } else {
    cart.items.push({
      sku: targetSku,
      qty: 1,
      name: product.name,
      price: Number(product.price || 0),
      category: product.category,
    });
  }
  state.cart = cart;
  writeStoredCart(cart);
  renderCheckout();
  return cart;
}

function setFeedback(message, tone = "") {
  const node = document.getElementById("checkout-feedback");
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.className = `checkout-feedback${tone ? ` is-${tone}` : ""}`;
}

function productMap() {
  return new Map(state.products.map((product) => [String(product.sku || "").trim(), product]));
}

function hydrateCartItems(items) {
  const map = productMap();
  return (items || [])
    .map((item) => {
      const sku = String(item.sku || "").trim();
      const product = map.get(sku);
      if (!product) {
        return null;
      }
      return {
        sku,
        qty: Number(item.qty || 0),
        name: product.name,
        price: Number(product.price || 0),
        category: product.category,
      };
    })
    .filter((item) => item && item.qty > 0);
}

function removeCartItem(sku) {
  state.cart.items = state.cart.items.filter((item) => String(item.sku || "").trim() !== String(sku || "").trim());
  writeStoredCart(state.cart);
  state.lastQuote = null;
  renderCheckout();
}

function changeCartQty(sku, delta) {
  const item = state.cart.items.find((entry) => String(entry.sku || "").trim() === String(sku || "").trim());
  if (!item) {
    return;
  }
  item.qty = Number(item.qty || 0) + Number(delta || 0);
  if (item.qty <= 0) {
    removeCartItem(sku);
    return;
  }
  writeStoredCart(state.cart);
  state.lastQuote = null;
  renderCheckout();
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
  const page = currentPage();
  document.title =
    page === "checkout"
      ? `${store.title} Checkout`
      : page === "track"
        ? `${store.title} Track Order`
        : page === "address"
          ? `${store.title} Delivery Address`
          : `${store.title} Catalog`;
  document.documentElement.dataset.store = store.slug;
  document.documentElement.style.setProperty("--accent", store.accent);
  document.documentElement.style.setProperty("--accent-2", store.accentSecondary || store.accent);
  document.documentElement.style.setProperty("--accent-glow", store.accentGlow || "rgba(78, 225, 255, 0.24)");
  document.documentElement.style.setProperty("--accent-gold", store.accentGold || store.accentSecondary || store.accent);
  const title = document.getElementById("store-title");
  const badge = document.getElementById("store-badge");
  const description = document.getElementById("store-description");
  if (title) {
    title.textContent =
      page === "checkout"
        ? `${store.title} Checkout`
        : page === "track"
          ? "Track your order"
          : page === "address"
            ? "Set your delivery point"
            : store.title;
  }
  if (badge) {
    badge.textContent =
      page === "checkout"
        ? "Checkout"
        : page === "track"
          ? "Order Tracking"
          : page === "address"
            ? "Delivery Address"
            : store.badge;
  }
  if (description) {
    const descriptionText =
      page === "track"
        ? "Use your order number to check status."
        : page === "address"
          ? "Verify the address first, then continue to checkout."
          : "";
    description.textContent = descriptionText;
    description.hidden = !descriptionText;
  }
}

function renderFilters() {
  const wrap = document.getElementById("filters");
  if (!wrap) {
    return;
  }
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
  if (!grid || !template) {
    return;
  }
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
    node.querySelector(".product-card__title").textContent = product.name;
    node.querySelector(".product-card__description").textContent =
      product.description || "No description yet.";
    node.querySelector(".product-card__price").textContent = peso(product.price);
    const actionButton = node.querySelector(".product-card__button");
    actionButton.addEventListener("click", () => upsertCartItem(product));
    grid.appendChild(node);
  });
}

function renderCartSummary() {
  const cartCount = document.getElementById("cart-count");
  const checkoutButtons = document.querySelectorAll("[data-go-checkout]");
  const items = hydrateCartItems(state.cart.items);
  state.cart.items = items;
  writeStoredCart(state.cart);
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  if (cartCount) {
    cartCount.textContent = String(totalQty);
  }
  checkoutButtons.forEach((button) => {
    button.disabled = totalQty <= 0;
  });
}

function renderCheckout() {
  const shell = document.getElementById("checkout-shell");
  if (!shell) {
    renderCartSummary();
    return;
  }
  const empty = document.getElementById("cart-empty");
  const list = document.getElementById("cart-list");
  const totals = document.getElementById("cart-totals");
  const items = hydrateCartItems(state.cart.items);
  state.cart.items = items;
  writeStoredCart(state.cart);
  list.innerHTML = "";

  if (!items.length) {
    empty.hidden = false;
    totals.hidden = true;
    list.innerHTML = "";
    const checkoutButtons = document.querySelectorAll("[data-go-checkout]");
    checkoutButtons.forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  empty.hidden = true;
  const checkoutButtons = document.querySelectorAll("[data-go-checkout]");
  checkoutButtons.forEach((button) => {
    button.disabled = false;
  });
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div class="cart-row__copy">
        <strong>${item.name}</strong>
        <span>${item.category}</span>
        <span>${peso(item.price)}</span>
      </div>
      <div class="cart-row__controls">
        <button type="button" data-cart-minus="${item.sku}">-</button>
        <span>${item.qty}</span>
        <button type="button" data-cart-plus="${item.sku}">+</button>
        <button type="button" data-cart-remove="${item.sku}">Remove</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("[data-cart-minus]").forEach((button) =>
    button.addEventListener("click", () => changeCartQty(button.dataset.cartMinus, -1))
  );
  list.querySelectorAll("[data-cart-plus]").forEach((button) =>
    button.addEventListener("click", () => changeCartQty(button.dataset.cartPlus, 1))
  );
  list.querySelectorAll("[data-cart-remove]").forEach((button) =>
    button.addEventListener("click", () => removeCartItem(button.dataset.cartRemove))
  );

  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const quote = state.lastQuote;
  const repeatBuyerBadge =
    quote?.promo_auto_applied && quote?.promo_code
      ? `<div class="checkout-badge checkout-badge--repeat">Repeat buyer discount applied: ${String(quote.promo_code || "LOYAL30").toUpperCase()}</div>`
      : "";
  totals.hidden = false;
  totals.innerHTML = `
    ${repeatBuyerBadge}
    <div class="cart-total-line"><span>Subtotal</span><strong>${peso(subtotal)}</strong></div>
    <div class="cart-total-line"><span>Discount</span><strong>${peso(quote?.discount || 0)}</strong></div>
    <div class="cart-total-line"><span>Delivery Fee</span><strong>${peso(quote?.delivery_fee || 0)}</strong></div>
    <div class="cart-total-line"><span>Shipping & Fees</span><strong>${peso((quote?.shipping || 0) - (quote?.delivery_fee || 0))}</strong></div>
    <div class="cart-total-line cart-total-line--grand"><span>Total</span><strong>${peso(quote?.total || subtotal)}</strong></div>
    ${Array.isArray(quote?.warnings) && quote.warnings.length ? `<div class="field-hint">${quote.warnings.join(" ")}</div>` : ""}
  `;
  renderCartSummary();
}

async function storefrontCheckoutRequest(payload) {
  const response = await fetch("/api/storefront/poppers-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    const message = data.message || "Checkout request failed.";
    const error = new Error(message);
    error.payload = data;
    throw error;
  }
  return data;
}

function collectCheckoutForm() {
  const form = document.getElementById("checkout-form");
  const formData = new FormData(form);
  const telegramUser = getTelegramMiniAppUser();
  const typedTelegram = String(formData.get("telegram_id") || "").trim();
  const telegramUsername =
    telegramUser?.username ||
    (typedTelegram && !/^\d+$/.test(typedTelegram.replace(/^@/, "")) ? typedTelegram.replace(/^@/, "") : "");
  return {
    delivery_name: String(formData.get("delivery_name") || "").trim(),
    telegram_id: telegramUser?.id || typedTelegram,
    telegram_user_id: telegramUser?.id || "",
    telegram_username: telegramUsername,
    telegram_init_data: telegramUser?.initData || "",
    delivery_area: String(formData.get("delivery_area") || "").trim(),
    delivery_contact: String(formData.get("delivery_contact") || "").trim(),
    delivery_address: String(formData.get("delivery_address") || "").trim(),
    promo_code: String(formData.get("promo_code") || "").trim() || "none",
    referral_code: String(formData.get("referral_code") || "").trim().toUpperCase(),
    payment_method: String(formData.get("payment_method") || "").trim(),
    delivery_method: String(formData.get("delivery_method") || "").trim() || "Standard",
  };
}

function persistCheckoutFormDraft(form) {
  if (!form) {
    return;
  }
  const telegramUser = getTelegramMiniAppUser();
  writeStoredCheckoutDraft({
    delivery_name: String(form.elements.delivery_name?.value || "").trim(),
    telegram_id: String(form.elements.telegram_id?.value || "").trim(),
    telegram_user_id: telegramUser?.id || "",
    telegram_username: telegramUser?.username || "",
    telegram_init_data: telegramUser?.initData || "",
    delivery_area: String(form.elements.delivery_area?.value || "").trim(),
    delivery_contact: String(form.elements.delivery_contact?.value || "").trim(),
    delivery_address: String(form.elements.delivery_address?.value || "").trim(),
    promo_code: String(form.elements.promo_code?.value || "").trim(),
    referral_code: String(form.elements.referral_code?.value || "").trim().toUpperCase(),
    payment_method: String(form.elements.payment_method?.value || "").trim(),
    delivery_method: String(form.elements.delivery_method?.value || "").trim() || "Standard",
  });
}

function populateCheckoutFormDraft(form) {
  if (!form) {
    return;
  }
  const draft = readStoredCheckoutDraft();
  const setValue = (name, value) => {
    if (value == null || value === "") {
      return;
    }
    const field = form.elements[name];
    if (field && !String(field.value || "").trim()) {
      field.value = value;
    }
  };
  setValue("delivery_name", draft.delivery_name);
  setValue("telegram_id", draft.telegram_id);
  setValue("delivery_area", draft.delivery_area);
  setValue("delivery_contact", draft.delivery_contact);
  setValue("delivery_address", draft.delivery_address);
  setValue("promo_code", draft.promo_code);
  setValue("referral_code", draft.referral_code);
  setValue("payment_method", draft.payment_method);
  setValue("delivery_method", draft.delivery_method);
}

function configureCheckoutIdentityFields(form) {
  if (!form) {
    return;
  }
  const telegramUser = getTelegramMiniAppUser();
  const telegramWrap = document.getElementById("telegram-field-wrap");
  const telegramLabel = document.getElementById("telegram-field-label");
  const telegramHint = document.getElementById("telegram-field-hint");
  const telegramField = form.elements.telegram_id;
  const contactLabel = document.getElementById("delivery-contact-label");
  const contactHint = document.getElementById("delivery-contact-hint");

  if (telegramUser) {
    if (telegramWrap) {
      telegramWrap.hidden = false;
    }
    if (telegramLabel) {
      telegramLabel.textContent = "Telegram Account";
    }
    if (telegramHint) {
      telegramHint.textContent = "This is auto-filled from your Telegram mini app account and sent with the order.";
    }
    if (telegramField) {
      telegramField.required = true;
      if (!telegramField.value.trim()) {
        telegramField.value = telegramUser.displayTelegram;
      }
      telegramField.readOnly = true;
      telegramField.dataset.autofilled = "true";
    }
    if (contactLabel) {
      contactLabel.textContent = "Contact Number";
    }
    if (contactHint) {
      contactHint.textContent = "Use a number we can reach for delivery updates.";
    }
    return;
  }

  if (telegramWrap) {
    telegramWrap.hidden = true;
  }
  if (telegramField) {
    telegramField.required = false;
    telegramField.readOnly = false;
    telegramField.value = "";
    delete telegramField.dataset.autofilled;
  }
  if (contactLabel) {
    contactLabel.textContent = "Viber / WhatsApp Number";
  }
  if (contactHint) {
    contactHint.textContent = "Required for browser orders so we can confirm and update your delivery.";
  }
}

function paymentMethodNeedsProof(method) {
  return method === "E-Wallet" || method === "Bank Transfer";
}

function setAddressFeedback(message, tone = "") {
  const node = document.getElementById("delivery-address-feedback");
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.className = `field-hint${tone ? ` is-${tone}` : ""}`;
}

function setAddressPageFeedback(message, tone = "") {
  const node = document.getElementById("address-page-feedback");
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.className = `field-hint${tone ? ` is-${tone}` : ""}`;
}

function persistCheckoutAddressDraft(form) {
  if (!form) {
    return;
  }
  const mergedDraft = {
    ...readStoredCheckoutDraft(),
    delivery_area: String(form.elements.delivery_area?.value || "").trim(),
    delivery_method: String(form.elements.delivery_method?.value || "").trim() || "Standard",
    delivery_address: String(form.elements.delivery_address?.value || "").trim(),
  };
  writeStoredAddressDraft(mergedDraft);
  writeStoredCheckoutDraft(mergedDraft);
}

function populateCheckoutAddressDraft(form) {
  if (!form) {
    return;
  }
  const draft = { ...readStoredAddressDraft(), ...readStoredCheckoutDraft() };
  if (draft.delivery_area && form.elements.delivery_area) {
    form.elements.delivery_area.value = draft.delivery_area;
  }
  if (draft.delivery_method && form.elements.delivery_method) {
    form.elements.delivery_method.value = draft.delivery_method;
  }
  if (draft.delivery_address && form.elements.delivery_address && !String(form.elements.delivery_address.value || "").trim()) {
    form.elements.delivery_address.value = draft.delivery_address;
  }
}

function buildMapEmbedUrl(lat, lng) {
  const latitude = Number(lat || 0);
  const longitude = Number(lng || 0);
  const delta = 0.01;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;
  const url = new URL("https://www.openstreetmap.org/export/embed.html");
  url.searchParams.set("bbox", `${left},${bottom},${right},${top}`);
  url.searchParams.set("layer", "mapnik");
  url.searchParams.set("marker", `${latitude},${longitude}`);
  return url.toString();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read payment screenshot."));
    reader.readAsDataURL(file);
  });
}

async function autofillCheckoutFromTelegram(form, force = false) {
  if (!form) {
    return false;
  }
  const telegramUser = getTelegramMiniAppUser();
  if (!telegramUser && !String(form.elements.telegram_id?.value || "").trim()) {
    return false;
  }
  const typedTelegramId = String(form.elements.telegram_id?.value || "").trim();
  const payload = {
    action: "get_saved_delivery",
    customer: {
      telegram_id: telegramUser?.id || typedTelegramId || "",
      telegram_user_id: telegramUser?.id || "",
      username: telegramUser?.username || typedTelegramId.replace(/^@/, ""),
    },
  };
  if (!payload.customer.telegram_id && !payload.customer.telegram_user_id && !payload.customer.username) {
    return false;
  }
  try {
    const result = await storefrontCheckoutRequest(payload);
    const saved = result.data || {};
    const assignIfAllowed = (name, value) => {
      const field = form.elements[name];
      if (!field || !value) {
        return;
      }
      if (!force && String(field.value || "").trim()) {
        return;
      }
      field.value = value;
    };
    assignIfAllowed("delivery_name", saved.delivery_name || saved.full_name);
    assignIfAllowed("delivery_contact", saved.delivery_contact);
    assignIfAllowed("delivery_address", saved.delivery_address);
    assignIfAllowed("delivery_area", saved.delivery_area);
    persistCheckoutAddressDraft(form);
    persistCheckoutFormDraft(form);
    return true;
  } catch (_) {
    return false;
  }
}

async function refreshQuote() {
  if (!state.cart.items.length) {
    setFeedback("Add items to your cart first.", "error");
    return;
  }
  const checkout = collectCheckoutForm();
  persistCheckoutFormDraft(document.getElementById("checkout-form"));
  if (!checkout.delivery_address) {
    setFeedback("Enter the delivery address first.", "error");
    setAddressFeedback("Please enter the full delivery address.", "error");
    return;
  }
  setFeedback("Refreshing your total…");
  try {
    const result = await storefrontCheckoutRequest({
      action: "quote_order",
      customer: {
        customer_id: state.cart.cart_session_id,
        telegram_id: checkout.telegram_id || "",
        telegram_user_id: checkout.telegram_user_id || "",
        username: checkout.telegram_username || "",
        telegram_init_data: checkout.telegram_init_data,
      },
      cart: {
        items: state.cart.items.map((item) => ({ sku: item.sku, qty: item.qty })),
      },
      checkout: {
        delivery_area: checkout.delivery_area,
        delivery_name: checkout.delivery_name,
        delivery_address: checkout.delivery_address,
        delivery_contact: checkout.delivery_contact,
        promo_code: checkout.promo_code,
        referral_code: checkout.referral_code,
        payment_method: checkout.payment_method,
        delivery_method: checkout.delivery_method,
      },
    });
    state.lastQuote = result.data;
    if (result.data?.promo_auto_applied) {
      const promoField = document.querySelector('#checkout-form [name="promo_code"]');
      if (promoField && !String(promoField.value || "").trim()) {
        promoField.value = result.data.promo_code || "LOYAL30";
      }
    }
    renderCheckout();
    const quoteMessage = result.data?.promo_auto_applied
      ? `Quote updated. ${result.data.promo_code} was auto-applied for a repeat buyer. Total is ${peso(result.data.total)}.`
      : `Quote updated. Total is ${peso(result.data.total)}.`;
    setFeedback(quoteMessage, "success");
  } catch (error) {
    setFeedback(error.message || "Could not refresh the quote.", "error");
  }
}

async function validateDeliveryAddress() {
  const checkout = collectCheckoutForm();
  persistCheckoutFormDraft(document.getElementById("checkout-form"));
  if (!checkout.delivery_address) {
    setAddressFeedback("We’ll verify this address before final checkout.");
    return { ok: false, skipped: true };
  }
  setAddressFeedback("Checking delivery address...");
  try {
    const result = await storefrontCheckoutRequest({
      action: "validate_delivery_address",
      checkout: {
        delivery_area: checkout.delivery_area,
        delivery_address: checkout.delivery_address,
        delivery_method: checkout.delivery_method,
      },
    });
    const mode = checkout.delivery_method === "Lalamove" ? "same-day delivery" : "delivery";
    setAddressFeedback(`Address verified for ${mode}.`, "success");
    const hasQuoteFields =
      checkout.delivery_name &&
      checkout.delivery_contact &&
      checkout.delivery_area &&
      checkout.delivery_address;
    if (currentPage() === "checkout" && state.cart.items.length && hasQuoteFields) {
      await refreshQuote();
    }
    return result;
  } catch (error) {
    setAddressFeedback(error.message || "Could not verify this address.", "error");
    throw error;
  }
}

async function loadAddressPage() {
  const form = document.getElementById("address-form");
  const backButton = document.getElementById("back-to-checkout");
  const verifyButton = document.getElementById("verify-address");
  const mapWrap = document.getElementById("address-map-wrap");
  const mapFrame = document.getElementById("address-map-frame");
  const mapState = document.getElementById("address-map-state");
  if (!form || !mapWrap || !mapFrame || !mapState) {
    return;
  }

  const draft = readStoredAddressDraft();
  const checkoutDraft = readStoredCheckoutDraft();
  if (draft.delivery_area) {
    form.elements.delivery_area.value = draft.delivery_area;
  }
  if (draft.delivery_method) {
    form.elements.delivery_method.value = draft.delivery_method;
  }
  if (draft.delivery_address) {
    form.elements.delivery_address.value = draft.delivery_address;
  }
  if (checkoutDraft.delivery_name && form.elements.delivery_name) {
    form.elements.delivery_name.value = checkoutDraft.delivery_name;
  }
  if (checkoutDraft.telegram_id && form.elements.telegram_id) {
    form.elements.telegram_id.value = checkoutDraft.telegram_id;
  }
  if (checkoutDraft.delivery_contact && form.elements.delivery_contact) {
    form.elements.delivery_contact.value = checkoutDraft.delivery_contact;
  }
  if (checkoutDraft.promo_code && form.elements.promo_code) {
    form.elements.promo_code.value = checkoutDraft.promo_code;
  }
  if (checkoutDraft.referral_code && form.elements.referral_code) {
    form.elements.referral_code.value = checkoutDraft.referral_code;
  }
  if (checkoutDraft.payment_method && form.elements.payment_method) {
    form.elements.payment_method.value = checkoutDraft.payment_method;
  }

  const verify = async () => {
    const checkout = {
      delivery_name: String(form.elements.delivery_name?.value || "").trim(),
      telegram_id: String(form.elements.telegram_id?.value || "").trim(),
      delivery_area: String(form.elements.delivery_area.value || "").trim(),
      delivery_contact: String(form.elements.delivery_contact?.value || "").trim(),
      delivery_method: String(form.elements.delivery_method.value || "").trim() || "Standard",
      delivery_address: String(form.elements.delivery_address.value || "").trim(),
      promo_code: String(form.elements.promo_code?.value || "").trim(),
      referral_code: String(form.elements.referral_code?.value || "").trim().toUpperCase(),
      payment_method: String(form.elements.payment_method?.value || "").trim(),
    };
    writeStoredAddressDraft(checkout);
    writeStoredCheckoutDraft(checkout);
    if (!checkout.delivery_address) {
      setAddressPageFeedback("Please enter the delivery address.", "error");
      mapWrap.hidden = true;
      mapState.hidden = false;
      mapState.textContent = "Enter an address to show the map preview.";
      return null;
    }
    setAddressPageFeedback("Verifying address...");
    mapWrap.hidden = true;
    mapState.hidden = false;
    mapState.textContent = "Checking map location...";
    const result = await storefrontCheckoutRequest({
      action: "validate_delivery_address",
      checkout,
    });
    const coordinates = result.data?.coordinates || {};
    mapFrame.src = buildMapEmbedUrl(coordinates.lat, coordinates.lng);
    mapWrap.hidden = false;
    mapState.hidden = true;
    setAddressPageFeedback("Address verified. You can now continue to checkout.", "success");
    return result;
  };

  verifyButton?.addEventListener("click", async () => {
    try {
      await verify();
    } catch (error) {
      setAddressPageFeedback(error.message || "Could not verify this address.", "error");
      mapWrap.hidden = true;
      mapState.hidden = false;
      mapState.textContent = "We couldn't verify that address yet.";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await verify();
      window.location.href = `/${state.store.slug}/checkout`;
    } catch (error) {
      setAddressPageFeedback(error.message || "Could not verify this address.", "error");
    }
  });

  backButton?.addEventListener("click", () => {
    writeStoredAddressDraft({
      delivery_area: String(form.elements.delivery_area.value || "").trim(),
      delivery_method: String(form.elements.delivery_method.value || "").trim() || "Standard",
      delivery_address: String(form.elements.delivery_address.value || "").trim(),
    });
    window.location.href = `/${state.store.slug}/checkout`;
  });
}

async function submitStorefrontOrder(event) {
  event.preventDefault();
  if (!state.cart.items.length) {
    setFeedback("Your cart is empty.", "error");
    return;
  }
  const checkout = collectCheckoutForm();
  try {
    await validateDeliveryAddress();
  } catch (error) {
    setFeedback(error.message || "Please fix the delivery address first.", "error");
    return;
  }
  let paymentProofUrl = "";
  if (paymentMethodNeedsProof(checkout.payment_method)) {
    const file = document.getElementById("payment-proof").files[0];
    if (!file) {
      setFeedback("Please upload your payment screenshot first.", "error");
      return;
    }
    paymentProofUrl = await readFileAsDataUrl(file);
  }

  setFeedback("Placing your order…");
  try {
    const result = await storefrontCheckoutRequest({
      action: "submit_order",
      customer: {
        customer_id: state.cart.cart_session_id,
        telegram_id: checkout.telegram_id || "",
        telegram_user_id: checkout.telegram_user_id || "",
        username: checkout.telegram_username || "",
        name: checkout.delivery_name,
        telegram_init_data: checkout.telegram_init_data,
      },
      cart: {
        items: state.cart.items.map((item) => ({ sku: item.sku, qty: item.qty })),
      },
      checkout: {
        delivery_area: checkout.delivery_area,
        delivery_name: checkout.delivery_name,
        delivery_address: checkout.delivery_address,
        delivery_contact: checkout.delivery_contact,
        promo_code: checkout.promo_code,
        referral_code: checkout.referral_code,
        payment_method: checkout.payment_method,
        delivery_method: checkout.delivery_method,
        payment_proof_url: paymentProofUrl,
      },
    });
    state.lastQuote = result.data?.order || state.lastQuote;
    setFeedback(`Order ${result.data.order.order_id} created successfully.`, "success");
    showOrderSuccessPopup(result.data.order);
    state.cart = { cart_session_id: makeCartSessionId(), items: [] };
    writeStoredCart(state.cart);
    writeStoredCheckoutDraft({});
    writeStoredAddressDraft({});
    renderCheckout();
    document.getElementById("checkout-form").reset();
  } catch (error) {
    setFeedback(error.message || "Could not place the order.", "error");
  }
}

async function loadTrackingView() {
  const statusNode = document.getElementById("tracking-status");
  const riderNode = document.getElementById("tracking-rider");
  const riderMetaNode = document.getElementById("tracking-rider-meta");
  const mapNode = document.getElementById("tracking-map");
  const galleryNode = document.getElementById("tracking-gallery");
  const form = document.getElementById("tracking-form");
  const actionsNode = document.getElementById("tracking-actions");
  const deliveredButton = document.getElementById("mark-delivered");
  const completedButton = document.getElementById("mark-completed");
  const surveyWrap = document.getElementById("survey-wrap");
  const surveyStars = Array.from(document.querySelectorAll(".survey-star"));
  const surveyComment = document.getElementById("survey-comment");
  const surveySubmit = document.getElementById("submit-survey");
  const surveyFeedback = document.getElementById("survey-feedback");
  if (!statusNode) {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const orderId = String(params.get("order_id") || "").trim();
  const usernameParam = String(params.get("telegram_username") || "").trim();
  const phoneParam = String(params.get("phone") || "").trim();
  const telegramUser = getTelegramMiniAppUser();
  let currentTrackedOrder = null;
  let selectedSurveyRating = 0;
  let pollingTimer = null;
  let trackingMap = null;
  let riderMarker = null;
  let destinationMarker = null;
  const ensureMap = () => {
    if (!mapNode || !window.L) {
      return null;
    }
    if (!trackingMap) {
      trackingMap = window.L.map(mapNode, {
        zoomControl: true,
        attributionControl: true,
      });
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(trackingMap);
    }
    return trackingMap;
  };
  const clearPolling = () => {
    if (pollingTimer) {
      window.clearTimeout(pollingTimer);
      pollingTimer = null;
    }
  };
  const schedulePolling = (lookup) => {
    clearPolling();
    if (!currentTrackedOrder?.tracking_number) {
      return;
    }
    const currentStatus = String(currentTrackedOrder.status || "").trim();
    if (["Completed", "Cancelled"].includes(currentStatus)) {
      return;
    }
    pollingTimer = window.setTimeout(() => {
      lookup().catch(() => null);
    }, 30000);
  };
  const renderRiderPanel = (order) => {
    if (!riderNode || !riderMetaNode || !mapNode) {
      return;
    }
    const lalamove = order?.lalamove || null;
    const driver = lalamove?.driver || null;
    const riderCoords = driver?.coordinates || null;
    const destinationCoords = lalamove?.recipient?.coordinates || null;
    if (!lalamove || !driver) {
      riderNode.hidden = true;
      mapNode.hidden = true;
      return;
    }
    riderNode.hidden = false;
    riderMetaNode.innerHTML = `
      <p><strong>Rider:</strong> ${driver.name || "-"}</p>
      <p><strong>Phone:</strong> ${driver.phone || "-"}</p>
      <p><strong>Plate Number:</strong> ${driver.plate_number || "-"}</p>
      ${lalamove.status_label ? `<p><strong>Live Status:</strong> ${lalamove.status_label}</p>` : ""}
      ${driver.coordinates?.updated_at ? `<p><strong>Last Updated:</strong> ${driver.coordinates.updated_at}</p>` : ""}
    `;
    if (!riderCoords?.lat || !riderCoords?.lng) {
      mapNode.hidden = true;
      return;
    }
    mapNode.hidden = false;
    const map = ensureMap();
    if (!map) {
      return;
    }
    const riderLatLng = [Number(riderCoords.lat), Number(riderCoords.lng)];
    if (!riderMarker) {
      riderMarker = window.L.marker(riderLatLng).addTo(map);
    } else {
      riderMarker.setLatLng(riderLatLng);
    }
    riderMarker.bindPopup(`Rider: ${driver.name || "Lalamove Driver"}`);
    const bounds = [riderLatLng];
    if (destinationCoords?.lat && destinationCoords?.lng) {
      const destinationLatLng = [Number(destinationCoords.lat), Number(destinationCoords.lng)];
      if (!destinationMarker) {
        destinationMarker = window.L.marker(destinationLatLng).addTo(map);
      } else {
        destinationMarker.setLatLng(destinationLatLng);
      }
      destinationMarker.bindPopup("Delivery destination");
      bounds.push(destinationLatLng);
    } else if (destinationMarker && map.hasLayer(destinationMarker)) {
      map.removeLayer(destinationMarker);
      destinationMarker = null;
    }
    map.invalidateSize();
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView(riderLatLng, 14);
    }
  };
  const setSurveyFeedback = (message, tone = "") => {
    if (!surveyFeedback) {
      return;
    }
    surveyFeedback.textContent = message || "";
    surveyFeedback.className = `checkout-feedback${tone ? ` is-${tone}` : ""}`;
  };
  const renderSurveyStars = () => {
    surveyStars.forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.rating || 0) <= selectedSurveyRating);
    });
  };
  async function runLookup({ orderIdValue = "", usernameValue = "", phoneValue = "" } = {}) {
    statusNode.textContent = "Loading your order status...";
    const payload =
      orderIdValue || usernameValue || phoneValue
        ? {
            action: "track_order",
            order: {
              order_id: orderIdValue,
              telegram_username: usernameValue,
              phone: phoneValue,
            },
            customer: {
              telegram_id: telegramUser?.displayTelegram || "",
              telegram_user_id: telegramUser?.id || "",
              username: telegramUser?.username || "",
            },
          }
        : {
            action: "track_latest_order",
            customer: {
              telegram_id: telegramUser?.displayTelegram || "",
              telegram_user_id: telegramUser?.id || "",
              username: telegramUser?.username || "",
            },
          };
    const result = await storefrontCheckoutRequest(payload);
    const order = result.data || {};
    currentTrackedOrder = order;
    const lalamove = order.lalamove || null;
    statusNode.innerHTML = `
      <p><strong>Order Number:</strong> ${order.order_id || "-"}</p>
      <p><strong>Status:</strong> ${order.status || "-"}</p>
      <p><strong>Total:</strong> ${peso(order.total || 0)}</p>
      <p><strong>Payment:</strong> ${order.payment_method || "-"}</p>
      <p><strong>Tracking Number:</strong> ${order.tracking_number || "Pending"}</p>
      ${
        lalamove?.status_label
          ? `<p><strong>Lalamove Status:</strong> ${lalamove.status_label}</p>`
          : ""
      }
      ${
        lalamove?.tracking_link
          ? `<p><strong>Lalamove Tracking:</strong> <a href="${lalamove.tracking_link}" target="_blank" rel="noreferrer">Open live tracking</a></p>`
          : ""
      }
    `;
    renderRiderPanel(order);
    schedulePolling(() =>
      runLookup({
        orderIdValue: String(form?.elements.order_id?.value || order.order_id || "").trim(),
        usernameValue: String(form?.elements.telegram_username?.value || usernameParam || telegramUser?.username || "").trim().replace(/^@/, ""),
        phoneValue: String(form?.elements.phone?.value || phoneParam || "").trim(),
      })
    );
    if (actionsNode) {
      const currentStatus = String(order.status || "").trim();
      const showActions = Boolean(order.order_id) && !["Cancelled", "Completed"].includes(currentStatus);
      actionsNode.hidden = !showActions;
      if (deliveredButton) {
        deliveredButton.hidden = currentStatus === "Delivered" || currentStatus === "Completed";
      }
      if (completedButton) {
        completedButton.hidden = currentStatus === "Completed";
      }
    }
    if (surveyWrap) {
      const currentStatus = String(order.status || "").trim();
      surveyWrap.hidden = !["Delivered", "Completed"].includes(currentStatus);
      if (surveyWrap.hidden) {
        selectedSurveyRating = 0;
        renderSurveyStars();
        setSurveyFeedback("");
      }
    }
    if (galleryNode) {
      const photos = Array.isArray(order.order_photos) ? order.order_photos : [];
      galleryNode.innerHTML = "";
      galleryNode.hidden = photos.length === 0;
      for (const photo of photos) {
        const image = document.createElement("img");
        image.src = photo.url;
        image.alt = `Order photo ${Number(photo.index || 0) + 1}`;
        image.loading = "lazy";
        image.className = "tracking-gallery__image";
        galleryNode.appendChild(image);
      }
    }
  }
  async function updateTrackedOrderStatus(status) {
    if (!currentTrackedOrder?.order_id) {
      return;
    }
    statusNode.textContent = `Updating order to ${status}...`;
    try {
      const result = await storefrontCheckoutRequest({
        action: "complete_order",
        order_id: currentTrackedOrder.order_id,
        status,
        customer: {
          telegram_id: telegramUser?.id || "",
          telegram_user_id: telegramUser?.id || "",
          username: telegramUser?.username || "",
        },
        order: {
          order_id: currentTrackedOrder.order_id,
          telegram_username: String(form?.elements.telegram_username?.value || usernameParam || telegramUser?.username || "").trim().replace(/^@/, ""),
          phone: String(form?.elements.phone?.value || phoneParam || "").trim(),
        },
      });
      await runLookup({
        orderIdValue: currentTrackedOrder.order_id,
        usernameValue: String(form?.elements.telegram_username?.value || usernameParam || telegramUser?.username || "").trim().replace(/^@/, ""),
        phoneValue: String(form?.elements.phone?.value || phoneParam || "").trim(),
      });
      if (result.data?.rewards) {
        statusNode.innerHTML += `<p><strong>Rewards:</strong> ${Number(result.data.rewards.balance_after || 0)} points balance</p>`;
      }
    } catch (error) {
      statusNode.textContent = error.message || "Could not update order status right now.";
    }
  }
  try {
    if (form) {
      const orderField = form.elements.order_id;
      const usernameField = form.elements.telegram_username;
      const phoneField = form.elements.phone;
      if (orderField) orderField.value = orderId;
      if (usernameField) usernameField.value = usernameParam || (telegramUser?.username ? `@${telegramUser.username}` : "");
      if (phoneField) phoneField.value = phoneParam;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await runLookup({
            orderIdValue: String(orderField?.value || "").trim(),
            usernameValue: String(usernameField?.value || "").trim().replace(/^@/, ""),
            phoneValue: String(phoneField?.value || "").trim(),
          });
        } catch (error) {
          statusNode.textContent = error.message || "Could not load tracking right now.";
        }
      });
    }
    deliveredButton?.addEventListener("click", () => updateTrackedOrderStatus("Delivered"));
    completedButton?.addEventListener("click", () => updateTrackedOrderStatus("Completed"));
    surveyStars.forEach((button) => {
      button.addEventListener("click", () => {
        selectedSurveyRating = Number(button.dataset.rating || 0);
        renderSurveyStars();
      });
    });
    surveySubmit?.addEventListener("click", async () => {
      if (!currentTrackedOrder?.order_id) {
        return;
      }
      if (selectedSurveyRating < 1 || selectedSurveyRating > 5) {
        setSurveyFeedback("Please select a star rating first.", "error");
        return;
      }
      surveySubmit.disabled = true;
      setSurveyFeedback("Submitting survey...");
      try {
        await storefrontCheckoutRequest({
          action: "submit_survey",
          order_id: currentTrackedOrder.order_id,
          customer: {
            telegram_id: telegramUser?.id || "",
            telegram_user_id: telegramUser?.id || "",
            username: telegramUser?.username || "",
          },
          order: {
            order_id: currentTrackedOrder.order_id,
            telegram_username: String(form?.elements.telegram_username?.value || usernameParam || telegramUser?.username || "").trim().replace(/^@/, ""),
            phone: String(form?.elements.phone?.value || phoneParam || "").trim(),
          },
          survey: {
            rating: selectedSurveyRating,
            comment: String(surveyComment?.value || "").trim(),
            source: "tracking_page",
          },
        });
        setSurveyFeedback("Thanks for the rating.", "success");
      } catch (error) {
        setSurveyFeedback(error.message || "Could not submit survey right now.", "error");
      } finally {
        surveySubmit.disabled = false;
      }
    });
    await runLookup({
      orderIdValue: orderId,
      usernameValue: usernameParam || telegramUser?.username || "",
      phoneValue: phoneParam,
    });
  } catch (error) {
    clearPolling();
    statusNode.textContent = error.message || "Could not load tracking right now.";
  }
}

function updateMeta() {
  const productCount = document.getElementById("product-count");
  const categoryCount = document.getElementById("category-count");
  if (productCount) {
    productCount.textContent = `${state.products.length} items`;
  }
  if (categoryCount) {
    categoryCount.textContent = `${state.categories.length} categories`;
  }
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
  const search = document.getElementById("search");
  if (search) {
    search.addEventListener("input", (event) => {
      state.search = event.target.value || "";
      renderProducts();
    });
  }

  const copyLink = document.getElementById("copy-link");
  if (copyLink) {
    copyLink.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyLink.textContent = "Link Copied";
        setTimeout(() => {
          copyLink.textContent = "Copy Store Link";
        }, 1200);
      } catch (err) {
        console.error(err);
      }
    });
  }

  const copyReferral = document.getElementById("copy-referral");
  if (copyReferral) {
    copyReferral.addEventListener("click", async () => {
      const code = getOwnReferralCode();
      try {
        await navigator.clipboard.writeText(code);
        copyReferral.textContent = "Copied";
        setTimeout(() => {
          copyReferral.textContent = "Copy";
        }, 1200);
      } catch (err) {
        console.error(err);
      }
    });
  }

  const checkoutLink = document.getElementById("go-checkout");
  if (checkoutLink) {
    checkoutLink.addEventListener("click", () => {
      window.location.href = `/${state.store.slug}/checkout`;
    });
  }
  const trackLink = document.getElementById("go-track");
  if (trackLink) {
    trackLink.addEventListener("click", () => {
      window.location.href = `/${state.store.slug}/track`;
    });
  }
  const adminLink = document.getElementById("go-admin");
  if (adminLink) {
    adminLink.addEventListener("click", () => {
      window.location.href = "/admin";
    });
  }
  document.querySelectorAll("[data-go-checkout]").forEach((button) => {
    button.addEventListener("click", () => {
      window.location.href = `/${state.store.slug}/checkout`;
    });
  });

  const backToCatalog = document.getElementById("back-to-catalog");
  if (backToCatalog) {
    backToCatalog.addEventListener("click", () => {
      window.location.href = `/${state.store.slug}`;
    });
  }

  const promoButton = document.getElementById("apply-promo");
  if (promoButton) {
    promoButton.addEventListener("click", refreshQuote);
  }
  const refreshButton = document.getElementById("refresh-quote");
  if (refreshButton) {
    refreshButton.addEventListener("click", refreshQuote);
  }
  const form = document.getElementById("checkout-form");
  if (form) {
    populateCheckoutFormDraft(form);
    populateCheckoutAddressDraft(form);
    configureCheckoutIdentityFields(form);
    const telegramField = form.elements.telegram_id;
    const nameField = form.elements.delivery_name;
    const telegramUser = getTelegramMiniAppUser();
    if (telegramUser && nameField && !nameField.value.trim() && telegramUser.fullName) {
      nameField.value = telegramUser.fullName;
    }
    persistCheckoutFormDraft(form);
    autofillCheckoutFromTelegram(form).then((filled) => {
      if (filled && state.cart.items.length) {
        refreshQuote().catch(() => {});
      }
    });
    form.addEventListener("submit", submitStorefrontOrder);
    form.elements.payment_method.addEventListener("change", () => {
      const wrap = document.getElementById("payment-proof-wrap");
      wrap.hidden = !paymentMethodNeedsProof(form.elements.payment_method.value);
    });
    const addressPageButton = document.getElementById("open-address-page");
    if (addressPageButton) {
      addressPageButton.addEventListener("click", () => {
        persistCheckoutAddressDraft(form);
        window.location.href = `/${state.store.slug}/address`;
      });
    }
    form.elements.delivery_address.addEventListener("input", () => {
      persistCheckoutAddressDraft(form);
      persistCheckoutFormDraft(form);
    });
    form.elements.delivery_area.addEventListener("change", () => {
      persistCheckoutAddressDraft(form);
      persistCheckoutFormDraft(form);
    });
    form.elements.delivery_method.addEventListener("change", () => {
      persistCheckoutAddressDraft(form);
      persistCheckoutFormDraft(form);
    });
    ["delivery_name", "telegram_id", "delivery_contact", "promo_code", "referral_code", "payment_method"].forEach((name) => {
      const field = form.elements[name];
      if (field) {
        field.addEventListener("input", () => persistCheckoutFormDraft(form));
        field.addEventListener("change", () => persistCheckoutFormDraft(form));
      }
    });
    if (telegramField && telegramUser) {
      telegramField.addEventListener("blur", () => {
        autofillCheckoutFromTelegram(form, true).then((filled) => {
          if (filled && state.cart.items.length) {
            refreshQuote().catch(() => {});
          }
        });
      });
    }
    form.elements.delivery_address.addEventListener("blur", () => {
      validateDeliveryAddress().catch(() => {});
    });
    form.elements.delivery_area.addEventListener("change", () => {
      validateDeliveryAddress().catch(() => {});
    });
    form.elements.delivery_method.addEventListener("change", () => {
      validateDeliveryAddress().catch(() => {});
    });
    const draft = readStoredCheckoutDraft();
    if (
      state.cart.items.length &&
      draft.delivery_name &&
      draft.delivery_contact &&
      draft.delivery_address &&
      draft.delivery_area
    ) {
      refreshQuote().catch(() => {});
    }
  }
}

async function main() {
  state.store = detectStore();
  state.cart = readStoredCart();
  applyStoreTheme(state.store);
  bindEvents();
  renderReferralPanel();
  if (currentPage() === "catalog") {
    showMiniAppGuide();
  }
  if (currentPage() === "track") {
    await loadTrackingView();
    return;
  }
  if (currentPage() === "address") {
    await loadAddressPage();
    return;
  }
  try {
    await loadCatalog();
    renderCheckout();
  } catch (error) {
    console.error(error);
    const productGrid = document.getElementById("product-grid");
    if (productGrid) {
      productGrid.innerHTML =
        '<div class="empty-state">Catalog failed to load. Please try again in a moment.</div>';
    }
  }
}

main();
