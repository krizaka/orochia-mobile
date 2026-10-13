/** The web preview has no native cookie jar: the browser's session cookie is httpOnly, and the app sends none. */
export async function clearNativeCookies(): Promise<boolean> {
  return false;
}
