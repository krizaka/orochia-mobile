import * as Haptics from "expo-haptics";

/** A light tap under the finger, then the action — the press feedback the app's buttons and chips give. */
export function withTap<A extends unknown[]>(action: (...args: A) => void): (...args: A) => void {
  return (...args: A) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    action(...args);
  };
}
