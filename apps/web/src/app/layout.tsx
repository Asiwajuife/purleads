import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Purleads — AI Outbound Email Platform",
  description: "Multi-tenant AI-powered outbound email automation platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..700;1,14..32,300..400&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
