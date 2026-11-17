/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as admin from "../admin.js";
import type * as advocates from "../advocates.js";
import type * as bookings from "../bookings.js";
import type * as caseDocuments from "../caseDocuments.js";
import type * as cases from "../cases.js";
import type * as chat from "../chat.js";
import type * as chatProvider from "../chatProvider.js";
import type * as chatState from "../chatState.js";
import type * as conversations from "../conversations.js";
import type * as credentials from "../credentials.js";
import type * as crons from "../crons.js";
import type * as demoSeed from "../demoSeed.js";
import type * as dgxWarm from "../dgxWarm.js";
import type * as legalCorpus from "../legalCorpus.js";
import type * as legalEmbedding from "../legalEmbedding.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_aiDgx from "../lib/aiDgx.js";
import type * as lib_aiGemini from "../lib/aiGemini.js";
import type * as lib_aiRouting from "../lib/aiRouting.js";
import type * as lib_aiVertex from "../lib/aiVertex.js";
import type * as lib_bhashini from "../lib/bhashini.js";
import type * as lib_chat from "../lib/chat.js";
import type * as lib_discovery from "../lib/discovery.js";
import type * as lib_discoveryPagination from "../lib/discoveryPagination.js";
import type * as lib_input from "../lib/input.js";
import type * as lib_legalEvidence from "../lib/legalEvidence.js";
import type * as lib_legalRetrieval from "../lib/legalRetrieval.js";
import type * as lib_lifecycle from "../lib/lifecycle.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_provider from "../lib/provider.js";
import type * as lib_reviews from "../lib/reviews.js";
import type * as lib_speech from "../lib/speech.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_vertexConfig from "../lib/vertexConfig.js";
import type * as lib_voice from "../lib/voice.js";
import type * as lib_voiceLanguages from "../lib/voiceLanguages.js";
import type * as notifications from "../notifications.js";
import type * as reviews from "../reviews.js";
import type * as slots from "../slots.js";
import type * as speech from "../speech.js";
import type * as speechState from "../speechState.js";
import type * as triage from "../triage.js";
import type * as triageRate from "../triageRate.js";
import type * as voice from "../voice.js";
import type * as voiceAudio from "../voiceAudio.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  admin: typeof admin;
  advocates: typeof advocates;
  bookings: typeof bookings;
  caseDocuments: typeof caseDocuments;
  cases: typeof cases;
  chat: typeof chat;
  chatProvider: typeof chatProvider;
  chatState: typeof chatState;
  conversations: typeof conversations;
  credentials: typeof credentials;
  crons: typeof crons;
  demoSeed: typeof demoSeed;
  dgxWarm: typeof dgxWarm;
  legalCorpus: typeof legalCorpus;
  legalEmbedding: typeof legalEmbedding;
  "lib/access": typeof lib_access;
  "lib/ai": typeof lib_ai;
  "lib/aiDgx": typeof lib_aiDgx;
  "lib/aiGemini": typeof lib_aiGemini;
  "lib/aiRouting": typeof lib_aiRouting;
  "lib/aiVertex": typeof lib_aiVertex;
  "lib/bhashini": typeof lib_bhashini;
  "lib/chat": typeof lib_chat;
  "lib/discovery": typeof lib_discovery;
  "lib/discoveryPagination": typeof lib_discoveryPagination;
  "lib/input": typeof lib_input;
  "lib/legalEvidence": typeof lib_legalEvidence;
  "lib/legalRetrieval": typeof lib_legalRetrieval;
  "lib/lifecycle": typeof lib_lifecycle;
  "lib/notifications": typeof lib_notifications;
  "lib/provider": typeof lib_provider;
  "lib/reviews": typeof lib_reviews;
  "lib/speech": typeof lib_speech;
  "lib/validators": typeof lib_validators;
  "lib/vertexConfig": typeof lib_vertexConfig;
  "lib/voice": typeof lib_voice;
  "lib/voiceLanguages": typeof lib_voiceLanguages;
  notifications: typeof notifications;
  reviews: typeof reviews;
  slots: typeof slots;
  speech: typeof speech;
  speechState: typeof speechState;
  triage: typeof triage;
  triageRate: typeof triageRate;
  voice: typeof voice;
  voiceAudio: typeof voiceAudio;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
