const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

function authFetch(path: string, token: string, options: RequestInit = {}) {
  return apiFetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options.headers },
  });
}

// ── Customer (public) ──────────────────────────────────────────────
export async function getCustomerByToken(token: string) {
  return apiFetch(`/api/customers/${token}`);
}

// ── Staff ──────────────────────────────────────────────────────────
export async function registerCustomer(
  token: string,
  body: { name: string; phone?: string; email?: string }
) {
  return authFetch("/api/customers", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function addStamp(
  token: string,
  body: { customer_token: string; notes?: string }
) {
  return authFetch("/api/stamps", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function redeemReward(
  token: string,
  body: { customer_token: string }
) {
  return authFetch("/api/rewards/redeem", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getCustomerHistory(token: string, customerToken: string) {
  return authFetch(`/api/customers/${customerToken}/history`, token);
}

// ── Admin ──────────────────────────────────────────────────────────
export async function getAnalytics(token: string) {
  return authFetch("/api/admin/analytics", token);
}

export async function listCustomers(
  token: string,
  params: { page?: number; search?: string } = {}
) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.search) qs.set("search", params.search);
  return authFetch(`/api/admin/customers?${qs}`, token);
}

export async function adjustStamps(
  token: string,
  customerId: string,
  body: { stamp_count: number; notes?: string }
) {
  return authFetch(`/api/admin/customers/${customerId}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
