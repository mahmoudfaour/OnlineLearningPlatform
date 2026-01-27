import api from "./apiClient";

export async function login(email, password) {
  const { data } = await api.post("/api/auth/login", { email, password });
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("fullName", data.fullName);
  localStorage.setItem("userId", data.userId);
  return data;
}

export async function register(fullName, email, password, role) {
  const { data } = await api.post("/api/auth/register", {
    fullName,
    email,
    password,
    role,
  });
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("fullName", data.fullName);
  localStorage.setItem("userId", data.userId);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("fullName");
  localStorage.removeItem("userId");
}
