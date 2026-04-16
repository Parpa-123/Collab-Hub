import axios from "axios";
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");
const base_url = normalizedApiBaseUrl.endsWith("/api")
    ? normalizedApiBaseUrl
    : `${normalizedApiBaseUrl}/api`;
const connect = axios.create({
    baseURL: base_url,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

let isRefreshing = false;

connect.interceptors.request.use(
    (request) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            request.headers["Authorization"] = `Bearer ${token}`;
        }
        return request;
    },
    (error) => {
        return Promise.reject(error);
    }
);
connect.interceptors.response.use(
    (response) => response,
    async (error) => {
        const og_config = error.config;
        if (og_config.url?.includes('/accounts/refresh/')) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            return Promise.reject(error);
        }
        if (error.response?.status === 401 && !og_config._retry && !isRefreshing) {

            og_config._retry = true;
            isRefreshing = true;
            try {
                const refresh = localStorage.getItem("refreshToken");
                if (!refresh) {
                    throw new Error("Refresh token not found");
                }
                const response = await axios.post(`${base_url}/accounts/refresh/`, {
                    refresh: refresh,
                });
                localStorage.setItem("accessToken", response.data.access);
                localStorage.setItem("refreshToken", response.data.refresh);
                og_config.headers["Authorization"] = `Bearer ${response.data.access}`;
                return axios(og_config);
            } catch (error) {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        } else if (error.response?.status === 403) {
            console.error('403 Forbidden:', error.response.data);
        }
        return Promise.reject(error);
    }
);
export default connect;