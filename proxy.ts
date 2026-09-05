import { NextRequest, NextResponse } from "next/server";
import { SITE_GATE_COOKIE, verifySiteGateToken } from "@/lib/site-gate-token";

const PUBLIC_PATHS = [
  "/coming-soon",
  "/api/site-gate/login",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SITE_GATE_COOKIE)?.value;
  const isAllowed = await verifySiteGateToken(token, process.env.SITE_GATE_SECRET);

  if (isAllowed) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.searchParams.set("next", pathname);

  return NextResponse.redirect(url);
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/assets/")
  );
}

export const config = {
  matcher: ["/((?!.*\\.).*)", "/api/:path*"],
};
