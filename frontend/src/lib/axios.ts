import axios from "axios";

// Backend API instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FROGGY_MARKET_BACKEND,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Blockchain API instance (ORD API)
export const blockchainClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_ORD_API_BASE,
  timeout: 30000,
});

// BelIndex API instance
export const belIndexClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BELINDEX_API_BASE,
  timeout: 30000,
});

// Request interceptor (for adding auth tokens, logging, etc.)
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor (for error handling)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error("Network Error:", error.message);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  },
);

// Add similar interceptors for other clients
blockchainClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Blockchain API Error:", error.message);
    return Promise.reject(error);
  },
);

belIndexClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("BelIndex API Error:", error.message);
    return Promise.reject(error);
  },
);
