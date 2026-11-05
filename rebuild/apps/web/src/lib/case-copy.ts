import { localizedCaseCopy } from "./localization";
import type { PilotLocale } from "@vakil/domain";

export type CaseNoSummaryCopy = {
  savedTitle: string;
  savedBody: string;
  noAnalysis: string;
  nextOptions: string;
  openSummary: string;
  findAdvocate: string;
  yourWordsNote: string;
  shortenSummary: string;
};

export const caseNoSummaryCopy: Record<PilotLocale, CaseNoSummaryCopy> = localizedCaseCopy;
