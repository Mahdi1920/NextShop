"use client";

import * as React from "react";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

import { Button } from "@shared/components/ui/button";
import { ProductCatalog } from "@shared/components/catalog/product-catalog";
import { TableToolbar } from "@shared/components/table/table-toolbar";
import { useSession } from "@shared/context/session-context";
import { useToast } from "@shared/components/ui/toast";
import { useTranslations } from "@shared/context/locale-context";
import { type Product } from "@shared/api/products";
import { categoriesApi, type Category } from "@shared/api/categories";
import { useSocket } from "@shared/context/socket-context";
import { formatCurrency } from "@shared/lib/date-utils";
import { useProductList } from "@shared/hooks/useProductList";

type CartLine = { product: Product; quantity: number };

export function CustomerProductBrowser({
  showCart = true,
}: {
  showCart?: boolean;
}) {
  const t = useTranslations();
  const session = useSession();
  const { notify } = useToast();
  const { onEvent } = useSocket();
  const catalog = useProductList("catalog");
  const reloadCatalog = catalog.reload;

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartReady, setCartReady] = React.useState(false);

  const cartStorageKey = `nextshop-cart-v2-${session.user?.email ?? "customer"}`;

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
      void reloadCatalog();
      void loadCategories();
    };
    const unsubProductChanged = onEvent("product:changed", reload);
    const unsubStock = onEvent("product:out_of_stock", reload);
    const unsubCategory = onEvent("category:changed", reload);
    const unsubRefresh = onEvent("dashboard:refresh:customer", reload);
    return () => {
      unsubProductChanged();
      unsubStock();
      unsubCategory();
      unsubRefresh();
    };
  }, [loadCategories, onEvent, reloadCatalog]);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(cartStorageKey);
      setCart(saved ? (JSON.parse(saved) as CartLine[]) : []);
    } catch {
      setCart([]);
    } finally {
      setCartReady(true);
    }
  }, [cartStorageKey]);

  React.useEffect(() => {
    if (cartReady) {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      window.dispatchEvent(new Event("nextshop:cart-changed"));
    }
  }, [cart, cartReady, cartStorageKey]);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product._id === product._id);
      if (existing) {
        return current.map((line) =>
          line.product._id === product._id
            ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) }
            : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    notify({ variant: "success", title: t("CUSTOMER_PAGE.ADDED_TO_CART"), message: product.name });
  };

  const updateCartQuantity = (productId: string, change: number) => {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.product._id !== productId) return [line];
        const quantity = Math.min(line.quantity + change, line.product.stock);
        return quantity > 0 ? [{ ...line, quantity }] : [];
      }),
    );
  };

  const cartTotal = cart.reduce((total, line) => total + line.product.price * line.quantity, 0);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 2,
        alignItems: "start",
      }}
    >
      <ProductCatalog
        source="catalog"
        catalog={catalog}
        categories={categories}
        productOrientation="horizontal"
        toolbar={
          <TableToolbar title={t("CUSTOMER_PAGE.PRODUCTS_TITLE")} subtitle={t("CUSTOMER_PAGE.PRODUCTS_DESCRIPTION")} />
        }
        renderActions={(product) => (
          <Button disabled={product.stock <= 0} onClick={() => addToCart(product)} fullWidth>
            {product.stock <= 0 ? t("CATALOG.OUT_OF_STOCK") : t("CUSTOMER_PAGE.ADD_TO_CART")}
          </Button>
        )}
      />

      {/* {showCart ? (
        <Card variant="outlined" sx={{ position: { md: "sticky" }, top: 90 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6" fontWeight={800}>
                {t("CUSTOMER_PAGE.CART_TITLE")} ({cart.reduce((count, line) => count + line.quantity, 0)})
              </Typography>
              {cart.length === 0 ? (
                <Typography color="text.secondary">{t("CUSTOMER_PAGE.CART_EMPTY")}</Typography>
              ) : (
                cart.map((line) => (
                  <Stack key={line.product._id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" noWrap>
                        {line.product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(line.product.price)} × {line.quantity}
                      </Typography>
                    </Box>
                    <IconButton size="small" aria-label={t("CUSTOMER_PAGE.REMOVE")} onClick={() => updateCartQuantity(line.product._id, -1)}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography fontWeight={700}>{line.quantity}</Typography>
                    <IconButton
                      size="small"
                      aria-label={t("CUSTOMER_PAGE.ADD_TO_CART")}
                      disabled={line.quantity >= line.product.stock}
                      onClick={() => updateCartQuantity(line.product._id, 1)}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))
              )}
              {cart.length > 0 ? (
                <>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700}>{t("CUSTOMER_PAGE.CART_TOTAL")}</Typography>
                    <Typography variant="h6" fontWeight={800} color="success.main">
                      {formatCurrency(cartTotal)}
                    </Typography>
                  </Stack>
                  <Button component={Link} href="/customer/checkout">
                    {t("ORDER_PAGE.PLACE_ORDER")}
                  </Button>
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null} */}
    </Box>
  );
}
