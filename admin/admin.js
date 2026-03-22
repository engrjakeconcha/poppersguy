"use strict";

const ADMIN_SESSION_KEY = "poppers_admin_session";
const ADMIN_API_URL = "/api/admin/poppers-admin";

const state = {
  session: null,
  orders: [],
  summary: null,
  report: null,
  orderFilter: "pending",
  orderSearch: "",
  salesPeriod: "7d",
  tickets: [],
  ticketFilter: "open",
  promos: [],
  surveys: [],
  inventory: [],
  adminUsers: [],
  activeTab: "orders",
};

function readSession() {
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeSession(value) {
  try {
    if (!value) {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return;
    }
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(value));
  } catch (_) {
    // Ignore storage failures.
  }
}

function setFeedback(message, tone = "", targetId = "admin-login-feedback") {
  const node = document.getElementById(targetId);
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.className = `checkout-feedback${tone ? ` is-${tone}` : ""}`;
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function withAuthHeaders(extra = {}) {
  const session = state.session || readSession();
  return {
    "Content-Type": "application/json",
    "x-admin-user": session?.username || "",
    "x-admin-code": session?.code || "",
    ...extra,
  };
}

async function adminRequest(action, payload = {}, options = {}) {
  const response = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: options.auth === false ? { "Content-Type": "application/json" } : withAuthHeaders(),
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.message || "Admin request failed.");
  }
  return result;
}

function renderAdmin(session) {
  const auth = document.getElementById("admin-auth");
  const dashboard = document.getElementById("admin-dashboard");
  const welcome = document.getElementById("admin-welcome");
  if (!auth || !dashboard || !welcome) {
    return;
  }
  const isLoggedIn = Boolean(session?.username);
  auth.hidden = isLoggedIn;
  dashboard.hidden = !isLoggedIn;
  if (isLoggedIn) {
    welcome.textContent = `Welcome, ${session.username}`;
  }
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    const isActive = button.dataset.adminTab === tabName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== tabName;
  });
}

function applyOverview() {
  const summary = state.summary || {};
  const report = state.report || {};
  const bind = (id, value) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  };
  bind("metric-pending", String(summary.pending_orders ?? "-"));
  bind("metric-awaiting", String(summary.awaiting_payment ?? "-"));
  bind("metric-sales", report.gross_sales != null ? peso(report.gross_sales) : "-");
  bind("metric-aov", report.average_order_value != null ? peso(report.average_order_value) : "-");
  bind("metric-sales-copy", `${report.order_count ?? 0} orders in selected range.`);
  const byStatus = report.by_status || {};
  const statusLabel = Object.keys(byStatus).length
    ? `Top statuses: ${Object.entries(byStatus)
        .slice(0, 3)
        .map(([label, count]) => `${label} (${count})`)
        .join(", ")}`
    : "Average order value.";
  bind("metric-aov-copy", statusLabel);
}

function bindOrderCard(entry, node) {
  const set = (selector, value) => {
    const target = node.querySelector(selector);
    if (target) {
      target.textContent = value;
    }
  };
  const setHtml = (selector, value) => {
    const target = node.querySelector(selector);
    if (target) {
      target.innerHTML = value;
    }
  };
  const setValue = (selector, value) => {
    const target = node.querySelector(selector);
    if (target) {
      target.value = value;
    }
  };

  set(".admin-order-card__title", entry.order_id || "-");
  set(".admin-order-card__status", entry.status || "Pending");
  set(
    ".admin-order-card__meta",
    `${entry.full_name || entry.delivery_name || "-"}${entry.username ? ` • @${entry.username}` : ""}${
      entry.delivery_contact ? ` • ${entry.delivery_contact}` : ""
    }`
  );
  set(
    ".admin-order-card__items",
    (entry.items || []).length
      ? (entry.items || []).map((item) => `${item.name} x${item.qty}`).join(" • ")
      : "No items listed"
  );
  setHtml(
    ".admin-order-card__totals",
    [
      `<span>Total: <strong>${peso(entry.total)}</strong></span>`,
      `<span>Payment: <strong>${entry.payment_method || "-"}</strong></span>`,
      `<span>Delivery: <strong>${entry.delivery_method || "-"}</strong></span>`,
      `<span>Area: <strong>${entry.delivery_area || "-"}</strong></span>`,
    ].join("")
  );
  setValue(".admin-order-card__status-input", entry.status || "Pending Confirmation");
  setValue(".admin-order-card__tracking-input", entry.tracking_number || "");
  const trackLink = node.querySelector(".admin-order-card__track-page");
  if (trackLink) {
    trackLink.href = entry.tracking_link || "/poppers/track";
  }

  const feedback = node.querySelector(".admin-order-card__feedback");
  const saveButton = node.querySelector(".admin-order-card__save");
  const contactButton = node.querySelector(".admin-order-card__contact");
  const cancelButton = node.querySelector(".admin-order-card__cancel");
  const sendTrackingButton = node.querySelector(".admin-order-card__send-tracking");
  const bookLalamoveButton = node.querySelector(".admin-order-card__book-lalamove");
  const verifyPaymentButton = node.querySelector(".admin-order-card__verify-payment");
  const pickupInput = node.querySelector(".admin-order-card__pickup-input");
  const statusInput = node.querySelector(".admin-order-card__status-input");
  const trackingInput = node.querySelector(".admin-order-card__tracking-input");
  const messageInput = node.querySelector(".admin-order-card__message");
  const photoInput = node.querySelector(".admin-order-card__photos");
  const uploadPhotosButton = node.querySelector(".admin-order-card__upload-photos");
  const hasTelegramContact = Boolean(entry.telegram_contact_available);

  const setCardFeedback = (message, tone = "") => {
    if (!feedback) {
      return;
    }
    feedback.textContent = message || "";
    feedback.className = `checkout-feedback admin-order-card__feedback${tone ? ` is-${tone}` : ""}`;
  };

  if (contactButton && !hasTelegramContact) {
    contactButton.hidden = true;
  }
  if (messageInput && !hasTelegramContact) {
    messageInput.hidden = true;
    messageInput.disabled = true;
    messageInput.placeholder = "Telegram contact is only available for Telegram orders.";
  }

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      setCardFeedback("Saving update...");
      try {
        const result = await adminRequest("update_order", {
          order_id: entry.order_id,
          status: statusInput?.value || "",
          tracking_number: trackingInput?.value || "",
          notify_customer: true,
        });
        Object.assign(entry, result.order || {});
        set(".admin-order-card__status", entry.status || "Pending");
        setCardFeedback(
          result?.customer_notified
            ? "Order updated and customer notified."
            : "Order updated. No Telegram customer notification was sent for this order.",
          "success"
        );
        await refreshAdminData();
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to update order.", "error");
      } finally {
        saveButton.disabled = false;
      }
    });
  }

  if (sendTrackingButton) {
    sendTrackingButton.addEventListener("click", async () => {
      sendTrackingButton.disabled = true;
      setCardFeedback("Sending tracking link...");
      try {
        const result = await adminRequest("send_tracking_link", {
          order_id: entry.order_id,
        });
        setCardFeedback(
          result?.customer_notified
            ? "Tracking link sent to customer."
            : "Tracking link is ready. This order does not have a Telegram chat ID, so use the tracking page instead.",
          "success"
        );
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to send tracking link.", "error");
      } finally {
        sendTrackingButton.disabled = false;
      }
    });
  }

  if (bookLalamoveButton) {
    if (entry.delivery_method !== "Lalamove" || entry.tracking_number) {
      bookLalamoveButton.hidden = true;
    }
    bookLalamoveButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Book Lalamove for order ${entry.order_id}?`);
      if (!confirmed) {
        return;
      }
      bookLalamoveButton.disabled = true;
      setCardFeedback("Booking Lalamove...");
      try {
        const resultWithPickup = await adminRequest("book_lalamove", {
          order_id: entry.order_id,
          pickup_point: String(pickupInput?.value || "jay").trim().toLowerCase(),
        });
        Object.assign(entry, resultWithPickup.order || {});
        set(".admin-order-card__status", entry.status || "Confirmed");
        setValue(".admin-order-card__status-input", entry.status || "Confirmed");
        setValue(".admin-order-card__tracking-input", entry.tracking_number || "");
        const pickupLabel =
          resultWithPickup.booking?.pickup?.label ||
          (String(pickupInput?.value || "jay") === "josh" ? "Josh • Vine Residences" : "Jay Concha");
        setCardFeedback(`Lalamove booked from ${pickupLabel}.`, "success");
        await refreshAdminData();
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to book Lalamove.", "error");
      } finally {
        bookLalamoveButton.disabled = false;
      }
    });
  }

  if (verifyPaymentButton) {
    if (entry.status !== "Awaiting Payment Verification" && !entry.payment_proof_file_id) {
      verifyPaymentButton.hidden = true;
    }
    verifyPaymentButton.addEventListener("click", async () => {
      verifyPaymentButton.disabled = true;
      setCardFeedback("Verifying payment...");
      try {
        const resultWithPickup = await adminRequest("verify_payment", {
          order_id: entry.order_id,
          pickup_point: String(pickupInput?.value || "jay").trim().toLowerCase(),
        });
        Object.assign(entry, resultWithPickup.order || {});
        set(".admin-order-card__status", entry.status || "Confirmed");
        setValue(".admin-order-card__status-input", entry.status || "Confirmed");
        const pickupLabel = resultWithPickup.booking?.booked
          ? resultWithPickup.booking?.pickup?.label ||
            (String(pickupInput?.value || "jay") === "josh" ? "Josh • Vine Residences" : "Jay Concha")
          : "";
        setCardFeedback(
          pickupLabel
            ? `Payment verified and auto-booked from ${pickupLabel}.`
            : resultWithPickup.notifications?.customer_notified
              ? "Payment verified and customer notified."
              : "Payment verified. No Telegram customer notification was sent for this order.",
          "success"
        );
        await refreshAdminData();
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to verify payment.", "error");
      } finally {
        verifyPaymentButton.disabled = false;
      }
    });
  }

  if (contactButton) {
    contactButton.addEventListener("click", async () => {
      const message = String(messageInput?.value || "").trim();
      if (!message) {
        setCardFeedback("Add a message before sending.", "error");
        return;
      }
      contactButton.disabled = true;
      setCardFeedback("Sending message...");
      try {
        await adminRequest("contact_customer", {
          order_id: entry.order_id,
          message,
        });
        if (messageInput) {
          messageInput.value = "";
        }
        setCardFeedback("Message sent to customer.", "success");
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to contact customer.", "error");
      } finally {
        contactButton.disabled = false;
      }
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Cancel order ${entry.order_id}?`);
      if (!confirmed) {
        return;
      }
      cancelButton.disabled = true;
      setCardFeedback("Cancelling order...");
      try {
        const result = await adminRequest("update_order", {
          order_id: entry.order_id,
          status: "Cancelled",
          notify_customer: true,
        });
        Object.assign(entry, result.order || {});
        set(".admin-order-card__status", entry.status || "Cancelled");
        setValue(".admin-order-card__status-input", entry.status || "Cancelled");
        setCardFeedback(
          result?.customer_notified
            ? "Order cancelled and customer notified."
            : "Order cancelled. No Telegram customer notification was sent for this order.",
          "success"
        );
        await refreshAdminData();
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to cancel order.", "error");
      } finally {
        cancelButton.disabled = false;
      }
    });
  }

  if (uploadPhotosButton) {
    uploadPhotosButton.addEventListener("click", async () => {
      const files = Array.from(photoInput?.files || []);
      if (!files.length) {
        setCardFeedback("Choose at least one image first.", "error");
        return;
      }
      uploadPhotosButton.disabled = true;
      setCardFeedback("Uploading order photos...");
      try {
        const photos = await Promise.all(
          files.slice(0, 8).map(
            (file) =>
              new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Failed to read one of the selected images."));
                reader.readAsDataURL(file);
              })
          )
        );
        const result = await adminRequest("upload_order_photos", {
          order_id: entry.order_id,
          photos,
        });
        Object.assign(entry, result.order || {});
        if (photoInput) {
          photoInput.value = "";
        }
        setCardFeedback(`Uploaded ${result.uploaded_count || 0} order photo(s).`, "success");
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to upload order photos.", "error");
      } finally {
        uploadPhotosButton.disabled = false;
      }
    });
  }
}

function renderOrders() {
  const wrap = document.getElementById("admin-orders");
  const empty = document.getElementById("admin-orders-empty");
  const template = document.getElementById("admin-order-template");
  if (!wrap || !template) {
    return;
  }
  wrap.innerHTML = "";
  const orders = Array.isArray(state.orders) ? state.orders : [];
  if (empty) {
    empty.hidden = orders.length > 0;
  }
  for (const order of orders) {
    const node = template.content.firstElementChild.cloneNode(true);
    bindOrderCard(order, node);
    wrap.appendChild(node);
  }
}

function renderTickets() {
  const wrap = document.getElementById("admin-tickets");
  const template = document.getElementById("admin-ticket-template");
  if (!wrap || !template) {
    return;
  }
  wrap.innerHTML = "";
  const tickets = Array.isArray(state.tickets) ? state.tickets : [];
  if (!tickets.length) {
    wrap.innerHTML = '<div class="empty-state">No tickets in this view.</div>';
    return;
  }
  for (const ticket of tickets) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".admin-ticket__title").textContent = `${ticket.type} • ${ticket.ticket_id}`;
    node.querySelector(".admin-ticket__status").textContent = ticket.status;
    node.querySelector(".admin-ticket__meta").textContent = `${ticket.username ? `@${ticket.username}` : ticket.user_id || "-"} • ${
      ticket.created_at || "-"
    }`;
    node.querySelector(".admin-ticket__message").textContent = ticket.message || "-";
    const toggle = node.querySelector(".admin-ticket__toggle");
    toggle.textContent = ticket.status === "closed" ? "Reopen Ticket" : "Close Ticket";
    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try {
        await adminRequest("update_ticket", {
          ticket_id: ticket.ticket_id,
          status: ticket.status === "closed" ? "open" : "closed",
        });
        await refreshAdminData();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to update ticket.", "error", "admin-dashboard-feedback");
      } finally {
        toggle.disabled = false;
      }
    });
    wrap.appendChild(node);
  }
}

function renderPromos() {
  const wrap = document.getElementById("admin-promos");
  const template = document.getElementById("admin-promo-template");
  if (!wrap || !template) {
    return;
  }
  wrap.innerHTML = "";
  const promos = Array.isArray(state.promos) ? state.promos : [];
  if (!promos.length) {
    wrap.innerHTML = '<div class="empty-state">No promos found.</div>';
    return;
  }
  for (const promo of promos) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".admin-promo__code").textContent = promo.code;
    node.querySelector(".admin-promo__state").textContent = promo.active ? "Active" : "Inactive";
    node.querySelector(".admin-promo__discount").textContent = `${peso(promo.discount)} off`;
    wrap.appendChild(node);
  }
}

function renderSurveys() {
  const wrap = document.getElementById("admin-surveys");
  const template = document.getElementById("admin-survey-template");
  const summary = document.getElementById("admin-surveys-summary");
  if (!wrap || !template) {
    return;
  }
  wrap.innerHTML = "";
  const surveys = Array.isArray(state.surveys) ? state.surveys : [];
  if (summary) {
    const total = surveys.length;
    const average = total
      ? (surveys.reduce((sum, survey) => sum + Number(survey.rating || 0), 0) / total).toFixed(2)
      : "0.00";
    summary.textContent = `${total} survey${total === 1 ? "" : "s"} • average ${average}/5`;
  }
  if (!surveys.length) {
    wrap.innerHTML = '<div class="empty-state">No surveys yet.</div>';
    return;
  }
  for (const survey of surveys) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".admin-survey__title").textContent = `Order ${survey.order_id || "-"}`;
    node.querySelector(".admin-survey__rating").textContent = `${"★".repeat(Number(survey.rating || 0))}${"☆".repeat(Math.max(5 - Number(survey.rating || 0), 0))}`;
    node.querySelector(".admin-survey__meta").textContent = [
      survey.username ? `@${survey.username}` : survey.user_id || "",
      survey.created_at ? new Date(survey.created_at).toLocaleString() : "",
      survey.source || "",
    ]
      .filter(Boolean)
      .join(" • ");
    node.querySelector(".admin-survey__comment").textContent = survey.comment || "No comment.";
    wrap.appendChild(node);
  }
}

function renderInventory() {
  const wrap = document.getElementById("admin-inventory");
  const template = document.getElementById("admin-inventory-template");
  if (!wrap || !template) {
    return;
  }
  wrap.innerHTML = "";
  const items = Array.isArray(state.inventory) ? state.inventory : [];
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state">No inventory found.</div>';
    return;
  }
  for (const item of items) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".admin-inventory__title").textContent = item.name || item.sku;
    node.querySelector(".admin-inventory__sku").textContent = item.sku || "-";
    node.querySelector(".admin-inventory__meta").textContent = `${item.category || "Uncategorized"} • ${
      item.active ? "Active" : "Inactive"
    }`;
    const stockInput = node.querySelector(".admin-inventory__stock");
    const priceInput = node.querySelector(".admin-inventory__price");
    const activeInput = node.querySelector(".admin-inventory__active");
    const saveButton = node.querySelector(".admin-inventory__save");
    const feedback = node.querySelector(".admin-inventory__feedback");
    if (stockInput) stockInput.value = item.stock ?? "";
    if (priceInput) priceInput.value = item.price ?? 0;
    if (activeInput) activeInput.value = item.active ? "true" : "false";
    const setCardFeedback = (message, tone = "") => {
      feedback.textContent = message || "";
      feedback.className = `checkout-feedback admin-inventory__feedback${tone ? ` is-${tone}` : ""}`;
    };
    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      setCardFeedback("Saving inventory...");
      try {
        await adminRequest("update_inventory_item", {
          sku: item.sku,
          stock: String(stockInput?.value || "").trim(),
          price: Number(priceInput?.value || 0),
          active: String(activeInput?.value || "true") === "true",
        });
        setCardFeedback("Inventory updated.", "success");
        await refreshAdminData();
      } catch (error) {
        setCardFeedback(error instanceof Error ? error.message : "Failed to update inventory.", "error");
      } finally {
        saveButton.disabled = false;
      }
    });
    wrap.appendChild(node);
  }
}

function renderAdminUsers() {
  const wrap = document.getElementById("admin-users");
  const template = document.getElementById("admin-user-template");
  if (!wrap || !template) {
    return;
  }
  wrap.innerHTML = "";
  const users = Array.isArray(state.adminUsers) ? state.adminUsers : [];
  if (!users.length) {
    wrap.innerHTML = '<div class="empty-state">No admin users found.</div>';
    return;
  }
  for (const user of users) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".admin-user__title").textContent = user.username || "-";
    node.querySelector(".admin-user__state").textContent = user.active ? "Active" : "Inactive";
    node.querySelector(".admin-user__meta").textContent = [
      user.telegram_username ? `@${user.telegram_username}` : "",
      user.telegram_id || "",
      user.updated_at ? `Updated ${new Date(user.updated_at).toLocaleString()}` : "",
    ]
      .filter(Boolean)
      .join(" • ");
    wrap.appendChild(node);
  }
}

async function refreshAdminData() {
  if (!state.session?.username) {
    return;
  }
  setFeedback("Loading admin data...", "", "admin-dashboard-feedback");
  try {
    const results = await Promise.allSettled([
      adminRequest("get_dashboard", {
        filter: state.orderFilter,
        search: state.orderSearch,
        limit: 80,
      }),
      adminRequest("sales_report", { period: state.salesPeriod }),
      adminRequest("get_tickets", { filter: state.ticketFilter }),
      adminRequest("get_promos"),
      adminRequest("get_surveys"),
      adminRequest("get_inventory"),
      adminRequest("get_admin_users"),
    ]);

    const warnings = [];
    const readResult = (index, fallback, label) => {
      const result = results[index];
      if (result.status === "fulfilled") {
        return result.value;
      }
      warnings.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "failed to load"}`);
      return fallback;
    };

    const dashboard = readResult(0, { summary: {}, orders: [] }, "Orders");
    const report = readResult(1, { report: {} }, "Sales");
    const tickets = readResult(2, { tickets: [] }, "Tickets");
    const promos = readResult(3, { promos: [] }, "Promos");
    const surveys = readResult(4, { surveys: [] }, "Surveys");
    const inventory = readResult(5, { inventory: [] }, "Inventory");
    const adminUsers = readResult(6, { admin_users: [] }, "Admins");

    state.summary = dashboard.summary || {};
    state.orders = dashboard.orders || [];
    state.report = report.report || {};
    state.tickets = tickets.tickets || [];
    state.promos = promos.promos || [];
    state.surveys = surveys.surveys || [];
    state.inventory = inventory.inventory || [];
    state.adminUsers = adminUsers.admin_users || [];
    applyOverview();
    renderOrders();
    renderTickets();
    renderPromos();
    renderSurveys();
    renderInventory();
    renderAdminUsers();
    setFeedback(warnings.length ? `Loaded with warnings: ${warnings.join(" | ")}` : "", warnings.length ? "error" : "", "admin-dashboard-feedback");
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : "Failed to load admin data.", "error", "admin-dashboard-feedback");
  }
}

function bindAdminEvents() {
  const form = document.getElementById("admin-login-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const username = String(formData.get("username") || "").trim();
      const code = String(formData.get("code") || "").trim();
      setFeedback("Logging in...");
      try {
        const result = await adminRequest("login", { username, code }, { auth: false });
        const session = { username: result.admin.username, code, logged_in_at: new Date().toISOString() };
        state.session = session;
        writeSession(session);
        setFeedback("");
        renderAdmin(session);
        setActiveTab(state.activeTab);
        await refreshAdminData();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Invalid admin login.", "error");
      }
    });
  }

  const logout = document.getElementById("admin-logout");
  if (logout) {
    logout.addEventListener("click", () => {
      state.session = null;
      writeSession(null);
      renderAdmin(null);
      setFeedback("");
      setFeedback("", "", "admin-dashboard-feedback");
    });
  }

  const refresh = document.getElementById("admin-refresh");
  if (refresh) {
    refresh.addEventListener("click", () => {
      refreshAdminData();
    });
  }

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.adminTab || "orders");
    });
  });

  const orderFilter = document.getElementById("order-filter");
  if (orderFilter) {
    orderFilter.addEventListener("change", () => {
      state.orderFilter = String(orderFilter.value || "pending");
      refreshAdminData();
    });
  }

  const salesPeriod = document.getElementById("sales-period");
  if (salesPeriod) {
    salesPeriod.addEventListener("change", () => {
      state.salesPeriod = String(salesPeriod.value || "7d");
      refreshAdminData();
    });
  }

  const ticketFilter = document.getElementById("ticket-filter");
  if (ticketFilter) {
    ticketFilter.addEventListener("change", () => {
      state.ticketFilter = String(ticketFilter.value || "open");
      refreshAdminData();
    });
  }

  const promoForm = document.getElementById("promo-form");
  if (promoForm) {
    promoForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(promoForm);
      const code = String(formData.get("code") || "").trim().toUpperCase();
      const discount = Number(formData.get("discount") || 0);
      const active = String(formData.get("active") || "true") === "true";
      setFeedback("Saving promo...", "", "promo-feedback");
      try {
        await adminRequest("upsert_promo", { code, discount, active });
        promoForm.reset();
        setFeedback("Promo saved.", "success", "promo-feedback");
        await refreshAdminData();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to save promo.", "error", "promo-feedback");
      }
    });
  }

  const adminUserForm = document.getElementById("admin-user-form");
  if (adminUserForm) {
    adminUserForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(adminUserForm);
      setFeedback("Saving admin user...", "", "admin-user-feedback");
      try {
        const result = await adminRequest("add_admin_user", {
          username: String(formData.get("username") || "").trim(),
          passcode: String(formData.get("passcode") || "").trim(),
          telegram_id: String(formData.get("telegram_id") || "").trim(),
          telegram_username: String(formData.get("telegram_username") || "").trim(),
          active: String(formData.get("active") || "true") === "true",
        });
        adminUserForm.reset();
        setFeedback(result.message || "Admin user saved.", "success", "admin-user-feedback");
        await refreshAdminData();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to save admin user.", "error", "admin-user-feedback");
      }
    });
  }

  const adminResetForm = document.getElementById("admin-reset-form");
  if (adminResetForm) {
    adminResetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(adminResetForm);
      const username = String(formData.get("username") || "").trim();
      const passcode = String(formData.get("passcode") || "").trim();
      setFeedback("Resetting password...", "", "admin-reset-feedback");
      try {
        const result = await adminRequest("reset_admin_passcode", { username, passcode });
        if (state.session?.username === username) {
          state.session.code = passcode;
          writeSession(state.session);
        }
        adminResetForm.reset();
        setFeedback(result.message || "Password reset.", "success", "admin-reset-feedback");
        await refreshAdminData();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to reset password.", "error", "admin-reset-feedback");
      }
    });
  }

  const orderSearch = document.getElementById("order-search");
  if (orderSearch) {
    let timeoutId = null;
    orderSearch.addEventListener("input", () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        state.orderSearch = String(orderSearch.value || "").trim();
        refreshAdminData();
      }, 250);
    });
  }
}

async function boot() {
  const tele = window.Telegram?.WebApp;
  if (tele) {
    tele.ready();
    tele.expand();
  }
  bindAdminEvents();
  setActiveTab(state.activeTab);
  const session = readSession();
  if (session?.username && session?.code) {
    state.session = session;
  }
  renderAdmin(state.session);
  if (state.session?.username) {
    await refreshAdminData();
  }
}

boot();
