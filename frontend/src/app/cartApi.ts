export type ApiCartItem = {
  id: number;
  product: {
    id: number;
    name: string;
    slug: string;
    unit: string;
    unit_value: string;
    price: string;
    discount_price: string | null;
    image: string | null;
    stock: number;
  };
  qty: number;
  subtotal: number;
};

export type ApiCart = {
  items: ApiCartItem[];
  pricing: {
    items_total: number;
    delivery_fee: number;
    grand_total: number;
  };
};

export type ApiOrder = {
  id: number;
  user: number;
  total_amount: string;
  status: string;
  created_at: string;
  items: Array<{
    id: number;
    product: {
      id: number;
      name: string;
      slug: string;
      unit: string;
      unit_value: string;
      price: string;
      discount_price: string | null;
      image: string | null;
      stock: number;
    };
    qty: number;
    price: string;
  }>;
};

export type ApiOrderItem = {
  id: number;
  order: ApiOrder;
  product: {
    id: number;
    name: string;
    slug: string;
    unit: string;
    unit_value: string;
    price: string;
    discount_price: string | null;
    image: string | null;
    stock: number;
  };
  qty: number;
  price: string;
};

export type ApiUserProfile = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  updated_at: string;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const AUTH_EVENT = "dailyfresh_auth_change";

type StoredAuth = {
  access?: unknown;
  refresh?: unknown;
  user?: unknown;
};

let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken() {
  try {
    const raw = sessionStorage.getItem("dailyfresh_auth");
    if (!raw) return null;
    const auth = JSON.parse(raw) as StoredAuth;
    return typeof auth.access === "string" ? auth.access : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return getAccessToken() !== null;
}

export function subscribeToAuth(onChange: () => void) {
  window.addEventListener(AUTH_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function clearAuthSession() {
  try {
    sessionStorage.removeItem("dailyfresh_auth");
  } finally {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export async function logout() {
  let refreshToken: string | null = null;
  try {
    const raw = sessionStorage.getItem("dailyfresh_auth");
    if (raw) {
      const auth = JSON.parse(raw) as StoredAuth;
      refreshToken =
        typeof auth.refresh === "string" ? auth.refresh : null;
    }
  } catch {
    refreshToken = null;
  }

  try {
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    }
  } finally {
    clearAuthSession();
  }
}

function getRefreshToken() {
  try {
    const raw = sessionStorage.getItem("dailyfresh_auth");
    if (!raw) return null;
    const auth = JSON.parse(raw) as StoredAuth;
    return typeof auth.refresh === "string" ? auth.refresh : null;
  } catch {
    return null;
  }
}

function saveAccessToken(accessToken: string) {
  try {
    const raw = sessionStorage.getItem("dailyfresh_auth");
    const auth = raw ? (JSON.parse(raw) as StoredAuth) : {};
    sessionStorage.setItem("dailyfresh_auth", JSON.stringify({ ...auth, access: accessToken }));
  } catch {
    sessionStorage.removeItem("dailyfresh_auth");
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/api/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: "no-store",
      });

      if (!response.ok) {
        sessionStorage.removeItem("dailyfresh_auth");
        return null;
      }

      const payload = (await response.json()) as { access?: unknown };
      if (typeof payload.access !== "string") {
        sessionStorage.removeItem("dailyfresh_auth");
        return null;
      }

      saveAccessToken(payload.access);
      return payload.access;
    } catch {
      sessionStorage.removeItem("dailyfresh_auth");
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function authHeaders(accessToken?: string | null) {
  const token = accessToken ?? getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: "Bearer " + token } : {}),
  };
}
async function apiFetch(path: string, options: RequestInit = {}, retried = false) {
  const request = async (accessToken?: string | null) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...authHeaders(accessToken), ...(options.headers ?? {}) },
      cache: "no-store",
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    return { response, payload };
  };

  let { response, payload } = await request();

  if (response.status === 401 && !retried) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      ({ response, payload } = await request(newAccessToken));
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Please log in again. Your session has expired.");
    }
    const message =
      typeof payload === "object" && payload !== null
        ? JSON.stringify(payload)
        : `Request failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function isApiUserProfile(value: unknown): value is ApiUserProfile {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "email" in value &&
    typeof value.email === "string" &&
    "first_name" in value &&
    typeof value.first_name === "string" &&
    "last_name" in value &&
    typeof value.last_name === "string" &&
    "phone" in value &&
    typeof value.phone === "string" &&
    "city" in value &&
    typeof value.city === "string" &&
    "updated_at" in value &&
    typeof value.updated_at === "string"
  );
}

export async function fetchApiUserProfile(): Promise<ApiUserProfile> {
  const payload = await apiFetch("/auth/api/profile/");
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    !isApiUserProfile(payload.data)
  ) {
    throw new Error("Profile API returned an unexpected response.");
  }
  return payload.data;
}

export async function updateApiUserProfile(
  changes: Pick<ApiUserProfile, "phone" | "city">,
): Promise<ApiUserProfile> {
  const payload = await apiFetch("/auth/api/profile/", {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
  if (!isApiUserProfile(payload)) {
    throw new Error("Profile API returned an unexpected response.");
  }
  return payload;
}

export async function fetchApiCart(): Promise<ApiCart> {
  const payload = await apiFetch("/api/cart/");
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload)
  ) {
    throw new Error("Cart API returned an unexpected response.");
  }
  const data = payload.data;
  if (
    typeof data !== "object" ||
    data === null ||
    !("items" in data) ||
    !("pricing" in data) ||
    !Array.isArray(data.items)
  ) {
    throw new Error("Cart API returned an unexpected response.");
  }
  return data as ApiCart;
}

export async function addApiCartItem(productId: number, quantity = 1) {
  await apiFetch("/api/cart/", {
    method: "POST",
    body: JSON.stringify({ product: productId, qty: quantity }),
  });
}

export async function updateApiCartItem(cartItemId: number, quantity: number) {
  await apiFetch(`/api/cart/item/${cartItemId}/`, {
    method: "POST",
    body: JSON.stringify({ qty: quantity }),
  });
}

export async function removeApiCartItem(cartItemId: number) {
  await apiFetch(`/api/cart/item/${cartItemId}/`, { method: "DELETE" });
}

export async function clearApiCart() {
  await apiFetch("/api/cart/", { method: "DELETE" });
}

export async function placeOrder(): Promise<{ orderId: number; totalAmount: string }> {
  const payload = await apiFetch("/api/order-place/", { method: "POST" });
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("order_id" in payload) ||
    !("total_amount" in payload) ||
    typeof payload.order_id !== "number"
  ) {
    throw new Error("Order API returned an unexpected response.");
  }
  return {
    orderId: payload.order_id,
    totalAmount: String(payload.total_amount),
  };
}

export async function fetchApiOrders(): Promise<ApiOrder[]> {
  const payload = await apiFetch("/api/orders/");
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    throw new Error("Order list API returned an unexpected response.");
  }
  return payload.data as ApiOrder[];
}

export async function fetchApiOrder(orderId: number): Promise<ApiOrderItem[]> {
  const payload = await apiFetch(`/api/orders/${orderId}/`);
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    throw new Error("Order detail API returned an unexpected response.");
  }
  return payload.data as ApiOrderItem[];
}

export function getApiImageUrl(image: string | null) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${API_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
}
