"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Stack, Typography } from "@mui/material";
import { AlertBanner } from "@shared/components/ui/alert-banner";
import { Button } from "@shared/components/ui/button";
import { FormField } from "@shared/components/ui/form-field";
import { authApi } from "@shared/api/auth";
import { useSession } from "@shared/context/session-context";
import { useTranslations } from "@shared/context/locale-context";
import { UserRole } from "@shared/enums";

export default function AdminSignInPage() {
  const router = useRouter();
  const session = useSession();
  const t = useTranslations();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const trimmedEmail = email.trim();
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const canSubmit = looksLikeEmail && password.trim().length >= 6;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);
    try {
      const result = await authApi.login({ email: trimmedEmail, password: password.trim() });
      if (result.user.role !== UserRole.ADMIN) {
        setError(t("AUTH.ADMIN_ONLY"));
        return;
      }
      session.login(result.accessToken, result.user);
      router.replace("/home");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack component="form" spacing={2} onSubmit={submit}>
      <Stack spacing={0.5}>
        <Typography variant="h6">{t("AUTH.SIGN_IN")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("ADMIN_PAGE.SIGN_IN_DESCRIPTION")}
        </Typography>
      </Stack>

      {error ? <AlertBanner dismissible={false} severity="error">{error}</AlertBanner> : null}

      <FormField
        label={t("SIGNUP.EMAIL")}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        inputMode="email"
        autoComplete="username"
        error={Boolean(trimmedEmail) && !looksLikeEmail}
        helperText={Boolean(trimmedEmail) && !looksLikeEmail ? t("AUTH.VALID_EMAIL") : " "}
        fullWidth
        required
      />

      <FormField
        label={t("SIGNUP.PASSWORD")}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        type="password"
        autoComplete="current-password"
        fullWidth
        required
      />

      <Button type="submit" disabled={!canSubmit} isLoading={loading}>
        {t("AUTH.SIGN_IN")}
      </Button>

    </Stack>
  );
}
