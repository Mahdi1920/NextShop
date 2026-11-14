"use client";

import { TextField, type TextFieldProps } from "@mui/material";

/** Shared text/select field that keeps the application's existing MUI styling. */
export function FormField(props: TextFieldProps) {
  return <TextField {...props} />;
}
