"use client";

import * as React from "react";
import { Alert, Chip, Container, LinearProgress, MenuItem, Pagination, Stack, TextField, Typography } from "@mui/material";
import { ordersApi, type AdminOrder } from "@shared/api/orders";
import { RequireAuth } from "@shared/components/auth/RequireAuth";
import { DataTable, type Column } from "@shared/components/table/data-table";
import { TableToolbar } from "@shared/components/table/table-toolbar";
import { useSocket } from "@shared/context/socket-context";
import { UserRole } from "@shared/enums";
import { formatCurrency } from "@shared/lib/date-utils";

const PAGE_SIZE = 10;
const STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "EXCHANGING", "RETURNING", "CANCELLED"];
const STATUS_COLORS: Record<string, "warning" | "info" | "secondary" | "success" | "error" | "default"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  PREPARING: "info",
  OUT_FOR_DELIVERY: "secondary",
  DELIVERED: "success",
  EXCHANGING: "info",
  RETURNING: "warning",
  CANCELLED: "error",
};

export default function AdminOrdersPage() {
  const { onEvent } = useSocket();
  const [orders, setOrders] = React.useState<AdminOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [page, setPage] = React.useState(1);

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await ordersApi.getAdminRecentOrders(100));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  React.useEffect(() => {
    const unsubscribeCreated = onEvent("order:created", () => void loadOrders());
    const unsubscribeUpdated = onEvent("order:status_updated", () => void loadOrders());
    const unsubscribeDashboard = onEvent("dashboard:refresh:admin", () => void loadOrders());
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDashboard();
    };
  }, [loadOrders, onEvent]);

  const filteredOrders = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "ALL" && order.status !== status) return false;
      if (!search) return true;
      return [order._id, order.customerId?.fullname, order.customerId?.email, ...order.items.map((item) => item.name)]
        .some((value) => value?.toLowerCase().includes(search));
    });
  }, [orders, query, status]);

  React.useEffect(() => setPage(1), [query, status]);

  const columns = React.useMemo<Column<AdminOrder>[]>(() => [
    {
      id: "number",
      header: "Order",
      render: (order) => <Typography variant="body2" fontWeight={700}>#{order._id.slice(-8)}</Typography>,
    },
    {
      id: "customer",
      header: "Customer",
      render: (order) => (
        <Stack>
          <Typography variant="body2" fontWeight={600}>{order.customerId?.fullname ?? "—"}</Typography>
          <Typography variant="caption" color="text.secondary">{order.customerId?.email ?? ""}</Typography>
        </Stack>
      ),
    },
    {
      id: "items",
      header: "Items",
      render: (order) => <Typography variant="body2">{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</Typography>,
    },
    {
      id: "total",
      header: "Total",
      render: (order) => <Typography variant="body2" fontWeight={700}>{formatCurrency(order.total)}</Typography>,
    },
    {
      id: "status",
      header: "Status",
      render: (order) => <Chip size="small" label={order.status.replace(/_/g, " ")} color={STATUS_COLORS[order.status] ?? "default"} />,
    },
    {
      id: "payment",
      header: "Payment",
      render: (order) => <Typography variant="body2">{order.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on delivery" : "Bank card"}</Typography>,
    },
    {
      id: "date",
      header: "Date",
      render: (order) => <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>{new Date(order.createdAt).toLocaleDateString()}</Typography>,
    },
  ], []);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pageOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <RequireAuth roles={[UserRole.ADMIN]} unauthorizedRedirectTo="/auth/sign-in">
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack spacing={2}>
          <TableToolbar title="Orders" subtitle="Review the latest 100 orders across the store." />
          {loading ? <LinearProgress /> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Search orders" size="small" value={query} onChange={(event) => setQuery(event.target.value)} fullWidth />
            <TextField select label="Status" size="small" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: { sm: 220 } }}>
              <MenuItem value="ALL">All statuses</MenuItem>
              {STATUSES.map((item) => <MenuItem key={item} value={item}>{item.replace(/_/g, " ")}</MenuItem>)}
            </TextField>
          </Stack>
          <DataTable rows={pageOrders} columns={columns} rowKey={(order) => order._id} emptyState={loading ? "Loading orders…" : "No orders found."} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">{filteredOrders.length} orders</Typography>
            <Pagination count={pageCount} page={page} onChange={(_event, value) => setPage(value)} color="primary" />
          </Stack>
        </Stack>
      </Container>
    </RequireAuth>
  );
}
