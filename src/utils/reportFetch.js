// Shared helpers for the Reports screens. Filtering now happens on the backend,
// so each screen just passes the selected month/year and renders what it gets.

const base = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const readJson = async (res) => {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Server returned status ${res.status} (expected JSON)`);
  }
  return res.json().catch(() => {
    throw new Error("Invalid JSON response from server");
  });
};

const buildQuery = ({ month, year } = {}) => {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (year) params.set("year", year);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

// Fetch a report list (bill | expenses | inventory | rent | salary), filtered
// server-side by the given period. Throws on failure so the caller can show an
// error state.
export const fetchReport = async (type, period) => {
  const res = await fetch(`${base}/api/report/${type}${buildQuery(period)}`);
  const json = await readJson(res);
  if (!res.ok || !json.success) throw new Error(json?.message || `Request failed (${res.status})`);
  return Array.isArray(json.data) ? json.data : [];
};

// Fetch the computed financial summary (P&L + trend) for a period.
export const fetchSummary = async (period) => {
  const res = await fetch(`${base}/api/report/summary${buildQuery(period)}`);
  const json = await readJson(res);
  if (!res.ok || !json.success) throw new Error(json?.message || "Failed to load summary");
  return json.data;
};

// Most recent 6 years, newest first — replaces the hardcoded year lists.
export const YEARS = Array.from(
  { length: 6 },
  (_, i) => new Date().getFullYear() - i,
);

export const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(0, i).toLocaleString("default", { month: "long" }),
}));

export const formatINR = (n) =>
  (Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
