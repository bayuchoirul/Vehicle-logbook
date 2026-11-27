import {
  onAuthStateChange,
  redirectIfAuthenticated,
  sendPasswordResetEmail,
  signInWithPassword,
  signUpWithEmail,
  updateUserPassword
} from "../services/auth-service.js";
import { qs, setButtonLoading } from "../utils/dom.js";

const LAST_EMAIL_STORAGE_KEY = "vehicle_logbook_last_email";

/** @type {"signin" | "signup" | "reset" | "recovery" | "forgot-email"} */
let currentMode = "signin";

/**
 * @param {string} email
 * @returns {string}
 */
function maskEmail(email) {
  const clean = String(email || "").trim();
  const [local, domain] = clean.split("@");
  if (!local || !domain) return "";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

/**
 * @param {string} message
 * @param {"error" | "success" | "info"} [kind="info"]
 */
function showBanner(message, kind = "info") {
  const banner = qs("#auth-banner");
  if (!banner) return;

  if (!message) {
    banner.classList.add("hidden");
    banner.textContent = "";
    return;
  }

  banner.className = "mb-4 rounded-xl border px-3.5 py-2.5 text-sm font-medium";
  if (kind === "error") {
    banner.classList.add("border-rose-200", "bg-rose-50", "text-rose-700");
  } else if (kind === "success") {
    banner.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-700");
  } else {
    banner.classList.add("border-sky-200", "bg-sky-50", "text-sky-800");
  }
  banner.textContent = message;
  banner.classList.remove("hidden");
}

/**
 * @param {"signin" | "signup" | "reset" | "recovery" | "forgot-email"} mode
 */
function setAuthMode(mode) {
  currentMode = mode;
  showBanner("");

  const heading = qs("#auth-heading");
  const subheading = qs("#auth-subheading");
  const tabs = qs("#auth-tabs");
  const tabSignin = qs("#tab-signin");
  const tabSignup = qs("#tab-signup");
  const formAuth = qs("#form-auth");
  const formReset = qs("#form-reset-request");
  const formUpdatePw = qs("#form-update-password");
  const panelForgotEmail = qs("#panel-forgot-email");
  const forgotPwBtn = qs("#btn-forgot-password");
  const forgotEmailBtn = qs("#btn-forgot-email");
  const authSubmitBtn = qs("#btn-auth-submit");
  const pwInput = /** @type {HTMLInputElement | null} */ (qs("#auth-password"));

  formAuth?.classList.add("hidden");
  formReset?.classList.add("hidden");
  formUpdatePw?.classList.add("hidden");
  panelForgotEmail?.classList.add("hidden");
  tabs?.classList.add("hidden");

  if (mode === "signin" || mode === "signup") {
    tabs?.classList.remove("hidden");
    formAuth?.classList.remove("hidden");

    const isSignin = mode === "signin";
    if (heading) heading.textContent = isSignin ? "Selamat Datang" : "Buat Akun Baru";
    if (subheading) {
      subheading.textContent = isSignin
        ? "Masuk untuk memantau konsumsi BBM & riwayat servis kendaraan."
        : "Daftar gratis untuk mencatat seluruh riwayat kendaraan Anda.";
    }
    if (authSubmitBtn) {
      authSubmitBtn.textContent = isSignin ? "Masuk ke Logbook" : "Daftar Akun";
    }
    if (pwInput) {
      pwInput.autocomplete = isSignin ? "current-password" : "new-password";
    }

    forgotPwBtn?.classList.toggle("hidden", !isSignin);
    forgotEmailBtn?.classList.toggle("hidden", !isSignin);

    if (tabSignin && tabSignup) {
      tabSignin.className = isSignin
        ? "rounded-lg bg-white py-2 text-sm font-semibold text-slate-900 shadow-xs transition"
        : "rounded-lg py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition";
      tabSignup.className = !isSignin
        ? "rounded-lg bg-white py-2 text-sm font-semibold text-slate-900 shadow-xs transition"
        : "rounded-lg py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition";
    }
    return;
  }

  if (mode === "reset") {
    formReset?.classList.remove("hidden");
    if (heading) heading.textContent = "Reset Kata Sandi";
    if (subheading) {
      subheading.textContent = "Masukkan email terdaftar untuk menerima tautan pemulihan.";
    }
    const emailInput = /** @type {HTMLInputElement | null} */ (qs("#auth-email"));
    const resetInput = /** @type {HTMLInputElement | null} */ (qs("#reset-email"));
    if (resetInput && emailInput?.value) {
      resetInput.value = emailInput.value.trim();
    }
    return;
  }

  if (mode === "recovery") {
    formUpdatePw?.classList.remove("hidden");
    if (heading) heading.textContent = "Atur Kata Sandi Baru";
    if (subheading) {
      subheading.textContent = "Buat kata sandi baru untuk mengamankan akun Vehicle Logbook Anda.";
    }
    return;
  }

  if (mode === "forgot-email") {
    panelForgotEmail?.classList.remove("hidden");
    if (heading) heading.textContent = "Pemulihan Email Akun";
    if (subheading) {
      subheading.textContent = "Panduan menemukan alamat email yang terhubung ke akun Anda.";
    }
    const savedEmail = localStorage.getItem(LAST_EMAIL_STORAGE_KEY) || "";
    const box = qs("#remembered-email-box");
    const maskedEl = qs("#remembered-email-masked");
    if (savedEmail && box && maskedEl) {
      maskedEl.textContent = maskEmail(savedEmail);
      box.classList.remove("hidden");
    } else {
      box?.classList.add("hidden");
    }
  }
}

function bindEvents() {
  qs("#tab-signin")?.addEventListener("click", () => setAuthMode("signin"));
  qs("#tab-signup")?.addEventListener("click", () => setAuthMode("signup"));
  qs("#btn-forgot-password")?.addEventListener("click", () => setAuthMode("reset"));
  qs("#btn-forgot-email")?.addEventListener("click", () => setAuthMode("forgot-email"));

  document.querySelectorAll("[data-back-signin]").forEach((btn) => {
    btn.addEventListener("click", () => setAuthMode("signin"));
  });

  qs("#btn-use-remembered-email")?.addEventListener("click", () => {
    const savedEmail = localStorage.getItem(LAST_EMAIL_STORAGE_KEY) || "";
    setAuthMode("signin");
    const emailInput = /** @type {HTMLInputElement | null} */ (qs("#auth-email"));
    if (emailInput && savedEmail) {
      emailInput.value = savedEmail;
      /** @type {HTMLInputElement | null} */ (qs("#auth-password"))?.focus();
    }
  });

  qs("#form-auth")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showBanner("");

    const emailInput = /** @type {HTMLInputElement | null} */ (qs("#auth-email"));
    const pwInput = /** @type {HTMLInputElement | null} */ (qs("#auth-password"));
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-auth-submit"));

    const email = String(emailInput?.value || "").trim();
    const password = String(pwInput?.value || "");

    setButtonLoading(submitBtn, true);
    try {
      if (currentMode === "signin") {
        await signInWithPassword(email, password);
        localStorage.setItem(LAST_EMAIL_STORAGE_KEY, email);
        window.location.replace("./index.html");
      } else {
        const res = await signUpWithEmail(email, password);
        localStorage.setItem(LAST_EMAIL_STORAGE_KEY, email);
        if (res?.session) {
          window.location.replace("./index.html");
        } else {
          showBanner(
            "Pendaftaran berhasil! Silakan cek kotak masuk email Anda untuk konfirmasi akun sebelum masuk.",
            "success"
          );
          setAuthMode("signin");
        }
      }
    } catch (err) {
      showBanner(err instanceof Error ? err.message : "Terjadi kesalahan autentikasi.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-reset-request")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showBanner("");

    const resetInput = /** @type {HTMLInputElement | null} */ (qs("#reset-email"));
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-reset-submit"));
    const email = String(resetInput?.value || "").trim();

    setButtonLoading(submitBtn, true);
    try {
      await sendPasswordResetEmail(email);
      localStorage.setItem(LAST_EMAIL_STORAGE_KEY, email);
      showBanner(
        `Tautan reset kata sandi telah dikirim ke ${email}. Silakan periksa kotak masuk atau spam Anda.`,
        "success"
      );
    } catch (err) {
      showBanner(err instanceof Error ? err.message : "Gagal mengirim tautan reset.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  qs("#form-update-password")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showBanner("");

    const newPw = String(
      /** @type {HTMLInputElement | null} */ (qs("#new-password"))?.value || ""
    );
    const confirmPw = String(
      /** @type {HTMLInputElement | null} */ (qs("#confirm-new-password"))?.value || ""
    );
    const submitBtn = /** @type {HTMLButtonElement | null} */ (
      qs("#btn-update-password-submit")
    );

    if (newPw !== confirmPw) {
      showBanner("Konfirmasi kata sandi baru tidak cocok.", "error");
      return;
    }

    setButtonLoading(submitBtn, true);
    try {
      await updateUserPassword(newPw);
      showBanner("Kata sandi berhasil diperbarui! Mengalihkan ke dashboard...", "success");
      setTimeout(() => {
        window.location.replace("./index.html");
      }, 1200);
    } catch (err) {
      showBanner(err instanceof Error ? err.message : "Gagal memperbarui kata sandi.", "error");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

async function initLogin() {
  bindEvents();

  const savedEmail = localStorage.getItem(LAST_EMAIL_STORAGE_KEY) || "";
  const emailInput = /** @type {HTMLInputElement | null} */ (qs("#auth-email"));
  if (emailInput && savedEmail && !emailInput.value) {
    emailInput.value = savedEmail;
  }

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  if (hash.includes("type=recovery") || search.includes("type=recovery")) {
    setAuthMode("recovery");
  } else {
    setAuthMode("signin");
  }

  try {
    onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("recovery");
      }
    });

    await redirectIfAuthenticated("./index.html");
  } catch (err) {
    showBanner(
      err instanceof Error ? err.message : "Gagal menghubungkan ke layanan autentikasi.",
      "error"
    );
  }
}

document.addEventListener("DOMContentLoaded", initLogin);