"use client";

import * as React from "react";
import { Alert, Box, Container, LinearProgress, Stack, Typography } from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CancelIcon from "@mui/icons-material/Cancel";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import MoneyIcon from "@mui/icons-material/Money";
import { categoriesApi } from "@shared/api/categories";
import { ordersApi, type AdminStatsResponse } from "@shared/api/orders";
import { productsApi } from "@shared/api/products";
import { usersApi } from "@shared/api/users";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { DateRangeFilter } from "@shared/components/ui/date-range-filter";
import { StatCard } from "@shared/components/ui/stat-card";
import { InteractiveStatisticsChart } from "@shared/components/dashboard/interactive-statistics-chart";
import { UserDistributionPieChart } from "@shared/components/dashboard/user-distribution-pie-chart";
import { toDateRangeFilterProps, useDateRangeFilter } from "@shared/hooks/useDateRangeFilter";
import { formatCurrency, formatDisplayDate } from "@shared/lib/date-utils";
import { useSocket } from "@shared/context/socket-context";
import { UserRole } from "@shared/enums";
import { useLocale, useTranslations } from "@shared/context/locale-context";

export default function AdminHomePage() {
  const t = useTranslations();
  const { locale } = useLocale();
  const { onEvent } = useSocket();
  const periodFilter = useDateRangeFilter("today");
  const { from, to } = periodFilter.activeRange;
  const [usersByRole, setUsersByRole] = React.useState<Record<UserRole, number>>({
    [UserRole.ADMIN]: 0,
    [UserRole.SELLER]: 0,
    [UserRole.CUSTOMER]: 0,
  });
  const [totalUsers, setTotalUsers] = React.useState<number | null>(null);
  const [sellerStatusCounts, setSellerStatusCounts] = React.useState({ approved: 0, pending: 0, rejected: 0, other: 0 });
  const [connectedUsers, setConnectedUsers] = React.useState<number | null>(null);
  const [allTimeCounts, setAllTimeCounts] = React.useState({
    totalProducts: null as number | null,
    outOfStockProducts: null as number | null,
    totalCategories: null as number | null,
    pendingSellers: null as number | null,
  });
  const [userSignupsByMonth, setUserSignupsByMonth] = React.useState<Array<{ date: string; signups: number }>>([]);
  const [stats, setStats] = React.useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadPlatformCards = React.useCallback(async () => {
    try {
      const [users, onlineCount, categories, allProducts, outOfStockProducts] = await Promise.all([
        usersApi.list(),
        usersApi.connectedCount(),
        categoriesApi.list(),
        productsApi.listAdmin({ page: 1, limit: 1 }),
        productsApi.listAdmin({ inStock: false, page: 1, limit: 1 }),
      ]);
      setTotalUsers(users.length);
      setUsersByRole({
        [UserRole.ADMIN]: users.filter((user) => user.role === UserRole.ADMIN).length,
        [UserRole.SELLER]: users.filter((user) => user.role === UserRole.SELLER).length,
        [UserRole.CUSTOMER]: users.filter((user) => user.role === UserRole.CUSTOMER).length,
      });
      const sellerUsers = users.filter((user) => user.role === UserRole.SELLER);
      setSellerStatusCounts(sellerUsers.reduce((counts, seller) => {
        const status = seller.sellerProfile?.status?.toUpperCase();
        if (status === "APPROVED") counts.approved += 1;
        else if (status === "PENDING") counts.pending += 1;
        else if (status === "REJECTED") counts.rejected += 1;
        else counts.other += 1;
        return counts;
      }, { approved: 0, pending: 0, rejected: 0, other: 0 }));
      setAllTimeCounts({
        totalProducts: allProducts.total,
        outOfStockProducts: outOfStockProducts.total,
        totalCategories: categories.length,
        pendingSellers: sellerUsers.filter((seller) => seller.sellerProfile?.status?.toUpperCase() === "PENDING").length,
      });
      setConnectedUsers(onlineCount);
      const currentMonth = new Date();
      const months = Array.from({ length: 12 }, (_, index) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11 + index, 1));
      const signupCounts = new Map<string, number>();
      for (const month of months) {
        signupCounts.set(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`, 0);
      }
      for (const user of users) {
        if (!user.createdAt) continue;
        const createdAt = new Date(user.createdAt);
        if (!Number.isFinite(createdAt.getTime())) continue;
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
        if (signupCounts.has(monthKey)) signupCounts.set(monthKey, (signupCounts.get(monthKey) ?? 0) + 1);
      }
      setUserSignupsByMonth(Array.from(signupCounts, ([date, signups]) => ({ date, signups })));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("ADMIN_PAGE.METRICS_ERROR"));
    }
  }, [t]);

  const loadOrderCards = React.useCallback(async () => {
    setLoading(true);
    try {
      setStats(await ordersApi.getAdminStats({ from, to }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("ADMIN_PAGE.METRICS_ERROR"));
    } finally {
      setLoading(false);
    }
  }, [from, t, to]);

  React.useEffect(() => {
    void loadPlatformCards();
  }, [loadPlatformCards]);

  React.useEffect(() => {
    void loadOrderCards();
  }, [loadOrderCards]);

  React.useEffect(() => {
    const refreshAll = () => {
      void loadPlatformCards();
      void loadOrderCards();
    };
    const unsubscribeUser = onEvent("user:signup", () => void loadPlatformCards());
    const unsubscribeSeller = onEvent("seller:signup", () => void loadPlatformCards());
    const unsubscribeCategory = onEvent("category:changed", () => void loadPlatformCards());
    const unsubscribePresence = onEvent("presence:update", (data: { count?: number }) => {
      if (typeof data?.count === "number") setConnectedUsers(data.count);
    });
    const unsubscribeOrder = onEvent("order:created", refreshAll);
    const unsubscribeStatus = onEvent("order:status_updated", refreshAll);
    const unsubscribeProduct = onEvent("product:changed", () => void loadPlatformCards());
    const unsubscribeStock = onEvent("product:out_of_stock", () => void loadPlatformCards());

    return () => {
      unsubscribeUser();
      unsubscribeSeller();
      unsubscribeCategory();
      unsubscribePresence();
      unsubscribeOrder();
      unsubscribeStatus();
      unsubscribeProduct();
      unsubscribeStock();
    };
  }, [loadPlatformCards, loadOrderCards, onEvent]);

  const value = (number: number | undefined) => number ?? "—";
  const allTimeCards = [
    { label: t("ADMIN_PAGE.TOTAL_PRODUCTS"), value: allTimeCounts.totalProducts ?? "â€”", icon: <Inventory2Icon />, color: "#8b5cf6", href: "/products" },
    { label: t("ADMIN_PAGE.OUT_OF_STOCK_PRODUCTS"), value: allTimeCounts.outOfStockProducts ?? "â€”", icon: <Inventory2Icon />, color: allTimeCounts.outOfStockProducts ? "#ef4444" : "#94a3b8" },
    { label: t("ADMIN_PAGE.TOTAL_CATEGORIES"), value: allTimeCounts.totalCategories ?? "â€”", icon: <CategoryIcon />, color: "#0ea5e9", href: "/categories" },
  ];
  const overviewCards = [
    { label: t("ADMIN_PAGE.TOTAL_ORDERS"), value: value(stats?.totalOrders), icon: <ShoppingCartIcon />, color: "#3b82f6" },
    { label: t("ADMIN_PAGE.TOTAL_REVENUE"), value: stats ? formatCurrency(stats.totalRevenue) : "—", icon: <AttachMoneyIcon />, color: "#22c55e" },
  ];
  const statusCards = [
    { key: "PENDING", label: t("ORDER_PAGE.STATUS_PENDING"), icon: <HourglassEmptyIcon />, color: "#f59e0b" },
    { key: "CONFIRMED", label: t("ORDER_PAGE.STATUS_CONFIRMED"), icon: <CheckCircleIcon />, color: "#16a34a" },
    { key: "PREPARING", label: t("ORDER_PAGE.STATUS_PREPARING"), icon: <PendingActionsIcon />, color: "#3b82f6" },
    { key: "OUT_FOR_DELIVERY", label: t("ORDER_PAGE.STATUS_OUT_FOR_DELIVERY"), icon: <LocalShippingIcon />, color: "#8b5cf6" },
    { key: "DELIVERED", label: t("ORDER_PAGE.STATUS_DELIVERED"), icon: <CheckCircleIcon />, color: "#22c55e" },
    { key: "EXCHANGING", label: t("ORDER_PAGE.STATUS_EXCHANGING"), icon: <SwapHorizIcon />, color: "#0284c7" },
    { key: "RETURNING", label: t("ORDER_PAGE.STATUS_RETURNING"), icon: <AssignmentReturnIcon />, color: "#f97316" },
    { key: "CANCELLED", label: t("ORDER_PAGE.STATUS_CANCELLED"), icon: <CancelIcon />, color: "#ef4444" },
  ] as const;
  const paymentCards = [
    { label: t("ORDER_PAGE.CASH_ON_DELIVERY"), value: value(stats?.paymentMethods.CASH_ON_DELIVERY), icon: <MoneyIcon />, color: "#10b981" },
    { label: t("ORDER_PAGE.BANK_CARD"), value: value(stats?.paymentMethods.BANK_CARD), icon: <CreditCardIcon />, color: "#6366f1" },
  ];

  const renderCards = (cards: Array<{ label: string; value: string | number; icon: React.ReactNode; color: string; href?: string; badge?: string; badgeColor?: "warning" }>, columns = 4) => (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: `repeat(${columns}, 1fr)` } }}>
      {cards.map((card) => <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} borderColor={card.color} href={card.href} badge={card.badge} badgeColor={card.badgeColor} />)}
    </Box>
  );

  return (
    <RequireAuth roles={[UserRole.ADMIN]} unauthorizedRedirectTo="/auth/sign-in">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>{t("ADMIN_PAGE.TITLE")}</Typography>
            <Typography color="text.secondary">{t("ADMIN_PAGE.STATISTICS_FOR")} {formatDisplayDate(from)} – {formatDisplayDate(to)}</Typography>
          </Box>
          
          {loading ? <LinearProgress /> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Typography variant="h5" fontWeight={800}>{t("ADMIN_PAGE.ALL_TIME_OVERVIEW")}</Typography>
          <Box sx={{ display: "grid", gap: 2, alignItems: "stretch", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
            <UserDistributionPieChart data={[
              { label: t("ADMIN_PAGE.CUSTOMERS"), value: usersByRole[UserRole.CUSTOMER], color: "#2563eb" },
              { label: t("ADMIN_PAGE.SELLERS"), value: usersByRole[UserRole.SELLER], color: "#16a34a", breakdown: [
                { label: t("ADMIN_PAGE.APPROVED"), value: sellerStatusCounts.approved },
                { label: t("ADMIN_PAGE.PENDING"), value: sellerStatusCounts.pending },
                { label: t("ADMIN_PAGE.REJECTED"), value: sellerStatusCounts.rejected },
                ...(sellerStatusCounts.other ? [{ label: t("ADMIN_PAGE.OTHER"), value: sellerStatusCounts.other }] : []),
              ] },
              { label: t("ADMIN_PAGE.ADMINS"), value: usersByRole[UserRole.ADMIN], color: "#f59e0b" },
            ]} totalUsers={totalUsers} connectedUsers={connectedUsers} pendingSellerRequests={allTimeCounts.pendingSellers} />
            <InteractiveStatisticsChart
              title={t("ADMIN_PAGE.USER_SIGNUPS_PER_MONTH")}
              data={userSignupsByMonth}
              defaultChartType="bar"
              formatDate={(date) => {
                const [year, month] = date.split("-").map(Number);
                return new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
              }}
              series={[{ key: "signups", label: t("ADMIN_PAGE.USERS"), color: "#2563eb", value: (point) => point.signups }]}
            />
          </Box>
          {renderCards(allTimeCards)}
          <Typography variant="h5" fontWeight={800}>{t("ADMIN_PAGE.PERIOD_OVERVIEW")}</Typography>
          <DateRangeFilter {...toDateRangeFilterProps(periodFilter)} />
          <Typography variant="h6" fontWeight={700}>{t("ADMIN_PAGE.ORDERS_REVENUE_PRODUCTS")}</Typography>
          {renderCards(overviewCards)}
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
            <InteractiveStatisticsChart
              title={t("ADMIN_PAGE.ORDERS_OVER_TIME")}
              data={stats?.daily ?? []}
              series={[{ key: "orders", label: t("NAVBAR.ORDERS"), color: "#2563eb", value: (point) => Number(point.totalOrders ?? 0) }]}
            />
            <InteractiveStatisticsChart
              title={t("ADMIN_PAGE.REVENUE_OVER_TIME")}
              data={stats?.daily ?? []}
              series={[{ key: "revenue", label: t("ADMIN_PAGE.TOTAL_REVENUE"), color: "#16a34a", value: (point) => Number(point.revenue ?? 0), format: (amount) => formatCurrency(amount) }]}
            />
          </Box>
          <Typography variant="h6" fontWeight={700}>{t("ADMIN_PAGE.ORDER_STATUSES")}</Typography>
          {renderCards(statusCards.map((card) => ({
            label: card.label,
            value: value(stats?.statuses[card.key]),
            icon: card.icon,
            color: card.color,
          })), 4)}
          <Typography variant="h6" fontWeight={700}>{t("ADMIN_PAGE.PAYMENT_METHODS")}</Typography>
          {renderCards(paymentCards, 2)}
        </Stack>
      </Container>
    </RequireAuth>
  );
}
