/**
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element | null}
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * @param {HTMLButtonElement | null} button
 * @param {boolean} isLoading
 * @param {string} [loadingText="Menyimpan..."]
 */
export function setButtonLoading(button, isLoading, loadingText = "Menyimpan...") {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent || "";
    }
    button.disabled = true;
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }
}

/**
 * @param {string} modalId
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

/**
 * @param {string} modalId
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/**
 * @param {string} modalId
 * @param {string} message
 */
export function setModalError(modalId, message) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const errBox = modal.querySelector("[data-modal-error]");
  if (!errBox) return;

  if (!message) {
    errBox.classList.add("hidden");
    errBox.textContent = "";
  } else {
    errBox.textContent = message;
    errBox.classList.remove("hidden");
  }
}

export function bindModalDismissHandlers() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-close-modal");
      if (targetId) closeModal(targetId);
    });
  });

  document.querySelectorAll("[data-modal-backdrop]").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop && backdrop.id) {
        closeModal(backdrop.id);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll("[data-modal-backdrop]:not(.hidden)").forEach((m) => {
        if (m.id) closeModal(m.id);
      });
    }
  });
}

/**
 * @param {string} message
 * @param {"success" | "error" | "info"} [type="info"]
 */
export function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const palette =
    type === "error"
      ? "border-rose-200 bg-rose-600 text-white"
      : type === "success"
        ? "border-emerald-200 bg-emerald-600 text-white"
        : "border-slate-700 bg-slate-900 text-white";

  toast.className = `rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all ${palette}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-1");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}