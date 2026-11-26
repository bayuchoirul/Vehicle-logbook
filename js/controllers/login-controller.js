import {
  redirectIfAuthenticated,
  signInWithPassword,
  signUpWithPassword
} from "../services/auth-service.js";
import { isSupabaseConfigured } from "../services/supabase-client.js";
import { qs, setButtonLoading } from "../utils/dom.js";

/** @type {'signin' | 'signup'} */
let authMode = "signin";

function updateAuthModeUI() {
  const tabSignin = qs("#tab-signin");
  const tabSignup = qs("#tab-signup");
  const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#auth-submit-btn"));
  const subtitle = qs("#auth-subtitle");

  if (authMode === "signin") {
    tabSignin?.classList.add("bg-white", "text-slate-900", "shadow-xs");
    tabSignin?.classList.remove("text-slate-600");
    tabSignup?.classList.remove("bg-white", "text-slate-900", "shadow-xs");
    tabSignup?.classList.add("text-slate-600");
    if (submitBtn) {
      submitBtn.textContent = "Masuk ke Logbook";
      delete submitBtn.dataset.originalHtml;
    }
    if (subtitle) {
      subtitle.textContent = "Masuk untuk memantau konsumsi BBM & riwayat servis kendaraan.";
    }
  } else {
    tabSignup?.classList.add("bg-white", "text-slate-900", "shadow-xs");
    tabSignup?.classList.remove("text-slate-600");
    tabSignin?.classList.remove("bg-white", "text-slate-900", "shadow-xs");
    tabSignin?.classList.add("text-slate-600");
    if (submitBtn) {
      submitBtn.textContent = "Buat Akun Baru";
      delete submitBtn.dataset.originalHtml;
    }
    if (subtitle) {
      subtitle.textContent = "Daftar akun baru untuk menyimpan data kendaraan secara cloud di Supabase.";
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
  if (rawMsg.includes("rate limit")) {
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

async function initLoginPage() {
  if (!isSupabaseConfigured()) {
    setAlert(
      "SUPABASE_URL & SUPABASE_ANON_KEY belum terkonfigurasi. Tambahkan di Vercel Environment Variables atau .env lalu jalankan `npm run build`."
    );
  } else {
    await redirectIfAuthenticated("./index.html");
  }

  qs("#tab-signin")?.addEventListener("click", () => {
    authMode = "signin";
    setAlert("");
    updateAuthModeUI();
  });

  qs("#tab-signup")?.addEventListener("click", () => {
    authMode = "signup";
    setAlert("");
    updateAuthModeUI();
  });

  const form = /** @type {HTMLFormElement | null} */ (qs("#auth-form"));
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAlert("");

    const emailInput = /** @type {HTMLInputElement | null} */ (qs("#email"));
    const passwordInput = /** @type {HTMLInputElement | null} */ (qs("#password"));
    const submitBtn = /** @type {HTMLButtonElement | null} */ (qs("#auth-submit-btn"));

    const email = emailInput?.value || "";
    const password = passwordInput?.value || "";

    setButtonLoading(submitBtn, true, authMode === "signin" ? "Memproses..." : "Mendaftar...");

    try {
      if (authMode === "signin") {
        await signInWithPassword(email, password);
        window.location.replace("./index.html");
      } else {
        const res = await signUpWithPassword(email, password);
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
}

document.addEventListener("DOMContentLoaded", initLoginPage);