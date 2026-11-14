import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563eb" },
    secondary: { main: "#0f172a" },
    success: { main: "#16a34a" },
    warning: { main: "#f59e0b" },
    error: { main: "#dc2626" },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: ["var(--font-geist-sans)", "Arial", "sans-serif"].join(","),
  },
});
