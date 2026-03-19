import api from '../api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const retryApi = api;

retryApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest._retry) {
      originalRequest._retry = 0;
    }

    if (
      (error.code === 'ECONNABORTED' ||
        error.response?.status === 503 ||
        error.response?.status === 504) &&
      originalRequest._retry < MAX_RETRIES
    ) {
      originalRequest._retry += 1;
      retryCount += 1;

      console.log(`Retry attempt ${originalRequest._retry}/${MAX_RETRIES} for ${originalRequest.url}`);

      await sleep(RETRY_DELAY * originalRequest._retry);

      return retryApi(originalRequest);
    }

    retryCount = 0;
    return Promise.reject(error);
  }
);

export { default } from '../api';
export const getRetryCount = () => retryCount;
export const resetRetryCount = () => {
  retryCount = 0;
};
