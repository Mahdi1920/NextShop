"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box } from "@mui/material";
import { Spinner } from "@shared/components/ui/spinner";
import { useSession } from "@shared/context/session-context";
import { appRoutes, getRoleHome, getRouteRule } from "@shared/lib/routes";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const session = useSession();
  const [checked, setChecked] = React.useState(false);

  const isPublicRoute = pathname === "/" || pathname.startsWith("/auth");
  const rule = getRouteRule(pathname);

  React.useEffect(() => {
    session.refresh();
    setChecked(true);
    // The session provider owns the persisted auth state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  React.useEffect(() => {
    if (!checked || !session.isReady || isPublicRoute || !rule) return;

    if (!session.isAuthenticated) {
      router.replace(`${appRoutes.signIn}?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (rule.roles?.length && (!session.role || !rule.roles.includes(session.role))) {
      router.replace(getRoleHome(session.role));
    }
  }, [checked, isPublicRoute, pathname, router, rule, session.isAuthenticated, session.isReady, session.role]);

  const allowed =
    isPublicRoute ||
    !rule ||
    (checked && session.isReady && session.isAuthenticated &&
      (!rule.roles?.length || (!!session.role && rule.roles.includes(session.role))));

  if (!allowed) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spinner />
      </Box>
    );
  }

  return <>{children}</>;
}
