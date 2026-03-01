import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Het Kookboek van Joost",
  description: "Mijn persoonlijke receptenverzameling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
