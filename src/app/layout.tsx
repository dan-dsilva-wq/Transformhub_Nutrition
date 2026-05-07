import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { AppStateProvider } from "@/lib/state/app-state";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const lexendDisplay = Lexend({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://transformhub.app"),
  title: "Transform Hub — Performance Nutrition",
  description:
    "Engineered nutrition tracking for high performers. Log meals in seconds, see your numbers, and let the system pace your transformation.",
  applicationName: "Transform Hub",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Transform Hub — Performance Nutrition",
    description:
      "Engineered nutrition tracking for high performers. Built for the few who measure what matters.",
    url: "/",
    siteName: "Transform Hub",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "Transform Hub",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#001a26",
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
      className={`${lexend.variable} ${lexendDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full text-ink font-body" suppressHydrationWarning>
        <PwaRegister />
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
