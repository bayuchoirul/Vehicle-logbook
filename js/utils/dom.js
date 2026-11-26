/**
 * Safe DOM manipulation, modal lifecycle, and toast notification helpers.
 */

/**
 * @template {Element} T
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {T | null}
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Escapes HTML special characters to prevent XSS in dynamic templates.
 * @param {unknown} raw
 * @returns {string}
 */
export function escapeHtml(raw) {
  return String(raw ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Displays a non-blocking toast notification at the bottom-right corner.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 */
export function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className =
      "fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0";
    document.body.appendChild(container);
  }

  const colorClasses = {
    success: "bg-emerald-600 text-white border-emerald-500",
    error: "bg-rose-600 text-white border-rose-500",
    info: "bg-slate-800 text-white border-slate-700"
  };

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200 ${
    colorClasses[type] || colorClasses.info
  }`;
  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-1");
    window.setTimeout(() => toast.remove(), 220);
  }, 3400);
}

/**
 * Toggles loading state on a submit button while preserving original label.
 * @param {HTMLButtonElement | null} button
 * @param {boolean} isLoading
 * @param {string} [loadingText="Menyimpan..."]
 */
export function setButtonLoading(button, isLoading, loadingText = "Menyimpan...") {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.disabled = true;
    button.classList.add("opacity-70", "cursor-not-allowed");
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.classList.remove("opacity-70", "cursor-not-allowed");
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
    }
  }
}

/**
 * Opens a modal element by ID.
 * @param {string} modalId
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

/**
 * Closes a modal element by ID.
 * @param {string} modalId
 */
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

/**
 * Binds standard close triggers ([data-close-modal], backdrop click, Escape key) for all modals.
 */
export function bindModalDismissHandlers() {
  document.addEventListener("click", (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const closeBtn = target.closest("[data-close-modal]");
    if (closeBtn) {
      const modalId = closeBtn.getAttribute("data-close-modal");
      if (modalId) closeModal(modalId);
      return;
    }
    if (target.dataset && target.dataset.modalBackdrop === "true") {
      closeModal(target.id);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll('[data-modal-backdrop="true"]:not(.hidden)').forEach((el) => {
        closeModal(el.id);
      });
    }
  });
}
