import { t, type MessageKey } from "@/i18n";
import { ApiError } from "./api";

/** A refusal in the viewer's words: the server's message when it has one, ours for the known codes. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.body.code === "INSUFFICIENT_CREDITS") return t("errors.INSUFFICIENT_CREDITS" as MessageKey);
    if (typeof error.body.error === "string") return error.body.error;
  }
  return t("errors.generic");
}
