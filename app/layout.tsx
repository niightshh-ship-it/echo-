import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getDictionary } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/provider";
import { BottomNav } from "@/components/bottom-nav";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://echo-brown-chi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Echo — skill exchange",
  description: "Trade skills with people near you. No money, just skills.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Echo", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Echo — skill exchange",
    description: "Trade skills with people near you. No money, just skills.",
    type: "website",
    siteName: "Echo",
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: "Echo" }],
  },
  twitter: {
    card: "summary",
    title: "Echo — skill exchange",
    description: "Trade skills with people near you. No money, just skills.",
    images: ["/icon.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dict } = await getDictionary();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider dict={dict} locale={locale}>
          {children}
          <BottomNav />
        </I18nProvider>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(20, 14, 40, 0.95)",
              border: "1px solid rgba(124, 92, 255, 0.3)",
              color: "white",
              backdropFilter: "blur(12px)",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
