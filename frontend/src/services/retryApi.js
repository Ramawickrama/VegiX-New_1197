import axios from 'axios';

const retryApi = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

retryApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default retryApi;