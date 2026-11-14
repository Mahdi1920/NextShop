"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Box } from "@mui/material";
import { Spinner } from "@shared/components/ui/spinner";
import { useSession } from "@shared/context/session-context";
import type { UserRole } from "@shared/api/users";

type RequireAuthProps = {
  children: React.ReactNode;
  roles?: UserRole[];
  loadingFallback?: React.ReactNode;
  unauthenticatedRedirectTo?: string;
  unauthorizedRedirectTo?: string;
};

export function RequireAuth({
  children,
  roles,
  loadingFallback,
  unauthenticatedRedirectTo = "/auth/sign-in",
  unauthorizedRedirectTo = "/home",
}: RequireAuthProps) {
  const router = useRouter();
  const session = useSession();

  // We render a fallback until we've had a chance to run `refresh()` once.
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    session.refresh();
    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!checked || !session.isReady) return;

    if (!session.isAuthenticated) {
      router.replace(unauthenticatedRedirectTo);
      return;
    }

    if (roles?.length && session.role && !roles.includes(session.role)) {
      router.replace(unauthorizedRedirectTo);
    }
  }, [checked, router, roles, session.isAuthenticated, session.isReady, session.role, unauthenticatedRedirectTo, unauthorizedRedirectTo]);

  const allowed =
    checked &&
    session.isReady &&
    session.isAuthenticated &&
    (!roles?.length || (session.role ? roles.includes(session.role) : true));

  if (!allowed) {
    return (
      <>
        {loadingFallback ?? (
          <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
            <Spinner />
          </Box>
        )}
      </>
    );
  }

  return <>{children}</>;
}
