import axios from "axios";

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error.config?.url, error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default API;
