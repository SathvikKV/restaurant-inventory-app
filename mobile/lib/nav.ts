import { router } from "expo-router";

/**
 * Completely resets the root navigation stack to the specified route,
 * discarding all previous navigation history (e.g., clearing the onboarding stack).
 */
export function resetStackAndNavigate(pathname: string) {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace(pathname as any);
}
