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

export function isLoopbackAddress(address) {
  let raw = String(address || "")
    .trim()
    .toLowerCase();
  if (!raw) return false;
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    if (end !== -1) raw = raw.slice(1, end);
  }
  raw = raw.split("%")[0];
  return (
    raw === "127.0.0.1" ||
    raw === "::1" ||
    raw === "0:0:0:0:0:0:0:1" ||
    raw === "::ffff:127.0.0.1"
  );
}

export function isLoopbackRequest(req) {
  const socket = req?.socket;
  if (!socket) return false;
  if (socket.remoteAddress != null && socket.remoteAddress !== "") {
    return isLoopbackAddress(socket.remoteAddress);
  }
  try {
    return isLoopbackAddress(socket.address?.()?.address);
  } catch {
    return false;
  }
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

export function isSocketIoPath(pathname) {
  return String(pathname || "").startsWith("/socket.io");
}

export function allowSocketRequest(req, cb) {
  cb(null, isAllowedHost(req?.headers?.host));
}
