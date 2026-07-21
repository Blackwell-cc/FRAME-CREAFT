import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FRAME / CRAFT",
  description: "Personal production reference and deterministic AI prompt builder.",
  manifest: "/manifest.webmanifest",
  themeColor: "#050505",
  openGraph: {
    title: "FRAME / CRAFT",
    description: "Production reference และ Prompt Builder ส่วนตัวสำหรับภาพนิ่งและวิดีโอ",
    type: "website",
    locale: "th_TH",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
