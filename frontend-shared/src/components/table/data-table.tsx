"use client";

import * as React from "react";
import {
  Paper,
  SxProps,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Theme,
  Typography,
} from "@mui/material";

export type Column<T> = {
  id?: string;
  header: React.ReactNode;
  key?: keyof T;
  className?: string;
  render?: (row: T) => React.ReactNode;
  hidden?: boolean;
  align?: "left" | "right" | "center";
  width?: number | string;
  headerSx?: SxProps<Theme>;
  cellSx?: SxProps<Theme>;
};

export type DataTableProps<T> = {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey?: (row: T, index: number) => string | number;
  emptyState?: React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyState = "No data",
}: DataTableProps<T>) {
  const visibleColumns = React.useMemo(
    () => columns.filter((c) => !c.hidden),
    [columns],
  );

  return (
    <TableContainer component={Paper} elevation={1}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {visibleColumns.map((c, idx) => (
              <TableCell
                key={c.id ?? idx}
                align={c.align}
                sx={{ fontWeight: 600, width: c.width, ...c.headerSx }}
              >
                {c.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length || 1} align="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {emptyState}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={rowKey ? rowKey(row, index) : index} hover>
                {visibleColumns.map((c, idx) => (
                  <TableCell key={c.id ?? idx} align={c.align} sx={c.cellSx}>
                    {c.render ? c.render(row) : c.key ? (row as any)[c.key] : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
