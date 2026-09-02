// storage.js — all persistence (auto-save) logic lives here, isolated from rendering/state logic.
//
// This app can run in two environments:
//   1) Inside Claude's own artifact preview, which provides a special `window.storage` API.
//   2) As a real, independently hosted site/app (GitHub Pages, or wrapped into an Android APK),
//      where `window.storage` does not exist — so we fall back to the browser's own
//      localStorage, which is what makes auto-save actually work once deployed for real.

const AUTH_KEY = 'finance-auth';
const DATA_KEY = 'finance-data';
const CHAT_KEY = 'finance-chat';

function hasAppStorage() {
  return typeof window !== 'undefined' && window.storage && typeof window.storage.get === 'function';
}

async function rawGet(key) {
  if (hasAppStorage()) {
    try {
      const res = await window.storage.get(key, false);
      return res ? res.value : null;
    } catch (e) {
      return null;
    }
  }
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

async function rawSet(key, value) {
  if (hasAppStorage()) {
    try {
      const res = await window.storage.set(key, value, false);
      return !!res;
    } catch (e) {
      return false;
    }
  }
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

async function rawDelete(key) {
  if (hasAppStorage()) {
    try { await window.storage.delete(key, false); } catch (e) { /* ignore */ }
    return;
  }
  try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
}

/* ---------------- Auth ---------------- */
export async function loadAuth() {
  const raw = await rawGet(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}
export async function saveAuth(auth) {
  return rawSet(AUTH_KEY, JSON.stringify(auth));
}

/* ---------------- Finance data ---------------- */
export async function loadData(defaultDataFn) {
  const raw = await rawGet(DATA_KEY);
  return raw ? JSON.parse(raw) : defaultDataFn();
}
export async function saveData(data) {
  return rawSet(DATA_KEY, JSON.stringify(data));
}

/* ---------------- Chat ---------------- */
export async function loadChat() {
  const raw = await rawGet(CHAT_KEY);
  return raw ? JSON.parse(raw) : [];
}
export async function saveChat(chat) {
  const trimmed = chat.slice(-30);
  await rawSet(CHAT_KEY, JSON.stringify(trimmed));
  return trimmed;
}

/* ---------------- Full account deletion ---------------- */
export async function deleteEverything() {
  await rawDelete(AUTH_KEY);
  await rawDelete(DATA_KEY);
  await rawDelete(CHAT_KEY);
}
