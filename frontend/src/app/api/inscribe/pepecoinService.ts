import axios from "axios";

const pepecoinRpcUrl = process.env.PEPECOIN_RPC_URL!;
const pepecoinRpcUser = process.env.PEPECOIN_RPC_USER!;
const pepecoinRpcPassword = process.env.PEPECOIN_RPC_PASSWORD!;

function ensureRpcConfigured() {
  if (!pepecoinRpcUrl) {
    throw new Error("Pepecoin RPC URL is not configured");
  }
}

function buildRpcPayload(method: string, params: any[] = []) {
  return {
    jsonrpc: "1.0",
    id: "froggymarket",
    method,
    params,
  };
}

async function callPepecoinRpc(
  method: string,
  params: any[] = [],
  timeout = 20000,
) {
  ensureRpcConfigured();

  const config: any = {
    url: pepecoinRpcUrl,
    method: "post",
    headers: { "Content-Type": "application/json" },
    data: buildRpcPayload(method, params),
    timeout,
  };

  if (pepecoinRpcUser) {
    config.auth = {
      username: pepecoinRpcUser,
      password: pepecoinRpcPassword || "",
    };
  }

  try {
    const response = await axios(config);
    const { data } = response;

    // Ensure we handle the response properly even if there are unexpected fields.
    if (data && typeof data === "object") {
      if (data.error) {
        const err = data.error;
        const message =
          (err && typeof err === "object" && err.message) ||
          String(err) ||
          "Pepecoin RPC error";
        const error: any = new Error(message);
        if (err && typeof err === "object" && err.code !== undefined) {
          error.code = err.code;
        }
        error.rpcResponse = data;
        throw error;
      }
      // Ensure the response structure is valid and txid is available
      if (
        data.result &&
        typeof data.result === "string" &&
        data.result.length === 64
      ) {
        return data.result; // Return the txid
      } else {
        throw new Error(
          `Unexpected result format: ${JSON.stringify(data.result)}`,
        );
      }
    }

    throw new Error("Unexpected response from Pepecoin RPC");
  } catch (error: any) {
    if (error.response && typeof error.response.data === "object") {
      const rpcData = error.response.data;
      if (
        rpcData &&
        typeof rpcData.error === "object" &&
        rpcData.error !== null
      ) {
        const { message, code } = rpcData.error;
        const rpcError: any = new Error(
          message || `Pepecoin RPC error (status ${error.response.status})`,
        );
        if (code !== undefined) {
          rpcError.code = code;
        }
        rpcError.rpcResponse = rpcData;
        throw rpcError;
      }
      const rpcError: any = new Error(
        `Pepecoin RPC HTTP ${error.response.status}: ${JSON.stringify(rpcData)}`,
      );
      rpcError.rpcResponse = rpcData;
      throw rpcError;
    }

    throw error;
  }
}

async function broadcastPepecoinTransaction(
  rawHex: string,
  { allowHighFees = false } = {},
) {
  const hex = typeof rawHex === "string" ? rawHex.trim() : "";
  if (!hex) {
    throw new Error(
      "broadcastPepecoinTransaction: raw transaction hex is empty",
    );
  }
  const params: any = [hex];
  if (allowHighFees) {
    params.push(true);
  }

  return callPepecoinRpc("sendrawtransaction", params);
}

export { broadcastPepecoinTransaction };
