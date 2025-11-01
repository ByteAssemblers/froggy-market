import axios, { AxiosRequestConfig } from "axios";
import { NextResponse } from "next/server";

const BASE_URL = process.env.BELINDEX_API_BASE!;

export async function forwardBelIndexerJson(
  path: string,
  options: AxiosRequestConfig,
  errorMessage: string
) {
  try {
    const url = `${BASE_URL}${path}`;
    const { data } = await axios.get(url, options);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`${errorMessage}:`, error.message);
    const status = error.response?.status ?? 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function proxyBelIndexerRequest(
  path: string,
  method: "GET" | "POST",
  body?: any,
  config?: AxiosRequestConfig
) {
  const url = `${BASE_URL}${path}`;
  return axios.request({
    url,
    method,
    data: body,
    ...config,
  });
}
