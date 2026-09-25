import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REMITX | Cross-Border Settlement Network",
  description:
    "Programmable cross-border payments and settlement powered by Drunix.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}