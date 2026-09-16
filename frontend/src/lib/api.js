import axios from "axios";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const http = axios.create({ baseURL: BASE });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("ozoo_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErr(e) {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || "Something went wrong.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x?.msg ? x.msg : JSON.stringify(x))).join(" ");
  return String(d);
}

const qs = (params = {}) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false);
  return p.length ? "?" + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&") : "";
};

const get = (path, params) => http.get(path + qs(params)).then((r) => r.data);
const post = (path, body) => http.post(path, body).then((r) => r.data);

export const api = {
  login: (email, password) => post("/auth/login", { email, password }),
  me: () => get("/auth/me"),
  logout: () => post("/auth/logout"),
  bootstrap: () => get("/bootstrap"),
  dashboard: (business_id) => get("/dashboard", { business_id }),
  tasks: (params) => get("/tasks", params),
  task: (id) => get(`/tasks/${id}`),
  createTask: (body) => post("/tasks", body),
  transition: (id, body) => post(`/tasks/${id}/transition`, body),
  clientAction: (id, body) => post(`/tasks/${id}/client-action`, body),
  addComment: (id, body) => post(`/tasks/${id}/comments`, body),
  toggleChecklist: (id, itemId) => post(`/tasks/${id}/checklist/${itemId}/toggle`),
  toggleSubtask: (id, subId) => post(`/tasks/${id}/subtask/${subId}/toggle`),
  projects: (business_id) => get("/projects", { business_id }),
  project: (id) => get(`/projects/${id}`),
  clients: (business_id) => get("/clients", { business_id }),
  client: (id) => get(`/clients/${id}`),
  services: (business_id) => get("/services", { business_id }),
  teams: (business_id) => get("/teams", { business_id }),
  users: (business_id) => get("/users", { business_id }),
  groupWork: (business_id) => get("/group/work", { business_id }),
  workflowOverview: (business_id) => get("/workflow/overview", { business_id }),
  reports: (business_id) => get("/reports", { business_id }),
  activity: (business_id, limit) => get("/activity", { business_id, limit }),
  audit: (business_id) => get("/audit", { business_id }),
  notifications: () => get("/notifications"),
  readAll: () => post("/notifications/read-all"),
  search: (q) => get("/search", { q }),
};
