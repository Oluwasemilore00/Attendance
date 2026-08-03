import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "";

const api = axios.create({ baseURL });

// Attach access token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparently refresh the access token on 401 once.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const refresh = localStorage.getItem("refresh_token");
    if (
      error.response?.status === 401 &&
      refresh &&
      !original._retry &&
      !original.url.includes("/auth/")
    ) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${baseURL}/api/auth/refresh`, null, {
            headers: { Authorization: `Bearer ${refresh}` },
          });
        const { data } = await refreshing;
        refreshing = null;
        localStorage.setItem("access_token", data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/**
 * Download a protected file endpoint as a blob and trigger a browser save.
 * Uses the same axios instance so the Authorization header is sent automatically.
 */
export async function downloadFile(url) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data);
  const disposition = res.headers["content-disposition"] || "";
  const match = disposition.match(/filename[^;=\n]*=["']?([^"';\n]+)["']?/i);
  const filename = match ? match[1].trim() : "export.xlsx";
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
