// public/js/controllers/login-controller.js
import { getCurrentSession, signInWithEmail, signUpWithEmail } from '../core/auth-service.js';

async function init() {
  try {
    const session = await getCurrentSession();
    if (session) {
      window.location.href = '/';
      return;
    }
  } catch {
    // Abaikan jika belum login
  }

  const form = /** @type {HTMLFormElement | null} */ (document.getElementById('form-auth'));
  const statusEl = document.getElementById('auth-status');
  const btnSignUp = document.getElementById('btn-signup');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    if (statusEl) {
      statusEl.textContent = 'Memproses masuk...';
      statusEl.className = 'text-xs text-amber-400';
    }

    try {
      await signInWithEmail(email, password);
      window.location.href = '/';
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err instanceof Error ? err.message : 'Gagal masuk.';
        statusEl.className = 'text-xs text-rose-400';
      }
    }
  });

  btnSignUp?.addEventListener('click', async () => {
    if (!form) return;
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '');

    if (!email || password.length < 6) {
      if (statusEl) {
        statusEl.textContent = 'Masukkan email dan password minimal 6 karakter.';
        statusEl.className = 'text-xs text-rose-400';
      }
      return;
    }

    try {
      await signUpWithEmail(email, password);
      if (statusEl) {
        statusEl.textContent = 'Akun berhasil dibuat. Silakan klik Masuk (atau cek email konfirmasi).';
        statusEl.className = 'text-xs text-emerald-400';
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err instanceof Error ? err.message : 'Gagal mendaftar.';
        statusEl.className = 'text-xs text-rose-400';
      }
    }
  });
}

init();
