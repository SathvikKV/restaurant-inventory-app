import { AuthState, saveAuth as _saveAuth, clearAuth as _clearAuth, useAuthStore } from "./auth-store";

export type { AuthState };

export function useAuth() {
  const auth = useAuthStore();
  return {
    auth,
    setAuth: (state: AuthState) => _saveAuth(state),
    clearAuth: () => _clearAuth(),
  };
}
