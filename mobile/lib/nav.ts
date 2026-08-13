import { router } from "expo-router";

/**
 * Completely resets the root navigation stack to the specified route,
 * discarding all previous navigation history (e.g., clearing the onboarding stack).
 */
export function resetStackAndNavigate(pathname: string) {
  if (typeof router.dismissTo === "function") {
    router.dismissTo(pathname as any);
  } else {
    // Fallback if dismissTo doesn't exist
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace(pathname as any);
  }
}
