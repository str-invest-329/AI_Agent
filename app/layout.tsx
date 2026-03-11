import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K-House · 研究工具",
  description: "K-House 研究工具平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="bg-[var(--bg-page)]">{children}</body>
    </html>
  );
}
