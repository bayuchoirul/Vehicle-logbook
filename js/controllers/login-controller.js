import {
  onAuthStateChange,
  redirectIfAuthenticated,
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  updateUserPassword
} from "../services/auth-service.js";
import { isSupabaseConfigured } from "../services/supabase-client.js";
import { qs, setButtonLoading } from "../utils/dom.js";

const LAST_EMAIL_KEY = "vl_last_email";

/** @typedef {'signin' | 'signup' | 'forgot-password' | 'new-password' | 'forgot-username'} AuthMode */

/** @type {AuthMode} */
let authMode = "signin";

/**
 * Menyensor sebagian karakter lokal email untuk petunjuk lupa username.
 * @param {string} email
 * @returns {string}
 */
function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

function updateAuthModeUI() {
  const tabsWrapper = qs("#auth-tabs");
  const tabSignin = qs("#tab-signin");
  const tabSignup = qs("#tab-signup");
  const authForm = qs("#auth-form");
  const forgotPasswordForm = qs("#form-forgot-password");
  const newPasswordForm = qs("#form-new-password");
  const forgotUsernamePanel = qs("#panel-forgot-username");

  const title = qs("#auth-title");
  const subtitle = qs("#auth-subtitle");
  const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#auth-submit-btn"));
  const forgotPasswordBtn = qs("#btn-forgot-password");
  const forgotUsernameBtn = qs("#btn-forgot-username");
  const passwordInput = /** @type {HTMLInputElement | null} */ (qs("#password"));

  tabsWrapper?.classList.add("hidden");
  authForm?.classList.add("hidden");
  forgotPasswordForm?.classList.add("hidden");
  newPasswordForm?.classList.add("hidden");
  forgotUsernamePanel?.classList.add("hidden");

  if (authMode === "signin" || authMode === "signup") {
    tabsWrapper?.classList.remove("hidden");
    authForm?.classList.remove("hidden");

    const isSignin = authMode === "signin";
    forgotPasswordBtn?.classList.toggle("hidden", !isSignin);
    forgotUsernameBtn?.classList.toggle("hidden", !isSignin);

    if (passwordInput) {
      passwordInput.autocomplete = isSignin ? "current-password" : "new-password";
    }

    if (isSignin) {
      tabSignin?.classList.add("bg-white", "text-slate-900", "shadow-xs");
      tabSignin?.classList.remove("text-slate-600");
      tabSignup?.classList.remove("bg-white", "text-slate-900", "shadow-xs");
      tabSignup?.classList.add("text-slate-600");

      if (title) title.textContent = "Selamat Datang";
      if (subtitle) {
        subtitle.textContent = "Masuk untuk memantau konsumsi BBM & riwayat servis kendaraan.";
      }
      if (submitBtn) {
        submitBtn.textContent = "Masuk ke Logbook";
        delete submitBtn.dataset.originalHtml;
      }
    } else {
      tabSignup?.classList.add("bg-white", "text-slate-900", "shadow-xs");
      tabSignup?.classList.remove("text-slate-600");
      tabSignin?.classList.remove("bg-white", "text-slate-900", "shadow-xs");
      tabSignin?.classList.add("text-slate-600");

      if (title) title.textContent = "Buat Akun Baru";
      if (subtitle) {
        subtitle.textContent = "Daftar akun baru untuk menyimpan data kendaraan secara cloud di Supabase.";
      }
      if (submitBtn) {
        submitBtn.textContent = "Buat Akun Baru";
        delete submitBtn.dataset.originalHtml;
      }
    }
    return;
  }

  if (authMode === "forgot-password") {
    forgotPasswordForm?.classList.remove("hidden");
    if (title) title.textContent = "Reset Kata Sandi";
    if (subtitle) {
      subtitle.textContent = "Masukkan email terdaftar untuk menerima tautan pengaturan ulang kata sandi.";
    }

    const emailInput = /** @type {HTMLInputElement | null} */ (qs("#email"));
    const resetEmailInput = /** @type {HTMLInputElement | null} */ (qs("#input-reset-email"));
    if (emailInput?.value && resetEmailInput && !resetEmailInput.value) {
      resetEmailInput.value = emailInput.value.trim();
    }
    return;
  }

  if (authMode === "new-password") {
    newPasswordForm?.classList.remove("hidden");
    if (title) title.textContent = "Buat Kata Sandi Baru";
    if (subtitle) {
      subtitle.textContent = "Masukkan kata sandi baru minimal 6 karakter untuk akun Anda.";
    }
    return;
  }

  if (authMode === "forgot-username") {
    forgotUsernamePanel?.classList.remove("hidden");
    if (title) title.textContent = "Lupa Email / Username?";
    if (subtitle) {
      subtitle.textContent = "Temukan kembali alamat email yang terdaftar pada akun Vehicle Logbook Anda.";
    }

    const savedEmail = localStorage.getItem(LAST_EMAIL_KEY);
    const savedBox = qs("#saved-email-box");
    const savedMasked = qs("#saved-email-masked");
    if (savedEmail && savedBox && savedMasked) {
      savedMasked.textContent = maskEmail(savedEmail);
      savedBox.classList.remove("hidden");
    }
  }
}

/**
 * Translates raw Supabase Auth error messages into clear Indonesian guidance.
 * @param {unknown} err
 * @returns {string}
 */
function formatAuthErrorMessage(err) {
  const rawMsg = err instanceof Error ? err.message : String(err || "");

  if (rawMsg.includes("Invalid login credentials")) {
    return "Email atau kata sandi salah, atau akun belum terdaftar. Jika belum punya akun, klik tab 'Daftar' di atas terlebih dahulu.";
  }
  if (rawMsg.includes("Email not confirmed")) {
    return "Email belum dikonfirmasi. Cek inbox/spam email Anda, atau matikan 'Confirm email' di Supabase → Authentication → Providers → Email.";
  }
  if (rawMsg.includes("User already registered")) {
    return "Email ini sudah terdaftar. Silakan pindah ke tab 'Masuk' untuk login.";
  }
  if (rawMsg.includes("Password should be at least")) {
    return "Kata sandi minimal 6 karakter.";
  }
  if (rawMsg.includes("New password should be different")) {
    return "Kata sandi baru tidak boleh sama dengan kata sandi sebelumnya.";
  }
  if (rawMsg.includes("Auth session missing")) {
    return "Sesi pemulihan kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan reset ulang.";
  }
  if (rawMsg.includes("rate limit") || rawMsg.includes("security purposes")) {
    return "Terlalu banyak percobaan autentikasi. Tunggu beberapa saat lalu coba lagi.";
  }
  if (rawMsg.includes("Failed to fetch")) {
    return "Gagal terhubung ke server Supabase. Periksa koneksi internet dan konfigurasi SUPABASE_URL.";
  }

  return rawMsg || "Terjadi kesalahan autentikasi.";
}

/**
 * @param {string} message
 * @param {'error' | 'success'} [kind='error']
 */
function setAlert(message, kind = "error") {
  const box = qs("#auth-alert");
  if (!box) return;
  if (!message) {
    box.classList.add("hidden");
    box.textContent = "";
    return;
  }
  box.classList.remove(
    "hidden",
    "bg-rose-50",
    "text-rose-700",
    "border-rose-200",
    "bg-emerald-50",
    "text-emerald-700",
    "border-emerald-200"
  );
  if (kind === "success") {
    box.classList.add("bg-emerald-50", "text-emerald-700", "border-emerald-200");
  } else {
    box.classList.add("bg-rose-50", "text-rose-700", "border-rose-200");
  }
  box.textContent = message;
}

/**
 * @param {AuthMode} nextMode
 */
function switchMode(nextMode) {
  authMode = nextMode;
  setAlert("");
  updateAuthModeUI();
}

async function initLoginPage() {
  const isRecoveryRedirect =
    window.location.hash.includes("type=recovery") ||
    new URLSearchParams(window.location.search).get("type") === "recovery";

  if (!isSupabaseConfigured()) {
    setAlert(
      "SUPABASE_URL & SUPABASE_ANON_KEY belum terkonfigurasi. Tambahkan di Vercel Environment Variables atau .env lalu jalankan `npm run build`."
    );
  } else if (isRecoveryRedirect) {
    switchMode("new-password");
  } else {
    await redirectIfAuthenticated("./index.html");
  }

  onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      switchMode("new-password");
    }
  });

  qs("#tab-signin")?.addEventListener("click", () => switchMode("signin"));
  qs("#tab-signup")?.addEventListener("click", () => switchMode("signup"));
  qs("#btn-forgot-password")?.addEventListener("click", () => switchMode("forgot-password"));
  qs("#btn-forgot-username")?.addEventListener("click", () => switchMode("forgot-username"));

  document.querySelectorAll("[data-back-signin]").forEach((btn) => {
    btn.addEventListener("click", () => switchMode("signin"));
  });

  qs("#btn-use-saved-email")?.addEventListener("click", () => {
    const savedEmail = localStorage.getItem(LAST_EMAIL_KEY);
    const emailInput = /** @type {HTMLInputElement | null} */ (qs("#email"));
    const passwordInput = /** @type {HTMLInputElement | null} */ (qs("#password"));
    if (savedEmail && emailInput) {
      emailInput.value = savedEmail;
      switchMode("signin");
      passwordInput?.focus();
    }
  });

  // Form 1: Masuk & Daftar
  const form = /** @type {HTMLFormElement | null} */ (qs("#auth-form"));
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAlert("");

    const emailInput = /** @type {HTMLInputElement | null} */ (qs("#email"));
    const passwordInput = /** @type {HTMLInputElement | null} */ (qs("#password"));
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#auth-submit-btn"));

    const email = (emailInput?.value || "").trim();
    const password = passwordInput?.value || "";

    setButtonLoading(submitBtn, true, authMode === "signin" ? "Memproses..." : "Mendaftar...");

    try {
      if (authMode === "signin") {
        await signInWithPassword(email, password);
        localStorage.setItem(LAST_EMAIL_KEY, email);
        window.location.replace("./index.html");
      } else {
        const res = await signUpWithPassword(email, password);
        localStorage.setItem(LAST_EMAIL_KEY, email);
        if (res.session) {
          window.location.replace("./index.html");
        } else {
          setAlert(
            "Pendaftaran berhasil! Silakan cek inbox email Anda untuk konfirmasi sebelum masuk.",
            "success"
          );
        }
      }
    } catch (err) {
      setAlert(formatAuthErrorMessage(err));
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  // Form 2: Kirim Link Reset Kata Sandi
  const forgotPasswordForm = /** @type {HTMLFormElement | null} */ (qs("#form-forgot-password"));
  forgotPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAlert("");

    const resetEmailInput = /** @type {HTMLInputElement | null} */ (qs("#input-reset-email"));
    const resetSubmitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-reset-submit"));
    const email = (resetEmailInput?.value || "").trim();

    setButtonLoading(resetSubmitBtn, true, "Mengirim tautan...");

    try {
      await sendPasswordReset(email);
      setAlert(
        `Tautan reset kata sandi telah dikirim ke ${email}. Silakan periksa inbox atau folder spam email Anda.`,
        "success"
      );
    } catch (err) {
      setAlert(formatAuthErrorMessage(err));
    } finally {
      setButtonLoading(resetSubmitBtn, false);
    }
  });

  // Form 3: Simpan Kata Sandi Baru (Recovery)
  const newPasswordForm = /** @type {HTMLFormElement | null} */ (qs("#form-new-password"));
  newPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAlert("");

    const newPassInput = /** @type {HTMLInputElement | null} */ (qs("#input-new-password"));
    const confirmPassInput = /** @type {HTMLInputElement | null} */ (qs("#input-confirm-password"));
    const newPassSubmitBtn = /** @type {HTMLButtonElement | null} */ (qs("#btn-new-password-submit"));

    const newPass = newPassInput?.value || "";
    const confirmPass = confirmPassInput?.value || "";

    if (newPass !== confirmPass) {
      setAlert("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setButtonLoading(newPassSubmitBtn, true, "Menyimpan...");

    try {
      await updateUserPassword(newPass);
      window.history.replaceState({}, document.title, window.location.pathname);
      setAlert("Kata sandi berhasil diperbarui! Mengalihkan ke dashboard...", "success");
      setTimeout(() => {
        window.location.replace("./index.html");
      }, 1200);
    } catch (err) {
      setAlert(formatAuthErrorMessage(err));
    } finally {
      setButtonLoading(newPassSubmitBtn, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", initLoginPage);