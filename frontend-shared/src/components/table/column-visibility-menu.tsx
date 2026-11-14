"use client";

import * as React from "react";
import {
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";

import { Button } from "@shared/components/ui/button";

export type ColumnVisibilityItem = {
  id: string;
  label: string;
  canHide?: boolean;
};

export type ColumnVisibilityMenuProps = {
  items: ColumnVisibilityItem[];
  hiddenIds: string[];
  onHiddenIdsChange: (hiddenIds: string[]) => void;
  buttonText?: string;
};

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function ColumnVisibilityMenu({
  items,
  hiddenIds,
  onHiddenIdsChange,
  buttonText = "Columns",
}: ColumnVisibilityMenuProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Button variant="secondary" onClick={(e) => setAnchorEl(e.currentTarget)}>
        {buttonText}
      </Button>

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Show / hide columns
        </Typography>
        <Divider />
        {items.map((item) => {
          const canHide = item.canHide ?? true;
          const checked = !hiddenIds.includes(item.id);

          return (
            <MenuItem
              key={item.id}
              disabled={!canHide}
              onClick={() => {
                if (!canHide) return;
                onHiddenIdsChange(toggleId(hiddenIds, item.id));
              }}
              dense
            >
              <Checkbox checked={checked} size="small" />
              <ListItemText primary={item.label} />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
