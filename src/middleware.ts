import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Add security headers
    const response = NextResponse.next();

    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/invoices/:path*", "/api/vendors/:path*", "/api/payouts/:path*", "/api/items/:path*", "/api/stock/:path*", "/api/tally/:path*", "/api/dashboard/:path*", "/api/sales/:path*", "/api/reports/:path*", "/api/categories/:path*", "/api/analytics/:path*", "/api/branches/:path*"],
};
