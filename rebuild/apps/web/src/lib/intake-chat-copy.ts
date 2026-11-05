import type { PilotLocale } from "@legal-setu/domain";
import { localizedIntakeChatCopy } from "./localization";

export type IntakeChatCopy = { consent: string; send: string; pending: string; saveOnly: string; documents: string; failed: string; initialMessage: string };

export const intakeChatCopy: Record<PilotLocale, IntakeChatCopy> = localizedIntakeChatCopy;
