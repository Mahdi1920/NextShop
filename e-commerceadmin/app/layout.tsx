import type { Metadata } from "next";
import "./globals.css";
import { AdminProviders } from "./providers";

export const metadata: Metadata = {
  title: "NextShop Admin",
  description: "Administration for NextShop",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
