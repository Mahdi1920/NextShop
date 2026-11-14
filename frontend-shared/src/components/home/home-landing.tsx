"use client";

import Link from "next/link";
import { Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { Button } from "@shared/components/ui/button";
import { useSession } from "@shared/context/session-context";
import { useTranslations } from "@shared/context/locale-context";
import { UserRole } from "@shared/enums";

export function HomeLanding({ adminHref }: { adminHref?: string }) {
  const session = useSession();
  const t = useTranslations();
  const action = session.role === UserRole.ADMIN
    ? {
        label: t("HOME_PAGE.ADMIN_ACTION"),
        href: adminHref ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002",
      }
    : session.role === UserRole.SELLER
      ? { label: t("HOME_PAGE.SELLER_ACTION"), href: "/seller" }
      : { label: t("HOME_PAGE.CUSTOMER_ACTION"), href: "/customer#products" };

  return (
    <RequireAuth>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Card variant="outlined"><CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="h4" fontWeight={800}>{t("HOME_PAGE.TITLE")}</Typography>
            <Typography color="text.secondary">{t("HOME_PAGE.SUBTITLE")}</Typography>
            {session.user?.fullname ? <Typography>{session.user.fullname}</Typography> : null}
            <Button component={Link} href={action.href}>{action.label}</Button>
          </Stack>
        </CardContent></Card>
      </Container>
    </RequireAuth>
  );
}
