const KEY = "estateiq_history_v1";

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 5);
  } catch {
    return [];
  }
}

export function saveHistory(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 5)));
  } catch {
    // ignore
  }
}

export function pushHistory(entry) {
  const current = loadHistory();
  const next = [entry, ...current].slice(0, 5);
  saveHistory(next);
  return next;
}

