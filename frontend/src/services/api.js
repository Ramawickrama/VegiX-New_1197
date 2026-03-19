import axios from "axios";

const API_BASE_URL = "/api";

const API = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000,
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('[API Request]', config.method?.toUpperCase(), config.url);
    return config;
});

API.interceptors.response.use(
    (response) => {
        console.log('[API Response]', response.config.url, response.status);
        return response;
    },
    (error) => {
        console.error('[API Error]', error.config?.url, error.response?.status, error.message);
        return Promise.reject(error);
    }
);

export { API_BASE_URL };
export default API;
