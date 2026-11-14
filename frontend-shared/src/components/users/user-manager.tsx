"use client";
import { AlertBanner } from "@shared/components/ui/alert-banner";
import { FormField } from "@shared/components/ui/form-field";

import * as React from "react";
import { Button, IconButton } from "@shared/components/ui/button";
import { ConfirmDialog } from "@shared/components/ui/confirm-dialog";
import { Modal } from "@shared/components/ui/modal";
import { PlusIcon } from "@shared/components/ui/icons";
import { DataTable, type Column } from "@shared/components/table/data-table";
import { TableToolbar } from "@shared/components/table/table-toolbar";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { useDisclosure } from "@shared/hooks/useDisclosure";
import { ApiFetchError } from "@shared/api/clients";
import { usersApi, type SellerDocumentReview, type User, type UserRole } from "@shared/api/users";
import {
  Alert,
  Box,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { PencilIcon, TrashIcon } from "@shared/components/ui/icons";
import { useSession } from "@shared/context/session-context";
import { SellerStatus, UserRole as UserRoleEnum } from "@shared/enums";

type UserDraft = {
  fullname: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  phone: string;
  address: string;
  avatar: string;
  sellerShopName: string;
  sellerBusinessEmail: string;
  sellerBusinessPhone: string;
  sellerBusinessAddress: string;
  isActive: boolean;
};

const emptyDraft: UserDraft = {
  fullname: "",
  email: "",
  username: "",
  password: "",
  role: UserRoleEnum.CUSTOMER,
  phone: "",
  address: "",
  avatar: "",
  sellerShopName: "",
  sellerBusinessEmail: "",
  sellerBusinessPhone: "",
  sellerBusinessAddress: "",
  isActive: true,
};

const MAX_REVIEW_DOCUMENTS = 8;

function userKey(u: User): string {
  return u._id ?? u.id ?? `${u.email}:${u.username}`;
}

function getSellerDocuments(user: User): Array<{ label: string; url: string }> {
  const profile = user.sellerProfile;
  const documents = [
    { label: "Identity", url: profile?.identityDocument?.fileUrl },
    { label: "Business registration", url: profile?.businessRegistration?.documentUrl },
    { label: "Company certificate", url: profile?.companyRegistrationCertificateUrl },
    ...(profile?.documents ?? []).map((url, index) => ({ label: `Extra ${index + 1}`, url })),
  ];
  return documents.filter((document): document is { label: string; url: string } => Boolean(document.url));
}

function normalizeApiError(err: unknown): string {
  if (err instanceof ApiFetchError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

function maskIban(iban: string | undefined | null): string {
  if (!iban) return "â€”";
  const compact = iban.replace(/ /g, "").trim();
  if (compact.length <= 8) return compact;
  return `${compact.slice(0, 4)}â€¦${compact.slice(-4)}`;
}

function getSellerReviewChecks(user: User): string[] {
  const profile = user.sellerProfile;
  const checks = [
    [Boolean(profile?.identityDocument?.fileUrl), "Identity document uploaded"],
    [Boolean(profile?.identityDocument?.type), "Identity document type selected"],
    [Boolean(profile?.businessRegistration?.documentUrl), "Business registration uploaded"],
    [Boolean(profile?.businessRegistration?.registrationNumber?.trim()), "Registration number provided"],
    [Boolean(profile?.companyRegistrationCertificateUrl), "Company certificate uploaded"],
    [Boolean(profile?.shopName?.trim()), "Shop name provided"],
    [Boolean(profile?.businessEmail?.trim()), "Business email provided"],
    [Boolean(profile?.businessPhone?.trim()), "Business phone provided"],
    [Boolean(profile?.businessAddress?.trim()), "Business address provided"],
    [Boolean(profile?.bankInfo?.accountHolder?.trim()), "Bank account holder provided"],
    [Boolean(profile?.bankInfo?.iban?.trim()), "IBAN provided"],
  ] as const;

  return checks.filter(([passed]) => !passed).map(([, label]) => label);
}

export function UserManager() {
  const session = useSession();
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingRows, setPendingRows] = React.useState<User[]>([]);
  const [pendingLoading, setPendingLoading] = React.useState(false);
  const [pendingError, setPendingError] = React.useState<string | null>(null);
  const [sellerReviews, setSellerReviews] = React.useState<Record<string, SellerDocumentReview>>({});
  const [reviewingSellerId, setReviewingSellerId] = React.useState<string | null>(null);
  const [selectedDocumentUrls, setSelectedDocumentUrls] = React.useState<Record<string, string[]>>({});

  const createModal = useDisclosure(false);
  const editModal = useDisclosure(false);
  const deleteDialog = useDisclosure(false);
  const pendingModal = useDisclosure(false);
  const rejectModal = useDisclosure(false);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<UserDraft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) => {
      const hay = `${u.fullname} ${u.email} ${u.username} ${u.role ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const columns = React.useMemo<Array<Column<User>>>(
    () => [
      { header: "Full name", key: "fullname", className: "min-w-[220px]" },
      { header: "Email", key: "email", className: "min-w-[240px] text-zinc-600 dark:text-zinc-300" },
      { header: "Username", key: "username", className: "min-w-[160px]" },
      {
        header: "Role",
        className: "w-[120px]",
        render: (u) => (
          <Chip size="small" label={u.role ?? UserRoleEnum.CUSTOMER} variant="outlined" />
        ),
      },
      {
        header: "Active",
        className: "w-[100px]",
        render: (u) => (
          <Chip
            size="small"
            label={u.isActive === false ? "No" : "Yes"}
            color={u.isActive === false ? "default" : "success"}
            variant={u.isActive === false ? "outlined" : "filled"}
          />
        ),
      },
      {
        header: "Actions",
        className: "w-[140px]",
        render: (u) => (
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Edit user"
              icon={<PencilIcon width={18} height={18} />}
              onClick={() => onOpenEdit(u)}
            />
            <IconButton
              aria-label="Delete user"
              variant="danger"
              icon={<TrashIcon width={18} height={18} />}
              onClick={() => {
                setActiveId(userKey(u));
                deleteDialog.onOpen();
              }}
            />
          </div>
        ),
      },
    ],
    [deleteDialog, editModal]
  );

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await usersApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPendingSellers = React.useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const data = await usersApi.listPendingSellers();
      const sellers = Array.isArray(data) ? data : [];
      setPendingRows(sellers);
      setSelectedDocumentUrls((current) => Object.fromEntries(sellers.map((seller) => {
        const key = userKey(seller);
        const availableUrls = getSellerDocuments(seller).map((document) => document.url);
        const selectedUrls = current[key] ?? availableUrls.slice(0, MAX_REVIEW_DOCUMENTS);
        return [key, selectedUrls.filter((url) => availableUrls.includes(url)).slice(0, MAX_REVIEW_DOCUMENTS)];
      })));
    } catch (e) {
      setPendingError(normalizeApiError(e));
    } finally {
      setPendingLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function resetDraft() {
    setDraft(emptyDraft);
    setActiveId(null);
  }

  function normalizeRealId(u: User): string | null {
    return u._id ?? u.id ?? null;
  }

  function onToggleSellerDocument(user: User, documentUrl: string, checked: boolean) {
    const key = userKey(user);
    const availableUrls = getSellerDocuments(user).map((document) => document.url);
    const currentUrls = selectedDocumentUrls[key] ?? availableUrls.slice(0, MAX_REVIEW_DOCUMENTS);
    if (checked && !currentUrls.includes(documentUrl) && currentUrls.length >= MAX_REVIEW_DOCUMENTS) {
      setPendingError(`Select up to ${MAX_REVIEW_DOCUMENTS} documents per AI review.`);
      return;
    }

    setPendingError(null);
    setSelectedDocumentUrls((current) => ({
      ...current,
      [key]: checked
        ? [...currentUrls, documentUrl]
        : currentUrls.filter((url) => url !== documentUrl),
    }));
    setSellerReviews((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function onOpenCreate() {
    resetDraft();
    createModal.onOpen();
  }

  function onOpenEdit(u: User) {
    setActiveId(userKey(u));
    setDraft({
      fullname: u.fullname ?? "",
      email: u.email ?? "",
      username: u.username ?? "",
      password: "",
      role: (u.role ?? UserRoleEnum.CUSTOMER) as UserRole,
      phone: u.phone ?? "",
      address: u.address ?? "",
      avatar: u.avatar ?? "",
      sellerShopName: u.sellerProfile?.shopName ?? "",
      sellerBusinessEmail: u.sellerProfile?.businessEmail ?? "",
      sellerBusinessPhone: u.sellerProfile?.businessPhone ?? "",
      sellerBusinessAddress: u.sellerProfile?.businessAddress ?? "",
      isActive: u.isActive !== false,
    });
    editModal.onOpen();
  }

  async function onCreate() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (draft.role !== UserRoleEnum.CUSTOMER) {
        setError(
          "This admin page can only create CUSTOMER accounts. Use the public seller sign-up for SELLER (documents required), and /auth/register-admin for ADMIN.",
        );
        return;
      }

      const res = await usersApi.create({
        fullname: draft.fullname,
        email: draft.email,
        username: draft.username,
        password: draft.password,
        role: draft.role,
        phone: draft.phone || undefined,
        address: draft.address || undefined,
        avatar: draft.avatar || undefined,
        sellerProfile: undefined,
      });

      createModal.onClose();
      resetDraft();
      setSuccess(res.message || "User registered. Check email to activate the account.");
      await loadUsers();
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function onApproveSeller(u: User) {
    const id = normalizeRealId(u);
    if (!id) {
      setError("Cannot approve: seller id not found");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await usersApi.approveSeller(id);
      setSuccess("Seller approved.");
      await Promise.all([loadPendingSellers(), loadUsers()]);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function onReviewSellerDocuments(u: User) {
    const id = normalizeRealId(u);
    if (!id) {
      setPendingError("Cannot review documents: seller id not found");
      return;
    }

    const selectedUrls = selectedDocumentUrls[userKey(u)] ?? [];
    if (selectedUrls.length === 0) {
      setPendingError("Select at least one document for the AI review.");
      return;
    }

    setReviewingSellerId(id);
    setPendingError(null);
    try {
      const review = await usersApi.reviewSellerDocuments(id, selectedUrls);
      setSellerReviews((current) => ({ ...current, [id]: review }));
    } catch (e) {
      setPendingError(normalizeApiError(e));
    } finally {
      setReviewingSellerId(null);
    }
  }

  function onOpenRejectSeller(u: User) {
    const id = normalizeRealId(u);
    if (!id) {
      setError("Cannot reject: seller id not found");
      return;
    }
    setRejectTargetId(id);
    setRejectReason("");
    rejectModal.onOpen();
  }

  async function onConfirmRejectSeller() {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      setError("Rejection reason is required");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await usersApi.rejectSeller(rejectTargetId, rejectReason.trim());
      setSuccess("Seller rejected.");
      rejectModal.onClose();
      setRejectTargetId(null);
      setRejectReason("");
      await Promise.all([loadPendingSellers(), loadUsers()]);
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate() {
    if (!activeId) return;

    const target = rows.find((u) => userKey(u) === activeId);
    if (!target) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await usersApi.update(target, {
        fullname: draft.fullname,
        email: draft.email,
        username: draft.username,
        password: draft.password || undefined,
        role: draft.role,
        isActive: draft.isActive,
        phone: draft.phone || undefined,
        address: draft.address || undefined,
        avatar: draft.avatar || undefined,
        sellerProfile:
          draft.role === UserRoleEnum.SELLER
            ? {
                shopName: draft.sellerShopName || undefined,
                businessEmail: draft.sellerBusinessEmail || undefined,
                businessPhone: draft.sellerBusinessPhone || undefined,
                businessAddress: draft.sellerBusinessAddress || undefined,
              }
            : undefined,
      });

      editModal.onClose();
      resetDraft();
      await loadUsers();
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!activeId) return;

    const target = rows.find((u) => userKey(u) === activeId);
    if (!target) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await usersApi.remove(target);
      deleteDialog.onClose();
      resetDraft();
      setSuccess("User deleted.");
      await loadUsers();
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const canSubmitCreate =
    draft.fullname.trim() &&
    draft.email.trim() &&
    draft.username.trim() &&
    draft.password.trim().length >= 6 &&
    draft.phone.trim() &&
    draft.address.trim() &&
    draft.avatar.trim() &&
    draft.role === UserRoleEnum.CUSTOMER;

  const canSubmitEdit =
    draft.fullname.trim() && draft.email.trim() && draft.username.trim() && (draft.password ? draft.password.length >= 6 : true);

  const pendingColumns = React.useMemo<Array<Column<User>>>(
    () => [
      { header: "Seller", key: "fullname", className: "min-w-[200px]" },
      { header: "Email", key: "email", className: "min-w-[240px]" },
      {
        header: "Details",
        className: "min-w-[420px]",
        render: (u) => {
          const p = u.sellerProfile;
          const missingReviewChecks = getSellerReviewChecks(u);
          const review = sellerReviews[userKey(u)];
          const allDocs = getSellerDocuments(u);
          const selectedUrls = selectedDocumentUrls[userKey(u)] ?? allDocs.slice(0, MAX_REVIEW_DOCUMENTS).map((document) => document.url);

          return (
            <Stack spacing={0.75}>
              <Alert severity={missingReviewChecks.length ? "warning" : "success"} sx={{ py: 0 }}>
                <Typography variant="body2" fontWeight={700}>
                  Signup completeness: {missingReviewChecks.length ? "Needs attention" : "Required fields are present"}
                </Typography>
                <Typography variant="caption" component="div">
                  {missingReviewChecks.length
                    ? `Missing: ${missingReviewChecks.join(", ")}`
                    : "Required document links and signup fields are present. Open each document and check its content before deciding."}
                </Typography>
              </Alert>
              {review ? (
                <Alert
                  severity={review.recommendation === "LOOKS_COMPLETE" ? "success" : review.recommendation === "ISSUES_FOUND" ? "error" : "warning"}
                  sx={{ py: 0.5 }}
                >
                  <Typography variant="body2" fontWeight={700}>AI document review: {review.recommendation.replace(/_/g, " ")}</Typography>
                  <Typography variant="body2">{review.summary}</Typography>
                  {review.checks.length ? (
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                      {review.checks.map((check, index) => (
                        <Box key={`${check.document}-${index}`} sx={{ p: 0.75, border: 1, borderColor: "divider", borderRadius: 1 }}>
                          <Typography variant="caption" component="div" fontWeight={700}>
                            {check.document} · {check.documentType.replace(/_/g, " ")}
                          </Typography>
                          <Typography variant="caption" component="div">
                            Seller name ({check.sellerNameStatus.replace(/_/g, " ")}): {check.extractedSellerName || "Not read"}
                          </Typography>
                          <Typography variant="caption" component="div">
                            Registration number ({check.registrationNumberStatus.replace(/_/g, " ")}): {check.extractedRegistrationNumber || "Not read"}
                            {p?.businessRegistration?.registrationNumber
                              ? ` · Signup value: ${p.businessRegistration.registrationNumber}`
                              : " · No signup value provided"}
                          </Typography>
                          {check.notes ? <Typography variant="caption" component="div">{check.notes}</Typography> : null}
                        </Box>
                      ))}
                    </Stack>
                  ) : null}
                  {review.findings.length ? (
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                      {review.findings.map((finding, index) => (
                        <Typography variant="caption" component="div" key={`${finding.document}-${index}`}>
                          <b>{finding.severity} · {finding.document}:</b> {finding.issue} Next step: {finding.nextStep}
                        </Typography>
                      ))}
                    </Stack>
                  ) : null}
                  <Typography variant="caption" component="div" sx={{ mt: 0.75 }}>
                    AI findings are advisory. Confirm each document yourself before deciding.
                  </Typography>
                </Alert>
              ) : null}
              <Typography variant="body2">
                <b>Shop:</b> {p?.shopName ?? "â€”"}
              </Typography>

              <Typography variant="body2">
                <b>ID type:</b> {p?.identityDocument?.type ?? "â€”"}
                {"  "}
                <b>Reg #:</b> {p?.businessRegistration?.registrationNumber ?? "â€”"}
              </Typography>

              <Typography variant="body2">
                <b>Bank:</b> {p?.bankInfo?.bankName ?? "â€”"} {"  "}
                <b>Holder:</b> {p?.bankInfo?.accountHolder ?? "â€”"} {"  "}
                <b>IBAN:</b> {maskIban(p?.bankInfo?.iban)}
              </Typography>

              <Typography variant="body2">
                <b>Payment method:</b> {p?.bankInfo?.paymentMethod ?? "â€”"} {"  "}
                <b>SWIFT:</b> {p?.bankInfo?.swift ?? "â€”"}
              </Typography>

              {allDocs.length ? (
                <Stack spacing={0.25}>
                  <Typography variant="body2">
                    <b>Select documents for AI review ({selectedUrls.length}/{MAX_REVIEW_DOCUMENTS}):</b>
                  </Typography>
                  <Stack spacing={0.25}>
                    {allDocs.map((document) => (
                      <Stack direction="row" alignItems="center" spacing={0.5} key={`${document.label}:${document.url}`}>
                        <FormControlLabel
                          sx={{ mr: 0 }}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedUrls.includes(document.url)}
                              onChange={(event) => onToggleSellerDocument(u, document.url, event.target.checked)}
                            />
                          }
                          label={<Typography variant="caption">{document.label}</Typography>}
                        />
                        <a href={document.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, textDecoration: "underline", color: "inherit" }}>
                          Open
                        </a>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  <b>Documents:</b> â€”
                </Typography>
              )}
            </Stack>
          );
        },
      },
      {
        header: "Status",
        className: "w-[120px]",
        render: (u) => (
          <Chip size="small" label={u.sellerProfile?.status ?? SellerStatus.PENDING} variant="outlined" />
        ),
      },
      {
        header: "Actions",
        className: "w-[300px]",
        render: (u) => (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => void onReviewSellerDocuments(u)}
              disabled={saving || reviewingSellerId !== null || (selectedDocumentUrls[userKey(u)] ?? []).length === 0}
              isLoading={reviewingSellerId === normalizeRealId(u)}
            >
              AI review ({(selectedDocumentUrls[userKey(u)] ?? []).length})
            </Button>
            <Button
              onClick={() => void onApproveSeller(u)}
              disabled={saving}
            >
              Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() => onOpenRejectSeller(u)}
              disabled={saving}
            >
              Reject
            </Button>
          </div>
        ),
      },
    ],
    [saving, reviewingSellerId, selectedDocumentUrls, sellerReviews],
  );

  return (
    <RequireAuth roles={[UserRoleEnum.ADMIN]} unauthorizedRedirectTo="/auth/sign-in">
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <TableToolbar
          title="Users"
          subtitle="Manage users (add, edit, delete) with Material UI"
          searchValue={query}
          onSearchChange={setQuery}
          actions={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="secondary" onClick={loadUsers} disabled={loading}>
                Refresh
              </Button>
              <Button variant="secondary" onClick={() => session.logout("logout")}>
                Sign out
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  pendingModal.onOpen();
                  await loadPendingSellers();
                }}
                disabled={pendingLoading || saving}
              >
                Pending Sellers
              </Button>
              <Button leftIcon={<PlusIcon className="h-5 w-5" />} onClick={onOpenCreate}>
                Add User
              </Button>
            </Stack>
          }
        />

        {error ? <AlertBanner dismissible={false} severity="error">{error}</AlertBanner> : null}
        {success ? <AlertBanner dismissible={false} severity="success">{success}</AlertBanner> : null}

        <DataTable columns={columns} rows={filtered} rowKey={(u) => userKey(u)} emptyState={loading ? "Loadingâ€¦" : "No users found"} />

        <Typography variant="caption" color="text.secondary">
          API: set <span style={{ fontFamily: "monospace" }}>NEXT_PUBLIC_API_URL</span> (default: http://localhost:3001)
        </Typography>
      </Stack>

      <Modal
        open={createModal.open}
        onClose={() => {
          createModal.onClose();
          resetDraft();
        }}
        title="Add User"
        description="Registers a new user via POST /api/v1/auth/register (activation email will be sent)"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                createModal.onClose();
                resetDraft();
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={!canSubmitCreate} isLoading={saving}>
              Create
            </Button>
          </>
        }
      >
        <UserForm draft={draft} setDraft={setDraft} mode="create" showPasswordRequired />
      </Modal>

      <Modal
        open={editModal.open}
        onClose={() => {
          editModal.onClose();
          resetDraft();
        }}
        title="Edit User"
        description="Updates the user via PUT /api/v1/users/:id (password optional)"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                editModal.onClose();
                resetDraft();
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={onUpdate} disabled={!canSubmitEdit} isLoading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <UserForm draft={draft} setDraft={setDraft} mode="edit" showPasswordRequired={false} />
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete user"
        message="This will permanently delete the user."
        confirmText="Delete"
        isDanger
        isLoading={saving}
        onCancel={() => {
          deleteDialog.onClose();
          resetDraft();
        }}
        onConfirm={onDelete}
      />

      <Modal
        open={pendingModal.open}
        onClose={() => {
          pendingModal.onClose();
          setPendingError(null);
        }}
        title="Pending seller requests"
        description="Review pending sellers. AI review sends selected files to Gemini. The Gemini Free tier may use submitted content to improve Google products, so use synthetic test documents with free keys. Findings are advisory; an admin makes the final decision."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                pendingModal.onClose();
                setPendingError(null);
              }}
              disabled={saving}
            >
              Close
            </Button>
            <Button
              variant="secondary"
              onClick={loadPendingSellers}
              disabled={pendingLoading || saving}
            >
              Refresh
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          {pendingError ? <AlertBanner dismissible={false} severity="error">{pendingError}</AlertBanner> : null}
          <DataTable
            columns={pendingColumns}
            rows={pendingRows}
            rowKey={(u) => normalizeRealId(u) ?? userKey(u)}
            emptyState={pendingLoading ? "Loadingâ€¦" : "No pending sellers"}
          />
        </Stack>
      </Modal>

      <Modal
        open={rejectModal.open}
        onClose={() => {
          rejectModal.onClose();
          setRejectTargetId(null);
          setRejectReason("");
        }}
        title="Reject seller"
        description="Provide a reason (will be sent by email)"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                rejectModal.onClose();
                setRejectTargetId(null);
                setRejectReason("");
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={onConfirmRejectSeller} disabled={saving} isLoading={saving}>
              Reject
            </Button>
          </>
        }
      >
        <Stack spacing={2}>
          <FormField
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Missing required documents"
            fullWidth
            multiline
            minRows={3}
          />
        </Stack>
      </Modal>
      </Container>
    </RequireAuth>
  );
}

function UserForm({
  draft,
  setDraft,
  mode,
  showPasswordRequired,
}: {
  draft: UserDraft;
  setDraft: React.Dispatch<React.SetStateAction<UserDraft>>;
  mode: "create" | "edit";
  showPasswordRequired: boolean;
}) {
  const roleOptions = mode === "create" ? [UserRoleEnum.CUSTOMER] : Object.values(UserRoleEnum);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormField
          label="Full name"
          value={draft.fullname}
          onChange={(e) => setDraft((d) => ({ ...d, fullname: e.target.value }))}
          placeholder="John Doe"
          fullWidth
        />
        <FormField
          label="Username"
          value={draft.username}
          onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
          placeholder="john"
          fullWidth
        />
      </Stack>

      <FormField
        label="Email"
        value={draft.email}
        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
        placeholder="john@example.com"
        inputMode="email"
        fullWidth
      />

      <FormField
        label="Avatar URL"
        value={draft.avatar}
        onChange={(e) => setDraft((d) => ({ ...d, avatar: e.target.value }))}
        placeholder="https://..."
        fullWidth
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <FormControl fullWidth>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            Role
          </Typography>
          <Select
            size="small"
            value={draft.role}
            onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as UserRole }))}
          >
            {roleOptions.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
          </Select>
        </FormControl>

        {mode === "edit" ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              />
            }
            label="Active"
          />
        ) : null}
      </Stack>

      {draft.role === UserRoleEnum.SELLER ? (
        <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Seller profile (required)
          </Typography>

          <Stack spacing={2}>
            <FormField
              label="Shop name"
              value={draft.sellerShopName}
              onChange={(e) => setDraft((d) => ({ ...d, sellerShopName: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormField
                label="Business email"
                value={draft.sellerBusinessEmail}
                onChange={(e) => setDraft((d) => ({ ...d, sellerBusinessEmail: e.target.value }))}
                fullWidth
              />
              <FormField
                label="Business phone"
                value={draft.sellerBusinessPhone}
                onChange={(e) => setDraft((d) => ({ ...d, sellerBusinessPhone: e.target.value }))}
                fullWidth
              />
            </Stack>
            <FormField
              label="Business address"
              value={draft.sellerBusinessAddress}
              onChange={(e) => setDraft((d) => ({ ...d, sellerBusinessAddress: e.target.value }))}
              fullWidth
            />
          </Stack>
        </Box>
      ) : null}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormField
          label="Phone"
          value={draft.phone}
          onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
          placeholder="+1 555 123 4567"
          fullWidth
        />
        <FormField
          label="Address"
          value={draft.address}
          onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
          placeholder="City, Streetâ€¦"
          fullWidth
        />
      </Stack>

      <FormField
        label={showPasswordRequired ? "Password (min 6)" : "New password (optional, min 6)"}
        value={draft.password}
        onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
        placeholder={showPasswordRequired ? "******" : "Leave empty to keep current"}
        type="password"
        fullWidth
        helperText={showPasswordRequired ? undefined : "Leave empty to keep current password"}
      />
    </Stack>
  );
}
