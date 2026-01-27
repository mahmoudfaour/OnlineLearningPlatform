export function getToken() {
  return localStorage.getItem("token") || "";
}

export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Decode JWT payload (no library)
function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Common keys for NameIdentifier
  const nameId =
    payload["nameid"] ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

  const id = parseInt(nameId, 10);
  return Number.isFinite(id) ? id : null;
}
