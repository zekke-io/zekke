import type { Metadata } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import AppProviders from "@/components/session/AppProviders";
import StagingBanner from "@/components/shell/StagingBanner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zekke - Secure Your Data",
  description: "Securely store and manage your sensitive data with Zekke.",
  other: { google: "notranslate" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isStaging = process.env.NEXT_PUBLIC_ENV === "development";

  return (
    <html lang="en" translate="no" data-staging={isStaging ? "" : undefined}>
      <body
        className={`${nunito.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <StagingBanner />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
