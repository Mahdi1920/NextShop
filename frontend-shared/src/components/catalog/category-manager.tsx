"use client";

import * as React from "react";
import { Alert, Box, Container, IconButton as MuiIconButton, MenuItem, Pagination, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { adminCategoriesApi, getCategoryDescendantIds, getCategoryPath, type Category } from "@shared/api/categories";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { DataTable, type Column } from "@shared/components/table/data-table";
import { TableToolbar } from "@shared/components/table/table-toolbar";
import { Button, IconButton } from "@shared/components/ui/button";
import { ConfirmDialog } from "@shared/components/ui/confirm-dialog";
import { FormField } from "@shared/components/ui/form-field";
import { PencilIcon, PlusIcon, TrashIcon } from "@shared/components/ui/icons";
import { Modal } from "@shared/components/ui/modal";
import { useDisclosure } from "@shared/hooks/useDisclosure";
import { useToast } from "@shared/components/ui/toast";
import { useTranslations } from "@shared/context/locale-context";
import { useSocket } from "@shared/context/socket-context";
import { UserRole } from "@shared/enums";
import { ApiFetchError } from "@shared/api/clients";

type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  parentId: string;
};

type CategoryNodeDraft = {
  id: string;
  name: string;
  children: CategoryNodeDraft[];
};

type CategoryTreeRow = Category & { depth: number; hasChildren: boolean };

const emptyDraft: CategoryDraft = { name: "", slug: "", description: "", parentId: "" };
const newCategoryNode = (): CategoryNodeDraft => ({ id: crypto.randomUUID(), name: "", children: [] });

function updateCategoryNodes(
  nodes: CategoryNodeDraft[],
  id: string,
  update: (node: CategoryNodeDraft) => CategoryNodeDraft,
): CategoryNodeDraft[] {
  return nodes.map((node) => node.id === id
    ? update(node)
    : { ...node, children: updateCategoryNodes(node.children, id, update) });
}

function removeCategoryNode(nodes: CategoryNodeDraft[], id: string): CategoryNodeDraft[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeCategoryNode(node.children, id) }));
}

async function createCategoryChildren(nodes: CategoryNodeDraft[], parentId: string) {
  for (const node of nodes) {
    const name = node.name.trim();
    if (!name) continue;
    const category = await adminCategoriesApi.create({ name, parentId });
    await createCategoryChildren(node.children, category._id);
  }
}

function makeSlug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiFetchError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function CategoryManager() {
  const t = useTranslations();
  const { notify } = useToast();
  const { onEvent } = useSocket();
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [rows, setRows] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<CategoryDraft>(emptyDraft);
  const [subcategories, setSubcategories] = React.useState<CategoryNodeDraft[]>([newCategoryNode()]);
  const [active, setActive] = React.useState<Category | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = React.useState<Set<string>>(() => new Set());

  const createModal = useDisclosure(false);
  const editModal = useDisclosure(false);
  const deleteDialog = useDisclosure(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminCategoriesApi.list());
    } catch (err) {
      setError(errorMessage(err, t("ADMIN_PAGE.METRICS_ERROR")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    return onEvent("category:changed", () => {
      void load();
    });
  }, [onEvent, load]);

  const categoryTree = React.useMemo(() => {
    const byId = new Map(rows.map((row) => [row._id, row]));
    const childrenByParent = new Map<string | null, Category[]>();
    for (const row of rows) {
      const parentId = row.parentId && byId.has(row.parentId) ? row.parentId : null;
      const children = childrenByParent.get(parentId) ?? [];
      children.push(row);
      childrenByParent.set(parentId, children);
    }
    for (const children of childrenByParent.values()) children.sort((left, right) => left.name.localeCompare(right.name));

    const needle = query.trim().toLowerCase();
    const includedIds = new Set<string>();
    if (!needle) {
      rows.forEach((row) => includedIds.add(row._id));
    } else {
      const matchingIds = rows
        .filter((row) => `${row.name} ${row.slug} ${row.description ?? ""}`.toLowerCase().includes(needle))
        .map((row) => row._id);
      for (const matchId of matchingIds) {
        let current = byId.get(matchId);
        const visited = new Set<string>();
        while (current && !visited.has(current._id)) {
          includedIds.add(current._id);
          visited.add(current._id);
          current = current.parentId ? byId.get(current.parentId) : undefined;
        }
      }
    }
    const roots = (childrenByParent.get(null) ?? []).filter((row) => includedIds.has(row._id));
    return { byId, childrenByParent, includedIds, roots, searching: Boolean(needle) };
  }, [query, rows]);

  React.useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(categoryTree.roots.length / pageSize) || 1);
  const pagedRoots = categoryTree.roots.slice((page - 1) * pageSize, page * pageSize);
  const visibleRows: CategoryTreeRow[] = [];
  const appendVisibleRows = (category: Category, depth: number) => {
    if (!categoryTree.includedIds.has(category._id)) return;
    const children = (categoryTree.childrenByParent.get(category._id) ?? [])
      .filter((child) => categoryTree.includedIds.has(child._id));
    visibleRows.push({ ...category, depth, hasChildren: children.length > 0 });
    const hasMatchingDescendant = categoryTree.searching && children.length > 0;
    if (expandedCategoryIds.has(category._id) || hasMatchingDescendant) {
      children.forEach((child) => appendVisibleRows(child, depth + 1));
    }
  };
  pagedRoots.forEach((root) => appendVisibleRows(root, 0));

  const columns = React.useMemo<Array<Column<CategoryTreeRow>>>(
    () => [
      {
        id: "name",
        header: t("ADMIN_PAGE.NAME"),
        render: (row) => (
          <Stack direction="row" alignItems="center" sx={{ pl: row.depth * 2 }}>
            {row.hasChildren ? (
              <MuiIconButton
                size="small"
                aria-label={`${expandedCategoryIds.has(row._id) ? "Collapse" : "Expand"} ${row.name}`}
                aria-expanded={expandedCategoryIds.has(row._id)}
                onClick={() => setExpandedCategoryIds((current) => {
                  const next = new Set(current);
                  if (next.has(row._id)) next.delete(row._id);
                  else next.add(row._id);
                  return next;
                })}
              >
                <ExpandMoreIcon sx={{ transform: expandedCategoryIds.has(row._id) ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
              </MuiIconButton>
            ) : <Box sx={{ width: 40, flex: "0 0 40px" }} />}
            <Typography variant="body2">{row.name}</Typography>
          </Stack>
        ),
      },
      {
        id: "actions",
        header: t("ADMIN_PAGE.ACTIONS"),
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              aria-label={t("ADMIN_PAGE.EDIT")}
              icon={<PencilIcon width={18} height={18} />}
              onClick={() => {
                setActive(row);
                setDraft({
                  name: row.name ?? "",
                  slug: row.slug ?? "",
                  description: row.description ?? "",
                  parentId: row.parentId ?? "",
                });
                setSubcategories([]);
                editModal.onOpen();
              }}
            />
            <IconButton
              aria-label={t("ADMIN_PAGE.DELETE")}
              variant="danger"
              icon={<TrashIcon width={18} height={18} />}
              onClick={() => {
                setActive(row);
                deleteDialog.onOpen();
              }}
            />
          </Stack>
        ),
      },
    ],
    [deleteDialog, editModal, expandedCategoryIds, t],
  );

  async function onCreate() {
    if (!draft.name.trim()) {
      setError(t("ADMIN_PAGE.CATEGORY_NAME_REQUIRED"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const parentCategory = await adminCategoriesApi.create({
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || undefined,
        parentId: draft.parentId || null,
      });
      await createCategoryChildren(subcategories, parentCategory._id);
      createModal.onClose();
      setDraft(emptyDraft);
      setSubcategories([newCategoryNode()]);
      notify({ variant: "success", title: t("ADMIN_PAGE.SAVE"), message: t("ADMIN_PAGE.ADD_CATEGORY") });
      await load();
    } catch (err) {
      setError(errorMessage(err, t("ADMIN_PAGE.METRICS_ERROR")));
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate() {
    if (!active) return;
    if (!draft.name.trim()) {
      setError(t("ADMIN_PAGE.CATEGORY_NAME_REQUIRED"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminCategoriesApi.update(active._id, {
        name: draft.name.trim(),
        slug: draft.slug.trim() || undefined,
        description: draft.description.trim() || undefined,
        parentId: draft.parentId || null,
      });
      await createCategoryChildren(subcategories, active._id);
      editModal.onClose();
      setActive(null);
      setDraft(emptyDraft);
      setSubcategories([]);
      notify({ variant: "success", title: t("ADMIN_PAGE.SAVE"), message: t("ADMIN_PAGE.UPDATE_CATEGORY") });
      await load();
    } catch (err) {
      setError(errorMessage(err, t("ADMIN_PAGE.METRICS_ERROR")));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      await adminCategoriesApi.remove(active._id);
      deleteDialog.onClose();
      setActive(null);
      notify({ variant: "success", title: t("ADMIN_PAGE.DELETE"), message: t("ADMIN_PAGE.DELETE") });
      await load();
    } catch (err) {
      setError(errorMessage(err, t("ADMIN_PAGE.METRICS_ERROR")));
    } finally {
      setSaving(false);
    }
  }

  const form = (isCreate = false) => (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <FormField
        select
        label="Parent category"
        value={draft.parentId}
        onChange={(event) => setDraft((current) => ({ ...current, parentId: event.target.value }))}
        fullWidth
      >
        <MenuItem value="">No parent (top level)</MenuItem>
        {rows.filter((row) => row._id !== active?._id && !(active && getCategoryDescendantIds(active._id, rows).has(row._id))).map((row) => (
          <MenuItem key={row._id} value={row._id}>{getCategoryPath(row._id, rows)}</MenuItem>
        ))}
      </FormField>
      <FormField
        label={t("ADMIN_PAGE.NAME")}
        value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        fullWidth
        required
        autoFocus
        inputProps={{ maxLength: 80 }}
        helperText={`${draft.name.length}/80`}
      />
      {isCreate || active ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>Subcategories</Typography>
          {subcategories.map((node) => renderSubcategory(node, 0))}
          <Stack direction="row">
            <MuiIconButton aria-label="Add subcategory" title="Add subcategory" onClick={() => setSubcategories((current) => [...current, newCategoryNode()])} color="primary">
              <AddIcon />
            </MuiIconButton>
          </Stack>
        </Stack>
      ) : null}
      <FormField
        label={t("ADMIN_PAGE.SLUG_OPTIONAL")}
        value={draft.slug}
        onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
        helperText={t("ADMIN_PAGE.AUTO_SLUG")}
        fullWidth
        inputProps={{ maxLength: 100 }}
      />
      <Typography variant="caption" color="text.secondary">
        URL preview: <b>{draft.slug.trim() || makeSlug(draft.name) || "category-name"}</b>
      </Typography>
      <FormField
        label={t("ADMIN_PAGE.DESCRIPTION_OPTIONAL")}
        value={draft.description}
        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
        fullWidth
        multiline
        minRows={3}
        inputProps={{ maxLength: 500 }}
        helperText={`${draft.description.length}/500`}
      />
    </Stack>
  );

  function renderSubcategory(node: CategoryNodeDraft, depth: number): React.ReactNode {
    return (
      <Stack key={node.id} spacing={1} sx={{ ml: depth * 2, pl: 1.5, borderLeft: depth ? "1px solid" : "none", borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormField
            label={`Subcategory${depth ? ` (level ${depth + 1})` : ""}`}
            value={node.name}
            onChange={(event) => setSubcategories((current) => updateCategoryNodes(current, node.id, (item) => ({ ...item, name: event.target.value })))}
            fullWidth
            inputProps={{ maxLength: 80 }}
          />
          <MuiIconButton aria-label="Add nested subcategory" onClick={() => setSubcategories((current) => updateCategoryNodes(current, node.id, (item) => ({ ...item, children: [...item.children, newCategoryNode()] })))} color="primary">
            <AddIcon />
          </MuiIconButton>
          <MuiIconButton aria-label="Remove subcategory" onClick={() => setSubcategories((current) => removeCategoryNode(current, node.id))}>
            <CloseIcon />
          </MuiIconButton>
        </Stack>
        {node.children.map((child) => renderSubcategory(child, depth + 1))}
      </Stack>
    );
  }

  return (
    <RequireAuth roles={[UserRole.ADMIN]} unauthorizedRedirectTo="/auth/sign-in">
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <TableToolbar
            title={t("ADMIN_PAGE.CATEGORIES")}
            subtitle={t("ADMIN_PAGE.CATEGORY_DESCRIPTION")}
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder={t("ADMIN_PAGE.NAME")}
            actions={
              <Stack direction="row" spacing={1}>
                <Button variant="secondary" onClick={() => void load()} disabled={loading}>
                  {t("ADMIN_PAGE.REFRESH")}
                </Button>
                <Button
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                  onClick={() => {
                    setDraft(emptyDraft);
                    setSubcategories([newCategoryNode()]);
                    createModal.onOpen();
                  }}
                >
                  {t("ADMIN_PAGE.ADD_CATEGORY")}
                </Button>
              </Stack>
            }
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
          <DataTable
            columns={columns}
            rows={visibleRows}
            rowKey={(row) => row._id}
            emptyState={loading ? t("ADMIN_PAGE.LOADING") : t("ADMIN_PAGE.NO_CATEGORIES")}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              {visibleRows.length} / {categoryTree.includedIds.size}
            </Typography>
            <Pagination
              page={Math.min(page, totalPages)}
              count={totalPages}
              color="primary"
              onChange={(_event, next) => setPage(next)}
            />
          </Stack>
        </Stack>

        <Modal
          open={createModal.open}
          onClose={() => {
            createModal.onClose();
            setDraft(emptyDraft);
            setSubcategories([newCategoryNode()]);
          }}
          title={t("ADMIN_PAGE.ADD_CATEGORY")}
          description={t("ADMIN_PAGE.CREATE_CATEGORY")}
          footer={
            <>
              <Button variant="secondary" onClick={createModal.onClose} disabled={saving}>
                {t("ADMIN_PAGE.CANCEL")}
              </Button>
              <Button onClick={() => void onCreate()} isLoading={saving}>
                {t("ADMIN_PAGE.SAVE")}
              </Button>
            </>
          }
        >
          {form(true)}
        </Modal>

        <Modal
          open={editModal.open}
          onClose={() => {
            editModal.onClose();
            setActive(null);
            setDraft(emptyDraft);
            setSubcategories([]);
          }}
          title={t("ADMIN_PAGE.UPDATE_CATEGORY")}
          description={t("ADMIN_PAGE.EDIT_CATEGORY")}
          footer={
            <>
              <Button variant="secondary" onClick={editModal.onClose} disabled={saving}>
                {t("ADMIN_PAGE.CANCEL")}
              </Button>
              <Button onClick={() => void onUpdate()} isLoading={saving}>
                {t("ADMIN_PAGE.SAVE")}
              </Button>
            </>
          }
        >
          {form()}
        </Modal>

        <ConfirmDialog
          open={deleteDialog.open}
          title={t("ADMIN_PAGE.DELETE")}
          message={t("ADMIN_PAGE.DELETE_CONFIRM")}
          confirmText={t("ADMIN_PAGE.DELETE")}
          isDanger
          isLoading={saving}
          onCancel={() => {
            deleteDialog.onClose();
            setActive(null);
          }}
          onConfirm={() => void onDelete()}
        />
      </Container>
    </RequireAuth>
  );
}
