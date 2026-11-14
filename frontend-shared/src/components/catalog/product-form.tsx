"use client";

import * as React from "react";
import { Box, IconButton as MuiIconButton, MenuItem, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { getCategoryLeafIds, getCategoryPath, type Category } from "@shared/api/categories";
import type { CreateProductInput, Product } from "@shared/api/products/seller";
import { cloudinaryApi } from "@shared/api/cloudinary";
import { Button } from "@shared/components/ui/button";
import { FormField } from "@shared/components/ui/form-field";
import { Modal } from "@shared/components/ui/modal";
import { useToast } from "@shared/components/ui/toast";
import { useTranslations } from "@shared/context/locale-context";

type ProductDraft = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  brand: string;
  color: string;
  attributes: Array<{ id: string; key: string; value: string }>;
  images: string[];
};

type ProductImageItem = {
  id: string;
  displayUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  canceled?: boolean;
};

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function revokeIfBlobUrl(url: string | undefined) {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}

function toNumberOrUndefined(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function emptyDraft(): ProductDraft {
  return { name: "", description: "", price: "", stock: "", categoryId: "", brand: "", color: "", attributes: [{ id: makeId(), key: "", value: "" }], images: [] };
}

export type ProductFormModalProps = {
  open: boolean;
  product?: Product | null;
  categories: Category[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProductInput) => Promise<void> | void;
};

export function ProductFormModal({
  open,
  product,
  categories,
  saving,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const t = useTranslations();
  const { notify } = useToast();
  const [draft, setDraft] = React.useState<ProductDraft>(emptyDraft);
  const categoryOptions = React.useMemo(() => {
    const leafIds = getCategoryLeafIds(categories);
    return categories.filter((category) => leafIds.has(category._id) || category._id === product?.categoryId);
  }, [categories, product?.categoryId]);
  const [imagesUi, setImagesUi] = React.useState<ProductImageItem[]>([]);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (product) {
      setDraft({
        name: product.name ?? "",
        description: product.description ?? "",
        price: String(product.price ?? ""),
        stock: String(product.stock ?? ""),
        categoryId: product.categoryId ?? "",
        brand: product.brand ?? "",
        color: product.color ?? "",
        attributes: Object.entries(product.attributes ?? {}).length
          ? Object.entries(product.attributes ?? {}).map(([key, value]) => ({ id: makeId(), key, value }))
          : [{ id: makeId(), key: "", value: "" }],
        images: Array.isArray(product.images) ? product.images : [],
      });
      setImagesUi(
        (Array.isArray(product.images) ? product.images : []).map((url) => ({
          id: makeId(),
          displayUrl: url,
          uploadedUrl: url,
          uploading: false,
        })),
      );
    } else {
      setDraft(emptyDraft());
      setImagesUi([]);
    }
  }, [open, product]);

  async function onPickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    if (selected.some((file) => !file.type.startsWith("image/"))) {
      notify({ variant: "danger", title: t("CATALOG.INVALID_FILE"), message: t("CATALOG.IMAGES_ONLY") });
      return;
    }
    const pending: ProductImageItem[] = selected.map((file) => ({
      id: makeId(),
      displayUrl: URL.createObjectURL(file),
      uploading: true,
    }));
    setImagesUi((prev) => [...pending, ...prev]);
    setUploading(true);
    try {
      await Promise.all(
        pending.map(async (item, index) => {
          const uploaded = await cloudinaryApi.uploadProductImage(selected[index]);
          let shouldApply = true;
          setImagesUi((prev) =>
            prev.map((entry) => {
              if (entry.id !== item.id) return entry;
              shouldApply = !entry.canceled;
              return { ...entry, uploading: false, uploadedUrl: uploaded.url, displayUrl: uploaded.url };
            }),
          );
          revokeIfBlobUrl(item.displayUrl);
          if (shouldApply) setDraft((current) => ({ ...current, images: [...current.images, uploaded.url] }));
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("CATALOG.UPLOAD_FAILED");
      notify({ variant: "danger", title: t("CATALOG.UPLOAD_FAILED"), message });
    } finally {
      setImagesUi((prev) => prev.map((item) => ({ ...item, uploading: false })));
      setUploading(false);
    }
  }

  function removeImage(item: ProductImageItem) {
    setImagesUi((prev) => prev.filter((entry) => entry.id !== item.id));
    if (item.uploadedUrl) {
      setDraft((current) => ({ ...current, images: current.images.filter((url) => url !== item.uploadedUrl) }));
    }
    revokeIfBlobUrl(item.displayUrl);
  }

  async function handleSubmit() {
    const price = toNumberOrUndefined(draft.price);
    const stock = toNumberOrUndefined(draft.stock);
    if (!draft.name.trim()) {
      notify({ variant: "danger", title: t("CATALOG.NAME_REQUIRED"), message: t("CATALOG.NAME_REQUIRED") });
      return;
    }
    if (!draft.categoryId) {
      notify({ variant: "danger", title: t("CATALOG.CATEGORY_REQUIRED"), message: t("CATALOG.CATEGORY_REQUIRED") });
      return;
    }
    if (price === undefined || price < 0) {
      notify({ variant: "danger", title: t("CATALOG.PRICE_INVALID"), message: t("CATALOG.PRICE_INVALID") });
      return;
    }
    if (draft.stock.trim() && (stock === undefined || stock < 0 || !Number.isInteger(stock))) {
      notify({ variant: "danger", title: t("CATALOG.STOCK"), message: "Stock must be a whole number greater than or equal to zero." });
      return;
    }
    await onSubmit({
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      price,
      stock,
      images: draft.images,
      categoryId: draft.categoryId,
      brand: draft.brand.trim() || undefined,
      color: draft.color.trim() || undefined,
      attributes: Object.fromEntries(
        draft.attributes
          .map((attribute) => [attribute.key.trim(), attribute.value.trim()] as const)
          .filter(([key, value]) => key && value),
      ),
    });
  }

  function handleClose() {
    imagesUi.forEach((item) => revokeIfBlobUrl(item.displayUrl));
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={product ? t("CATALOG.UPDATE_PRODUCT") : t("CATALOG.ADD_PRODUCT")}
      description={product ? t("CATALOG.EDIT_PRODUCT") : t("CATALOG.CREATE_PRODUCT")}
      size="md"
      footer={
        <>
          <Button variant="outlined" onClick={handleClose} disabled={saving}>
            {t("ADMIN_PAGE.CANCEL")}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || uploading}>
            {saving ? t("ADMIN_PAGE.SAVING") : t("ADMIN_PAGE.SAVE")}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <FormField
          label={t("CATALOG.NAME")}
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          fullWidth
          required
        />
        <FormField
          select
          label={t("CATALOG.CATEGORY")}
          value={draft.categoryId}
          onChange={(event) => {
            const categoryId = event.target.value;
            const path = getCategoryPath(categoryId, categories).toLowerCase();
            const suggestedKeys = path.includes("ordinateur portable") || path.includes("laptop")
              ? ["RAM", "Storage", "Processor"]
              : [];
            setDraft((current) => ({
              ...current,
              categoryId,
              attributes: current.attributes.some((attribute) => attribute.key.trim())
                ? current.attributes
                : suggestedKeys.length
                  ? suggestedKeys.map((key) => ({ id: makeId(), key, value: "" }))
                  : current.attributes,
            }));
          }}
          fullWidth
          required
        >
          {categoryOptions.map((category) => (
            <MenuItem key={category._id} value={category._id}>
              {getCategoryPath(category._id, categories)}
            </MenuItem>
          ))}
        </FormField>
        <FormField
          label={t("CATALOG.DESCRIPTION")}
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          fullWidth
          multiline
          minRows={3}
          inputProps={{ maxLength: 1000 }}
          helperText={`${draft.description.length}/1000`}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormField
            label="Brand / marque"
            value={draft.brand}
            onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
            fullWidth
          />
          <FormField
            label="Color"
            value={draft.color}
            onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
            fullWidth
          />
        </Stack>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Specifications</Typography>
          <Stack spacing={1}>
            {draft.attributes.map((attribute) => (
              <Stack key={attribute.id} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                <FormField
                  label="Attribute (e.g. RAM)"
                  value={attribute.key}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    attributes: current.attributes.map((item) => item.id === attribute.id ? { ...item, key: event.target.value } : item),
                  }))}
                  fullWidth
                />
                <FormField
                  label="Value (e.g. 16 GB)"
                  value={attribute.value}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    attributes: current.attributes.map((item) => item.id === attribute.id ? { ...item, value: event.target.value } : item),
                  }))}
                  fullWidth
                />
                {draft.attributes.length > 1 ? (
                  <MuiIconButton aria-label="Remove specification" onClick={() => setDraft((current) => ({ ...current, attributes: current.attributes.filter((item) => item.id !== attribute.id) }))}>
                    <CloseIcon />
                  </MuiIconButton>
                ) : null}
              </Stack>
            ))}
            <Stack direction="row">
              <MuiIconButton aria-label="Add specification" title="Add specification" color="primary" onClick={() => setDraft((current) => ({
                ...current,
                attributes: [...current.attributes, { id: makeId(), key: "", value: "" }],
              }))}>
                <AddIcon />
              </MuiIconButton>
            </Stack>
          </Stack>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormField
            label={t("CATALOG.PRICE")}
            type="number"
            inputProps={{ min: 0, step: "0.01", inputMode: "decimal" }}
            value={draft.price}
            onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
            fullWidth
          />
          <FormField
            label={t("CATALOG.STOCK")}
            type="number"
            inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
            value={draft.stock}
            onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))}
            fullWidth
          />
        </Stack>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            {t("CATALOG.IMAGES")}
          </Typography>
          <Button variant="outlined" component="label" disabled={uploading}>
            {uploading ? t("CATALOG.UPLOADING") : t("CATALOG.UPLOAD_IMAGES")}
            <input
              hidden
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                void onPickImages(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </Button>
          {imagesUi.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
              {imagesUi.map((item) => (
                <Box key={item.id} sx={{ position: "relative", width: 72, height: 72 }}>
                  <img
                    src={item.displayUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6, opacity: item.uploading ? 0.5 : 1 }}
                  />
                  {!item.uploading ? (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => removeImage(item)}
                      sx={{ position: "absolute", top: -8, right: -8, minWidth: 0, p: 0.25, borderRadius: "50%" }}
                    >
                      ×
                    </Button>
                  ) : null}
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Modal>
  );
}
