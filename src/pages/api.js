// src/api.js
const RAW_BASE = import.meta.env.VITE_BACKEND_URL 
const BASE = RAW_BASE.replace(/\/+$/, ""); 

/**
 * SOLUTION CENTRALISÉE POUR NGROK
 * On ajoute ce header pour bypasser l'écran d'avertissement de ngrok.
 */
function getCommonHeaders() {
  return {};
}
function buildUrl(endpoint) {
  if (!endpoint) endpoint = "/";
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const ep = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const withApi = ep.startsWith("/api/") || ep === "/api" ? ep : `/api${ep}`;
  return `${BASE}${withApi}`;
}

function getStoredTokens() {
  return {
    access: localStorage.getItem("access_token") || localStorage.getItem("access"),
    refresh: localStorage.getItem("refresh_token") || localStorage.getItem("refresh"),
  };
}

export function setTokens({ access, refresh, access_token, refresh_token } = {}) {
  if (access || access_token) localStorage.setItem("access_token", access || access_token);
  if (refresh || refresh_token) localStorage.setItem("refresh_token", refresh || refresh_token);
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

export function getAuthHeader() {
  const token = getStoredTokens().access;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const text = await res.text().catch(() => "");
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function fetchData(endpoint) {
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    headers: { ...getCommonHeaders(), ...getAuthHeader() },
  });
  return handleResponse(res);
}

export async function postData(endpoint, data) {
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      ...getCommonHeaders(), 
      ...getAuthHeader() 
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function putData(endpoint, data) {
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json", 
      ...getCommonHeaders(), 
      ...getAuthHeader() 
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function patchData(endpoint, data) {
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json", 
      ...getCommonHeaders(), 
      ...getAuthHeader() 
    },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function patchFormData(endpoint, formData) {
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...getCommonHeaders(), ...getAuthHeader() },
    body: formData,
  });
  return handleResponse(res);
}

export async function deleteData(endpoint) {
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...getCommonHeaders(), ...getAuthHeader() },
  });
  return handleResponse(res);
}

export async function postFormData(endpoint, formData) {
  const url = buildUrl(endpoint);
  const res = await fetch(url, {
    method: "POST",
    headers: { ...getCommonHeaders(), ...getAuthHeader() },
    body: formData,
  });
  return handleResponse(res);
}

export async function loginAndStore(username, password) {
  const url = buildUrl("/token/"); 
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...getCommonHeaders() 
    },
    body: JSON.stringify({ username, password }),
  });
  const body = await handleResponse(res);
  setTokens(body);
  return body;
}

export function getBase() {
  return BASE;
}