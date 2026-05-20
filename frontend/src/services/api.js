// ============================================================
// FILE: frontend/src/services/api.js
// DESCRIPTION: Axios instance + all API service functions
// ============================================================

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Axios instance ────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach token ────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    console.log("TOKEN:", token)
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh token ─────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(
            `${BASE_URL}/auth/refresh`, {},
            { headers: { Authorization: `Bearer ${refresh}` } }
          );
          const { access_token } = res.data;
          localStorage.setItem("access_token", access_token);
          original.headers.Authorization = `Bearer ${access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ──────────────────────────────────────────────────────────
// AUTH API
// ──────────────────────────────────────────────────────────
export const authAPI = {
  login:         (data)           => api.post("/auth/login",          data),
  register:      (data)           => api.post("/auth/register",        data),
  verifyOtp:     (data)           => api.post("/auth/verify-otp",      data),
  logout:        ()               => api.post("/auth/logout"),
  getMe:         ()               => api.get("/auth/me"),
  forgotPassword:(email)          => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password)=> api.post("/auth/reset-password",  { token, password }),
  refresh:       (token)          => axios.post(`${BASE_URL}/auth/refresh`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  }),
};

// ──────────────────────────────────────────────────────────
// DASHBOARD API
// ──────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () =>
    api.get("/dashboard/stats"),

  getFraudTrend: (days) =>
    api.get(`/dashboard/charts/fraud-trend?days=${days}`),

  getRiskDistribution: () =>
    api.get("/dashboard/charts/risk-distribution"),

  getCityHeatmap: () =>
    api.get("/dashboard/charts/city-heatmap"),

  getMerchantRisk: () =>
    api.get("/dashboard/charts/merchant-risk"),

  getRecentFraud: (limit = 10) =>
    api.get(`/dashboard/recent-fraud?limit=${limit}`),

  getAlerts: (limit = 20) =>
    api.get(`/dashboard/alerts?limit=${limit}`),

  markAlertRead: (id) =>
    api.put(`/dashboard/alerts/${id}/read`),
};

// ──────────────────────────────────────────────────────────
// TRANSACTIONS API
// ──────────────────────────────────────────────────────────
export const transactionsAPI = {
  getAll:  (params)    => api.get("/transactions/",     { params }),
  getById: (id)        => api.get(`/transactions/${id}`),
  create:  (data)      => api.post("/transactions/",    data),
  update:  (id, data)  => api.put(`/transactions/${id}`, data),
  delete:  (id)        => api.delete(`/transactions/${id}`),
  analyze: (id)        => api.get(`/transactions/${id}/analyze`),
};

// ──────────────────────────────────────────────────────────
// FRAUD API
// ──────────────────────────────────────────────────────────
export const fraudAPI = {
  getLogs:          (params)      => api.get("/fraud/logs",           { params }),
  getLog:           (id)          => api.get(`/fraud/logs/${id}`),
  analyze:          (txnId)       => api.post("/fraud/analyze",       { transaction_id: txnId }),
  explain:          (txnId)       => api.get(`/fraud/explain/${txnId}`),
  getFeatureImportance: ()        => api.get("/fraud/feature-importance"),
  getStatistics:    (days=30)     => api.get(`/fraud/statistics?days=${days}`),
  reviewLog:        (id, data)    => api.put(`/fraud/logs/${id}/review`, data),
  getAlerts:        (params)      => api.get("/fraud/alerts",         { params }),
  markAlertRead:    (id)          => api.put(`/fraud/alerts/${id}/read`),
  markAllRead:      ()            => api.put("/fraud/alerts/read-all"),
  getRiskProfiles:  (params)      => api.get("/fraud/risk-profiles",  { params }),
  getUserRiskProfile: (uid)       => api.get(`/fraud/risk-profiles/${uid}`),
  bulkAnalyze:      (ids)         => api.post("/fraud/bulk-analyze",  { transaction_ids: ids }),
  getHeatmap:       (days=30)     => api.get(`/fraud/heatmap?days=${days}`),
  getTrends:        (days=30)     => api.get(`/fraud/trends?days=${days}`),
};

// ──────────────────────────────────────────────────────────
// CHATBOT API
// ──────────────────────────────────────────────────────────
export const chatbotAPI = {
  sendMessage: (message) => api.post("/chatbot/message", { message }),
};

// ──────────────────────────────────────────────────────────
// REPORTS API
// ──────────────────────────────────────────────────────────
export const reportsAPI = {
  getStats:  (params) => api.get("/reports/stats",    { params }),
  generate:  (data)   => api.post("/reports/generate", data, { responseType: "blob" }),
};

export default api;