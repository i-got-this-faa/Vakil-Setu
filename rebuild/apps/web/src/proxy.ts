import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { serviceConfig } from "./lib/config";

const isPrivate = createRouteMatcher(["/workspace(.*)"]);
const configuredMiddleware = clerkMiddleware(async (auth, request) => {
  if (isPrivate(request)) await auth.protect();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (serviceConfig().kind === "unconfigured") return NextResponse.next();
  return configuredMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
