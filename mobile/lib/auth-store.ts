import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "sanq_auth_state";

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

// Module-level singleton — lives for the entire app session
let _state: AuthState = { ...DEFAULT_STATE };
let _hydrated = false;
const _subscribers: Set<() => void> = new Set();

function notify() {
  _subscribers.forEach(fn => fn());
}

export async function saveAuth(state: AuthState): Promise<void> {
  _state = { ...state };
  notify();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.warn("Failed to persist auth state", e);
  }
}

export function loadAuth(): AuthState {
  return { ..._state };
}

export async function clearAuth(): Promise<void> {
  _state = { ...DEFAULT_STATE };
  notify();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear persisted auth state", e);
  }
}

// Call once at app startup, before deciding where to route
export async function hydrateAuth(): Promise<AuthState> {
  if (_hydrated) return _state;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) _state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to hydrate auth state", e);
  }
  _hydrated = true;
  notify();
  return _state;
}

// React hook that subscribes to auth state changes
export function useAuthStore(): AuthState {
  const [state, setState] = useState<AuthState>({ ..._state });

  useEffect(() => {
    // Sync with current state on mount
    setState({ ..._state });

    // Subscribe to future changes
    const update = () => setState({ ..._state });
    _subscribers.add(update);
    return () => {
      _subscribers.delete(update);
    };
  }, []);

  return state;
}
