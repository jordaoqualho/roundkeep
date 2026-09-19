export function hostname(host) {
  const raw = String(host || "").trim();
  if (!raw) return "";
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    if (end !== -1) return raw.slice(1, end);
  }
  if ((raw.match(/:/g) || []).length > 1) return raw;
  return raw.split(":")[0];
}

export function isLoopbackHost(host) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname(host));
}

export function isAllowedHost(host) {
  const h = hostname(host);
  if (isLoopbackHost(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}
