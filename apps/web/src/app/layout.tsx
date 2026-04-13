import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Purleads — AI Outbound Email Platform",
  description: "Multi-tenant AI-powered outbound email automation platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
