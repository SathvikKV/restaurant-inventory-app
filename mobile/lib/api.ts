const BASE_URL = "https://kosh-api.sathvik-vadavatha.site/api/v1";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export async function requestOTP(phone: string) {
  return request<{ message: string; mock_otp?: string }>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOTP(phone: string, otp: string) {
  return request<{
    access_token: string;
    role: string;
    tenant_id: string;
    schema: string;
    user_id: string;
    user_name: string;
    needs_restaurant_selection: boolean;
  }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });
}

export async function createRestaurant(
  token: string,
  name: string,
  city: string
) {
  return request<{ id: string; name: string; schema_name: string }>(
    "/restaurants",
    { method: "POST", body: JSON.stringify({ name, city, tenant_type: "restaurant" }) },
    token
  );
}

export async function listRestaurants(token: string) {
  return request<{ id: string; name: string; schema_name: string }[]>(
    "/restaurants",
    { method: "GET" },
    token
  );
}

export async function selectRestaurant(token: string, restaurantId: string) {
  return request<{ access_token: string; schema: string; restaurant_name: string }>(
    `/restaurants/${restaurantId}/select`,
    { method: "POST" },
    token
  );
}

export async function getMe(token: string) {
  return request<{
    id: string;
    name: string;
    phone: string;
    role: string;
    tenant_id: string;
    is_active: boolean;
  }>("/auth/me", { method: "GET" }, token);
}

// Inventory
export async function getInventory(
  token: string,
  params?: { category?: string; status?: string; search?: string }
) {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", params.category);
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return request<{
    id: string;
    item: string;
    unit: string;
    current_qty: number;
    previous_qty: number;
    reorder_threshold: number;
    category: string | null;
    last_updated: string | null;
    status: string;
  }[]>(`/inventory${qs}`, { method: "GET" }, token);
}

export async function receiveStock(token: string, itemId: string, quantity: number, notes?: string) {
  return request(`/inventory/${itemId}/receive`, {
    method: "POST",
    body: JSON.stringify({ quantity, notes }),
  }, token);
}

export async function issueStock(token: string, itemId: string, quantity: number, destination: string) {
  return request(`/inventory/${itemId}/issue`, {
    method: "POST",
    body: JSON.stringify({ quantity, destination }),
  }, token);
}

export async function adjustStock(token: string, itemId: string, new_quantity: number, reason: string) {
  return request(`/inventory/${itemId}/adjust`, {
    method: "POST",
    body: JSON.stringify({ new_quantity, reason }),
  }, token);
}

// Wastage
export async function logWastage(token: string, item: string, qty: number, unit: string, reason?: string) {
  return request("/wastage", {
    method: "POST",
    body: JSON.stringify({ item, qty, unit, reason }),
  }, token);
}

// Reports
export async function getInventoryHealth(token: string) {
  return request<{ score: number; label: string; critical: number; low: number; healthy: number; total: number }>(
    "/reports/inventory-health",
    { method: "GET" },
    token
  );
}

export async function getAIRecommendations(token: string) {
  return request<{ id: string; title: string; reason: string; item: string; current_qty: number; unit: string }[]>(
    "/ai/recommendations",
    { method: "GET" },
    token
  );
}

export async function getPurchaseOrders(token: string) {
  return request<any[]>("/purchase-orders", { method: "GET" }, token);
}

export async function getAuditLog(token: string, limit = 50) {
  return request<{ entries: any[]; total: number }>(`/reports/audit-log?limit=${limit}`, { method: "GET" }, token);
}

export async function getWastageSummary(token: string, days = 7) {
  return request<any>(`/reports/wastage-summary?days=${days}`, { method: "GET" }, token);
}

export async function getPurchasesSummary(token: string, days = 7) {
  return request<any>(`/reports/purchases-summary?days=${days}`, { method: "GET" }, token);
}

export async function getTopItems(token: string, limit = 5) {
  return request<any[]>(`/reports/top-items?limit=${limit}`, { method: "GET" }, token);
}

export async function getFoodCostTrend(token: string, days = 7) {
  return request<any[]>(`/reports/food-cost-trend?days=${days}`, { method: "GET" }, token);
}
