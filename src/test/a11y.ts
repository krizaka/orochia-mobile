import { StyleSheet } from "react-native";
import { screen } from "@testing-library/react-native";
import { computeAccessibleName, getRole, isHiddenFromAccessibility } from "@testing-library/react-native/dist/helpers/accessibility";
import type { TestInstance } from "test-renderer";

/**
 * Accessibility of a rendered screen, checked in its render test (krizaka/orochia#130, WCAG 2.2 AA):
 *
 * - **name and role** (4.1.2) — everything a finger can press is announced: a role (button, link, tab, switch…) and a
 *   name (its label or its text);
 * - **target size** — a press target given an explicit size is at least 44 × 44 pt, its `hitSlop` included (Apple
 *   HIG 44 pt; WCAG 2.5.8 asks 24, 2.5.5 asks 44 — we hold 44). A target sized by its content is measured on a device;
 * - **dynamic type** (1.4.4) — no text refuses the system's font size (`allowFontScaling={false}`) or caps it under 200 %
 *   (`maxFontSizeMultiplier` < 2);
 * - **images** (1.1.1) — an image exposed to the screen reader has a name; a decorative one is hidden.
 *
 * Returns the problems (empty when the screen passes), so a test reads `expect(a11yProblems()).toEqual([])`.
 */
const PRESSABLE_ROLES = new Set(["button", "link", "tab", "switch", "checkbox", "radio", "menuitem", "togglebutton", "adjustable", "imagebutton", "combobox", "searchbox"]);
const MIN_TARGET = 44;

type Slop = number | { top?: number; bottom?: number; left?: number; right?: number } | null | undefined;
const slop = (s: Slop) => (typeof s === "number" ? { v: 2 * s, h: 2 * s } : { v: (s?.top ?? 0) + (s?.bottom ?? 0), h: (s?.left ?? 0) + (s?.right ?? 0) });

function walk(node: TestInstance, visit: (n: TestInstance) => void) {
  visit(node);
  for (const child of node.children) if (typeof child !== "string") walk(child, visit);
}

function describe(node: TestInstance) {
  const name = computeAccessibleName(node);
  const id = node.props.testID ? `#${node.props.testID}` : "";
  return `<${node.type}${id}${name ? ` "${name.slice(0, 40)}"` : ""}>`;
}

export function a11yProblems(root: TestInstance | null = screen.container): string[] {
  const problems: string[] = [];
  if (!root) return ["nothing rendered"];
  walk(root, (node) => {
    if (isHiddenFromAccessibility(node)) return;
    const { props } = node;
    const role = String(getRole(node));
    const pressable = typeof props.onClick === "function" || typeof props.onResponderRelease === "function";

    if (pressable && props.accessible !== false) {
      if (!PRESSABLE_ROLES.has(role)) problems.push(`${describe(node)} can be pressed but has no role (button, link, tab…)`);
      if (!computeAccessibleName(node)?.trim()) problems.push(`${describe(node)} can be pressed but has no name`);
      const style = StyleSheet.flatten(props.style) ?? {};
      const extra = slop(props.hitSlop as Slop);
      const height = typeof style.height === "number" ? style.height : typeof style.minHeight === "number" ? style.minHeight : undefined;
      const width = typeof style.width === "number" ? style.width : typeof style.minWidth === "number" ? style.minWidth : undefined;
      if (height !== undefined && height + extra.v < MIN_TARGET) problems.push(`${describe(node)} is ${height + extra.v} pt tall with its hitSlop (< ${MIN_TARGET})`);
      if (width !== undefined && width + extra.h < MIN_TARGET) problems.push(`${describe(node)} is ${width + extra.h} pt wide with its hitSlop (< ${MIN_TARGET})`);
    }

    if (node.type === "Text" || node.type === "TextInput") {
      if (props.allowFontScaling === false) problems.push(`${describe(node)} refuses the system font size (allowFontScaling={false})`);
      if (typeof props.maxFontSizeMultiplier === "number" && props.maxFontSizeMultiplier > 0 && props.maxFontSizeMultiplier < 2) {
        problems.push(`${describe(node)} caps the font size at ${props.maxFontSizeMultiplier * 100} % (< 200 %)`);
      }
    }

    if (role === "image" || role === "img") {
      if (!computeAccessibleName(node)?.trim()) problems.push(`${describe(node)} is an image with no name (label it, or hide it if decorative)`);
    }
  });
  return problems;
}
