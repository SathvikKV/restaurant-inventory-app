import AsyncStorage from "@react-native-async-storage/async-storage";

export type AuthState = {
  token: string | null;
  userId: string | null;
  role: string | null;
  tenantId: string | null;
  schema: string | null;
  restaurantName: string | null;
  needsRestaurantSelection: boolean;
};

const DEFAULT_STATE: AuthState = {
  token: null,
  userId: null,
  role: null,
  tenantId: null,
  schema: null,
  restaurantName: null,
  needsRestaurantSelection: false,
};

const AUTH_KEY = "kosh_auth";

export async function saveAuth(state: AuthState): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export async function loadAuth(): Promise<AuthState> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_STATE;
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}
