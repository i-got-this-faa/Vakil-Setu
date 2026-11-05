import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { serviceConfig } from "./lib/config";

const configuredMiddleware = clerkMiddleware(
  async (auth, request) => {
    const pathname = request.nextUrl.pathname;
    if (pathname === "/workspace" || pathname.startsWith("/workspace/"))
      await auth.protect();
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

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
