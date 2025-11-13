import axios, { AxiosRequestConfig } from "axios";
import { NextResponse } from "next/server";

const BASE_URL = process.env.BELINDEX_API_BASE;

export async function forwardBelIndexerJson(
  path: string,
  options: AxiosRequestConfig,
  errorMessage: string,
) {
  try {
    if (!BASE_URL) {
      console.error("BELINDEX_API_BASE environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error: BELINDEX_API_BASE not set" },
        { status: 500 }
      );
    }

    const url = `${BASE_URL}${path}`;
    console.log(`[BelIndexer] Fetching: ${url}`);
    const { data } = await axios.get(url, options);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`${errorMessage}:`, error.message);
    console.error(`URL attempted: ${BASE_URL}${path}`);
    const status = error.response?.status ?? 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function proxyBelIndexerRequest(
  path: string,
  method: "GET" | "POST",
  body?: any,
  config?: AxiosRequestConfig,
) {
  const url = `${BASE_URL}${path}`;
  return axios.request({
    url,
    method,
    data: body,
    ...config,
  });
}
