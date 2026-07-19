import { useState, useEffect } from "react";

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
const _subscribers: Set<() => void> = new Set();

function notify() {
  _subscribers.forEach(fn => fn());
}

export function saveAuth(state: AuthState): void {
  _state = { ...state };
  notify();
}

export function loadAuth(): AuthState {
  return { ..._state };
}

export function clearAuth(): void {
  _state = { ...DEFAULT_STATE };
  notify();
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
