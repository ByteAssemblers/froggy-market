const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';

// Helper to build query strings
function buildQueryString(params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

// Unified request wrapper for fetch
async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // if your backend uses cookies
    cache: 'no-store', // disable caching for live data
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} ${text}`);
  }

  return res.json();
}

// The actual API object
export const belIndexerApi = {
  getStatus() {
    return request(`/bel20/status`);
  },

  async getTokens(params = {}) {
    const query = buildQueryString(params);
    const data = await request(`/bel20/tokens${query}`);
    if (data && typeof data === 'object') {
      if (Array.isArray(data.tokens)) {
        return {
          tokens: data.tokens,
          count: typeof data.count === 'number' ? data.count : data.tokens.length,
          pages: typeof data.pages === 'number' ? data.pages : 1,
        };
      }
      if (Array.isArray(data)) {
        return { tokens: data, count: data.length, pages: 1 };
      }
    } else if (Array.isArray(data)) {
      return { tokens: data, count: data.length, pages: 1 };
    }
    return { tokens: [], count: 0, pages: 0 };
  },

  async getToken(tick: string, params = {}) {
    const normalizedTick = tick?.trim();
    if (!normalizedTick) throw new Error('belIndexerApi.getToken: tick is required');
    const query = buildQueryString(params);
    return request(`/bel20/token/${encodeURIComponent(normalizedTick)}${query}`);
  },

  async getTokenEvents(tick: string, params = {}) {
    const normalizedTick = tick?.trim();
    if (!normalizedTick) throw new Error('belIndexerApi.getTokenEvents: tick is required');
    const query = buildQueryString(params);
    return request(`/bel20/token/${encodeURIComponent(normalizedTick)}/events${query}`);
  },

  async getTokenHolders(tick: string, params = {}) {
    const normalizedTick = tick?.trim();
    if (!normalizedTick) throw new Error('belIndexerApi.getTokenHolders: tick is required');
    const query = buildQueryString({ ...params, tick: normalizedTick });
    return request(`/bel20/holders${query}`);
  },

  async getTokenHolderStats(tick: string, params = {}) {
    const normalizedTick = tick?.trim();
    if (!normalizedTick) throw new Error('belIndexerApi.getTokenHolderStats: tick is required');
    const query = buildQueryString({ ...params, tick: normalizedTick });
    return request(`/bel20/holders-stats${query}`);
  },

  async getAddressTokens(address: string, params = {}) {
    const normalizedAddr = address?.trim();
    if (!normalizedAddr) throw new Error('belIndexerApi.getAddressTokens: address is required');
    const query = buildQueryString(params);
    return request(`/bel20/address/${encodeURIComponent(normalizedAddr)}/tokens${query}`);
  },

  async getAddressTokenBalance(address: string, tick: string, params = {}) {
    const normalizedAddr = address?.trim();
    const normalizedTick = tick?.trim();
    if (!normalizedAddr) throw new Error('belIndexerApi.getAddressTokenBalance: address is required');
    if (!normalizedTick) throw new Error('belIndexerApi.getAddressTokenBalance: tick is required');
    const query = buildQueryString(params);
    return request(
      `/bel20/address/${encodeURIComponent(normalizedAddr)}/${encodeURIComponent(normalizedTick)}/balance${query}`,
    );
  },

  async getAddressHistory(address: string, params = {}) {
    const normalizedAddr = address?.trim();
    if (!normalizedAddr) throw new Error('belIndexerApi.getAddressHistory: address is required');
    const query = buildQueryString(params);
    return request(`/bel20/address/${encodeURIComponent(normalizedAddr)}/history${query}`);
  },
};
