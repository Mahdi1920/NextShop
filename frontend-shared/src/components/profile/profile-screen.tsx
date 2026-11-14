"use client";
import { AlertBanner } from "@shared/components/ui/alert-banner";
import { Button } from "@shared/components/ui/button";
import { Card as SharedCard, CardContent as SharedCardContent, CardActionArea as SharedCardActionArea } from "@shared/components/ui/card";
import { FormField } from "@shared/components/ui/form-field";

import * as React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button as MuiButton,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { useSession } from "@shared/context/session-context";
import { cloudinaryApi } from "@shared/api/cloudinary";
import { clientsApi } from "@shared/api/users";
import { useToast } from "@shared/components/ui/toast";
import { useTranslations } from "@shared/context/locale-context";

type DraftProfile = {
  fullname: string;
  username: string;
  phone: string;
  address: string;
  avatar: string;
};

export default function ProfilePage() {
  const t = useTranslations();
  const session = useSession();
  const { notify } = useToast();

  const accessToken = session.accessToken;
  const user = session.user;

  const [draft, setDraft] = React.useState<DraftProfile>(() => ({
    fullname: user?.fullname ?? "",
    username: user?.username ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
    avatar: user?.avatar ?? "",
  }));

  React.useEffect(() => {
    setDraft({
      fullname: user?.fullname ?? "",
      username: user?.username ?? "",
      phone: user?.phone ?? "",
      address: user?.address ?? "",
      avatar: user?.avatar ?? "",
    });
    // Only re-sync when identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.id]);

  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string>("");
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  async function onPickAvatar(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify({ variant: "danger", title: "Invalid file", message: "Avatar must be an image (png, jpg, webp, gif, etc.)" });
      return;
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(URL.createObjectURL(file));

    setAvatarUploading(true);
    try {
      const uploaded = await cloudinaryApi.uploadAvatar(file);
      const updatedUser = await clientsApi.updateMe({ avatar: uploaded.url });
      if (accessToken) session.login(accessToken, updatedUser);
      setDraft((d) => ({ ...d, avatar: uploaded.url }));
      notify({ variant: "success", title: "Updated", message: "Avatar updated successfully." });
    } catch (e: any) {
      notify({
        variant: "danger",
        title: "Upload failed",
        message: e?.message ?? "Failed to update avatar.",
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function onSaveProfile() {
    setSaving(true);
    try {
      const updatedUser = await clientsApi.updateMe({
        fullname: draft.fullname,
        username: draft.username,
        phone: draft.phone,
        address: draft.address,
      });
      if (accessToken) session.login(accessToken, updatedUser);
      notify({ variant: "success", title: "Saved", message: "Profile updated." });
    } catch (e: any) {
      notify({ variant: "danger", title: "Save failed", message: e?.message ?? "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <Stack spacing={2} sx={{ maxWidth: 720 }}>
        <Typography variant="h5" fontWeight={700}>
          {t("PROFILE.TITLE")}
        </Typography>

        <SharedCard variant="outlined">
          <SharedCardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <Avatar
                  src={avatarPreviewUrl || draft.avatar || undefined}
                  alt={user?.fullname ?? user?.username ?? "User"}
                  sx={{ width: 88, height: 88 }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={800} noWrap>
                    {user?.fullname ?? "â€”"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {user?.email ?? "â€”"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Role: {session.role ?? "â€”"}
                  </Typography>
                </Box>

                <Button variant="outlined" component="label" disabled={avatarUploading}>
                  {avatarUploading ? t("PROFILE.UPLOADING") : t("PROFILE.CHANGE_AVATAR")}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                  />
                </Button>
              </Stack>

              <AlertBanner dismissible={false} severity="info">
                {t("PROFILE.AVATAR_INFO")}
              </AlertBanner>

              <Divider />

              <Stack spacing={2}>
                <FormField
                  label={t("PROFILE.FULL_NAME")}
                  value={draft.fullname}
                  onChange={(e) => setDraft((d) => ({ ...d, fullname: e.target.value }))}
                  fullWidth
                />
                <FormField
                  label={t("PROFILE.USERNAME")}
                  value={draft.username}
                  onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                  fullWidth
                />
                <FormField
                  label={t("PROFILE.PHONE")}
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  fullWidth
                />
                <FormField
                  label={t("PROFILE.ADDRESS")}
                  value={draft.address}
                  onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                  fullWidth
                />

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button variant="contained" onClick={onSaveProfile} disabled={saving}>
                    {saving ? t("PROFILE.SAVING") : t("PROFILE.SAVE_CHANGES")}
                  </Button>
                </Box>
              </Stack>
            </Stack>
          </SharedCardContent>
        </SharedCard>
      </Stack>
    </RequireAuth>
  );
}
