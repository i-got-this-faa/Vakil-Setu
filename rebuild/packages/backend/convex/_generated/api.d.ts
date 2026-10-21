/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */

  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as accounts from "../accounts.js";
import type * as admin from "../admin.js";
import type * as advocates from "../advocates.js";
import type * as bookings from "../bookings.js";
import type * as caseDocuments from "../caseDocuments.js";
import type * as cases from "../cases.js";
import type * as chat from "../chat.js";
import type * as chatProvider from "../chatProvider.js";
import type * as chatState from "../chatState.js";
import type * as credentials from "../credentials.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_aiGemini from "../lib/aiGemini.js";
import type * as lib_chat from "../lib/chat.js";
import type * as lib_discovery from "../lib/discovery.js";
import type * as lib_discoveryPagination from "../lib/discoveryPagination.js";
import type * as lib_input from "../lib/input.js";
import type * as lib_lifecycle from "../lib/lifecycle.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_provider from "../lib/provider.js";
import type * as lib_reviews from "../lib/reviews.js";
import type * as lib_validators from "../lib/validators.js";
import type * as notifications from "../notifications.js";
import type * as reviews from "../reviews.js";
import type * as slots from "../slots.js";
import type * as triage from "../triage.js";
import type * as triageRate from "../triageRate.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "accounts": typeof accounts,
"admin": typeof admin,
"advocates": typeof advocates,
"bookings": typeof bookings,
"caseDocuments": typeof caseDocuments,
"cases": typeof cases,
"chat": typeof chat,
"chatProvider": typeof chatProvider,
"chatState": typeof chatState,
"credentials": typeof credentials,
"lib/access": typeof lib_access,
"lib/ai": typeof lib_ai,
"lib/aiGemini": typeof lib_aiGemini,
"lib/chat": typeof lib_chat,
"lib/discovery": typeof lib_discovery,
"lib/discoveryPagination": typeof lib_discoveryPagination,
"lib/input": typeof lib_input,
"lib/lifecycle": typeof lib_lifecycle,
"lib/notifications": typeof lib_notifications,
"lib/provider": typeof lib_provider,
"lib/reviews": typeof lib_reviews,
"lib/validators": typeof lib_validators,
"notifications": typeof notifications,
"reviews": typeof reviews,
"slots": typeof slots,
"triage": typeof triage,
"triageRate": typeof triageRate,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
