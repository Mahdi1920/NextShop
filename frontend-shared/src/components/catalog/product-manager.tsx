"use client";

import * as React from "react";
import { Alert, Container, Stack } from "@mui/material";
import { categoriesApi, type Category } from "@shared/api/categories";
import {
  adminProductsApi,
  sellerProductsApi,
  type CreateProductInput,
  type Product,
} from "@shared/api/products/seller";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { ProductCatalog } from "@shared/components/catalog/product-catalog";
import { ProductFormModal } from "@shared/components/catalog/product-form";
import { TableToolbar } from "@shared/components/table/table-toolbar";
import { Button } from "@shared/components/ui/button";
import { useConfirm } from "@shared/components/ui/confirm-provider";
import { PlusIcon } from "@shared/components/ui/icons";
import { useToast } from "@shared/components/ui/toast";
import { useSession } from "@shared/context/session-context";
import { useTranslations } from "@shared/context/locale-context";
import { useSocket } from "@shared/context/socket-context";
import { SellerStatus, UserRole } from "@shared/enums";
import { ApiFetchError } from "@shared/api/clients";
import { useProductList, type ProductListSource } from "@shared/hooks/useProductList";

export type ProductManagerMode = "admin" | "seller";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiFetchError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function ProductManager({ mode }: { mode: ProductManagerMode }) {
  const t = useTranslations();
  const { notify } = useToast();
  const confirm = useConfirm();
  const { onEvent } = useSocket();
  const session = useSession();
  const sellerStatus = session.user?.sellerProfile?.status ?? SellerStatus.PENDING;
  const canManage = mode === "admin" || sellerStatus === SellerStatus.APPROVED;
  const source: ProductListSource = mode === "admin" ? "admin" : "mine";
  const catalog = useProductList(source, canManage);
  const reloadCatalog = catalog.reload;
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);

  const loadCategories = React.useCallback(async () => {
    try {
      setCategories(await categoriesApi.list());
    } catch {
      setCategories([]);
    }
  }, []);

  React.useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  React.useEffect(() => {
    const reload = () => {
      if (canManage) void reloadCatalog();
      void loadCategories();
    };
    const unsubProduct = onEvent("product:changed", reload);
    const unsubStock = onEvent("product:out_of_stock", reload);
    const unsubCategory = onEvent("category:changed", reload);
    const unsubDashboard = onEvent(
      mode === "admin" ? "dashboard:refresh:admin" : "dashboard:refresh:seller",
      reload,
    );
    return () => {
      unsubProduct();
      unsubStock();
      unsubCategory();
      unsubDashboard();
    };
  }, [canManage, loadCategories, mode, onEvent, reloadCatalog]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  async function onSubmit(input: CreateProductInput) {
    setSaving(true);
    try {
      if (editing) {
        if (mode === "admin") {
          await adminProductsApi.update(editing._id, input);
        } else {
          await sellerProductsApi.update(editing._id, input);
        }
        notify({ variant: "success", title: t("ADMIN_PAGE.SAVE"), message: t("CATALOG.UPDATE_PRODUCT") });
      } else {
        await sellerProductsApi.create(input);
        notify({ variant: "success", title: t("ADMIN_PAGE.SAVE"), message: t("CATALOG.ADD_PRODUCT") });
      }
      setFormOpen(false);
      setEditing(null);
      catalog.reload();
    } catch (error) {
      notify({ variant: "danger", title: t("CATALOG.LOAD_ERROR"), message: errorMessage(error, t("CATALOG.LOAD_ERROR")) });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(product: Product) {
    const ok = await confirm({
      title: t("CATALOG.DELETE"),
      message: t("CATALOG.DELETE_CONFIRM").replace("{name}", product.name),
      confirmText: t("CATALOG.DELETE"),
      cancelText: t("ADMIN_PAGE.CANCEL"),
      isDanger: true,
    });
    if (!ok) return;
    try {
      if (mode === "admin") await adminProductsApi.remove(product._id);
      else await sellerProductsApi.remove(product._id);
      notify({ variant: "success", title: t("CATALOG.DELETE"), message: product.name });
      catalog.reload();
    } catch (error) {
      notify({ variant: "danger", title: t("CATALOG.LOAD_ERROR"), message: errorMessage(error, t("CATALOG.LOAD_ERROR")) });
    }
  }

  async function onToggleActive(product: Product) {
    try {
      const api = mode === "admin" ? adminProductsApi : sellerProductsApi;
      const updated = product.isActive ? await api.deactivate(product._id) : await api.activate(product._id);
      notify({
        variant: "success",
        title: t("ADMIN_PAGE.SAVE"),
        message: updated.isActive ? t("CATALOG.ACTIVATE") : t("CATALOG.DEACTIVATE"),
      });
      catalog.reload();
    } catch (error) {
      notify({ variant: "danger", title: t("CATALOG.LOAD_ERROR"), message: errorMessage(error, t("CATALOG.LOAD_ERROR")) });
    }
  }

  const roles = mode === "admin" ? [UserRole.ADMIN] : [UserRole.SELLER];

  return (
    <RequireAuth roles={roles} unauthorizedRedirectTo="/auth/sign-in">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <ProductCatalog
          source={source}
          catalog={catalog}
          categories={categories}
          showStatus
          toolbar={
            <Stack spacing={2}>
              <TableToolbar
                title={t("CATALOG.MANAGE_TITLE")}
                subtitle={t("CATALOG.MANAGE_DESCRIPTION")}
                actions={
                  <Stack direction="row" spacing={1}>
                    <Button variant="secondary" onClick={() => catalog.reload()} disabled={catalog.loading || !canManage}>
                      {t("ADMIN_PAGE.REFRESH")}
                    </Button>
                    {mode === "seller" ? (
                      <Button leftIcon={<PlusIcon className="h-5 w-5" />} onClick={openCreate} disabled={!canManage}>
                        {t("CATALOG.ADD_PRODUCT")}
                      </Button>
                    ) : null}
                  </Stack>
                }
              />
              {!canManage ? <Alert severity="warning">{t("CATALOG.SELLER_LOCKED")}</Alert> : null}
            </Stack>
          }
          renderActions={(product) =>
            canManage ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" onClick={() => openEdit(product)}>
                  {t("CATALOG.EDIT")}
                </Button>
                <Button size="small" variant="outlined" onClick={() => void onToggleActive(product)}>
                  {product.isActive ? t("CATALOG.DEACTIVATE") : t("CATALOG.ACTIVATE")}
                </Button>
                <Button size="small" color="error" onClick={() => void onDelete(product)}>
                  {t("CATALOG.DELETE")}
                </Button>
              </Stack>
            ) : null
          }
        />
        <ProductFormModal
          open={formOpen}
          product={editing}
          categories={categories}
          saving={saving}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={onSubmit}
        />
      </Container>
    </RequireAuth>
  );
}
