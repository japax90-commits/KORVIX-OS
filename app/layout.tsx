import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { preferencesScript } from "@/lib/theme/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F5F9" },
    { media: "(prefers-color-scheme: dark)", color: "#09101F" },
  ],
};

export const metadata: Metadata = {
  title: "KORVIX OS",
  description: "Sistema operacional interno da Korvix Digital",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
