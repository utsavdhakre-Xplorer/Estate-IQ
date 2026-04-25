import axios from "axios";

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export async function getHealth() {
  const { data } = await client.get("/health");
  return data;
}

export async function getMetadata() {
  const { data } = await client.get("/metadata");
  return data;
}

export async function predictPrice(payload) {
  const { data } = await client.post("/predict", payload);
  return data;
}

