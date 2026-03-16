import axios from "axios";

const envApiUrl = import.meta.env.VITE_API_URL || "";

export const API_BASE_URL = envApiUrl
    ? (envApiUrl.startsWith('/') ? envApiUrl : envApiUrl)
    : "http://16.171.52.155:5000";

const isDev = import.meta.env.DEV;
const baseUrl = isDev 
    ? "/api" 
    : `${API_BASE_URL}/api`;

export const API_FULL_BASE_URL = baseUrl;

console.log('[API Config]', { isDev, envApiUrl, API_BASE_URL, baseUrl });

const API = axios.create({
    baseURL: baseUrl,
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

export default API;
