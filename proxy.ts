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
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Ingresa con el acceso privado para continuar." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";
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
  matcher: ["/((?!_next/static|_next/image).*)"],
};
