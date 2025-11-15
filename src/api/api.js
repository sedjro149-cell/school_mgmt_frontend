// src/api.js

// Base URL dynamique selon l'environnement
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Auth
export async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export function getAuthHeader() {
  const token = localStorage.getItem("access");
  return { Authorization: `Bearer ${token}` };
}

// GET
export async function fetchData(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Error fetching data");
  return res.json();
}

// POST
export async function postData(endpoint, data) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  return res.json();
}

// PUT
export async function putData(endpoint, data) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  return res.json();
}

// DELETE
export async function deleteData(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  return res;
}
