import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { AppStateProvider } from "@/lib/state/app-state";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pace-nutrition.vercel.app"),
  title: "Pace - your weight-loss partner",
  description:
    "Pace is a calm, photo-first nutrition app for busy adults. Snap a meal, see the next good move, lose weight at your own pace.",
  applicationName: "Pace",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pace - your weight-loss partner",
    description:
      "Calm, photo-first nutrition tracking for busy adults losing weight at their own pace.",
    url: "/",
    siteName: "Pace",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "Pace",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full text-ink font-body">
        <PwaRegister />
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
