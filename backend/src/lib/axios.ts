import axios from 'axios';

// ORD API client
export const ordClient = axios.create({
  baseURL: process.env.ORD_API_BASE || 'http://62.84.181.219:7777',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// BelIndex API client
export const belIndexClient = axios.create({
  baseURL: process.env.BELINDEX_API_BASE || 'http://172.16.11.131:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Pepecoin RPC client
export const pepecoinRpcClient = axios.create({
  baseURL: process.env.PEPECOIN_RPC_URL || 'http://172.16.11.131:33873',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  auth: {
    username: process.env.PEPECOIN_RPC_USER || '',
    password: process.env.PEPECOIN_RPC_PASSWORD || '',
  },
});

// Response interceptor for error handling
ordClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('ORD API Error:', error.message);
    return Promise.reject(error);
  }
);

belIndexClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('BelIndex API Error:', error.message);
    return Promise.reject(error);
  }
);

pepecoinRpcClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Pepecoin RPC Error:', error.message);
    return Promise.reject(error);
  }
);
