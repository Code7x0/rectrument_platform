import { PROTECTED_ROUTE_PREFIXES, PUBLIC_ROUTES, ROUTES } from "@/lib/constants";

export function isPublicRoute(pathname: string): boolean {
  if (pathname === ROUTES.authCallback || pathname.startsWith(`${ROUTES.authCallback}/`)) {
    return false;
  }

  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isProtectedRoute(pathname: string): boolean {
  if (pathname === ROUTES.authCallback || pathname.startsWith(`${ROUTES.authCallback}/`)) {
    return true;
  }

  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
