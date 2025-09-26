import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // If no Authorization header is present, skip auth check to prevent redirect loops
  const authz = request.headers.get("authorization");
  if (!authz) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Narrow scope or disable if bearer-based auth is used; dashboards/pages handle their own client guards
  matcher: ["/admin", "/dashboard/:path*", "/profile"],
};