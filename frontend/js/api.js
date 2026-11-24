import { getConfig } from "./store.js";

export async function apiGetAll(overrideUrl = null, overrideToken = null) {
  const cfg = getConfig();
  const url = overrideUrl ?? cfg.url;
  const token = overrideToken ?? cfg.token;
  if (!url) throw new Error("Web App URL belum dikonfigurasi");

  const res = await fetch(`${url}?token=${encodeURIComponent(token)}`);
  const json = await res.json();
  if (json.status !== "success") {
    throw new Error(json.message || "Gagal mengambil data dari server");
  }
  return json.data;
}

export async function apiPostAction(action, payload = {}) {
  const cfg = getConfig();
  if (!cfg.url) return null;

  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action,
      token: cfg.token,
      ...payload
    })
  });
  const json = await res.json();
  if (json.status !== "success") {
    throw new Error(json.message || "Gagal menyimpan perubahan ke server");
  }
  return json;
}
