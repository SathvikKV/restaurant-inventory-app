const BASE_URL = "https://kosh-api.sathvik-vadavatha.site/api/v1";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "KoshApp/1.0",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    console.log("[API ERROR]", res.status, res.url, JSON.stringify(error));
    console.log("[API FULL HEADER]", `Bearer ${token}`);
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
  return request<{ id: string; name: string; schema_name: string; sheet_url: string | null }[]>(
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
  }[]>(`/inventory/${qs}`, { method: "GET" }, token);
}

export async function getInventoryItem(token: string, itemId: string) {
  return request<{ id: string; name: string; quantity: number; unit: string; category: string }>(
    `/inventory/${itemId}`, { method: "GET" }, token
  );
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

export type LineItem = { item_name: string; quantity: number; unit: string; unit_price?: number; total_price?: number };
export type OCRResult = { invoice_number?: string; supplier_name?: string; invoice_date?: string; line_items: LineItem[]; total_amount?: number; confidence_notes?: string };

export async function uploadInvoice(token: string, imageUri: string, mimeType: string): Promise<OCRResult> {
  const formData = new FormData();
  formData.append("file", { uri: imageUri, name: "invoice.jpg", type: mimeType || "image/jpeg" } as any);
  const res = await fetch("https://kosh-api.sathvik-vadavatha.site/api/v1/ai/ocr/invoice", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    let detail = "OCR failed";
    try {
      const errBody = await res.json();
      detail = errBody.detail || detail;
    } catch {}
    throw new Error(`${detail} (${res.status})`);
  }
  return res.json();
}

export async function saveOCRInvoice(token: string, ocrData: any) {
  return request<{ new_items_created: string[] }>(
    "/purchases/from-ocr", { method: "POST", body: JSON.stringify(ocrData) }, token
  );
}

export type RecipeIngredientOut = { name: string; unit: string; quantity_per_serving: number; category: string };
export type RecipeOut = { dish_name: string; ingredients: RecipeIngredientOut[] };
export type MenuOCRResult = { recipes: RecipeOut[] };

export async function uploadMenu(token: string, imageUri: string, mimeType: string): Promise<MenuOCRResult> {
  const formData = new FormData();
  formData.append("file", { uri: imageUri, name: "menu.jpg", type: mimeType } as any);
  
  const res = await fetch(`${BASE_URL}/ai/ocr/menu`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to process menu");
  }
  return res.json();
}

export async function saveMenuIngredients(token: string, ingredients: any[]): Promise<any> {
  const res = await fetch(`${BASE_URL}/inventory/bulk-create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ingredients }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to save ingredients");
  }
  return res.json();
}

export async function getPurchaseOrders(token: string) {
  return request<any[]>("/purchase-orders/", { method: "GET" }, token);
}

export async function getIssues(token: string) {
  return request<any[]>("/issues/", { method: "GET" }, token);
}

export async function getAuditLog(token: string, limit = 50) {
  return request<{ entries: { id: string; type: string; description: string; recorded_by: string; created_at: string }[]; total: number }>(`/reports/audit-log?limit=${limit}`, { method: "GET" }, token);
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

export async function inviteUser(token: string, phone: string, name: string, role: "manager" | "owner"): Promise<any> {
  const res = await fetch(`${API_URL}/users/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phone, name, role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to invite user");
  }
  return res.json();
}

export async function createStaffContact(token: string, phone: string, name: string, role_label: string): Promise<any> {
  const res = await fetch(`${API_URL}/users/staff-contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ phone, name, role_label }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to create staff contact");
  }
  return res.json();
}

export async function listUsers(token: string) {
  return request<{ id: string; name: string; phone: string; role: string; is_active: boolean }[]>(
    "/users", {}, token
  );
}

export async function saveRecipes(
  token: string,
  recipes: { dish_name: string; ingredients: { name: string; unit: string; quantity_per_serving: number; category: string }[] }[]
) {
  return request<{ status: string; recipes_created: number; ingredients_seeded: number }>(
    "/recipes/bulk-create",
    { method: "POST", body: JSON.stringify({ recipes }) },
    token
  );
}

export async function listRecipes(token: string) {
  return request<{ id: string; name: string; ingredient_count: number }[]>(
    "/recipes",
    { method: "GET" },
    token
  );
}

export async function getRecipe(token: string, recipeId: string) {
  return request<{
    id: string;
    name: string;
    ingredients: { id: string; name: string; unit: string; quantity_per_serving: number; category: string }[];
  }>(`/recipes/${recipeId}`, { method: "GET" }, token);
}

export async function updateRecipeIngredients(
  token: string,
  recipeId: string,
  ingredients: { name: string; unit: string; quantity_per_serving: number; category: string }[]
) {
  return request<{ status: string; message: string; count: number }>(
    `/recipes/${recipeId}/ingredients`,
    { method: "PUT", body: JSON.stringify({ ingredients }) },
    token
  );
}
