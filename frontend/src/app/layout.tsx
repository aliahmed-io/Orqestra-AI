import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import { MotionConfig } from "motion/react";
import "./globals.css";
import { DatasetProvider } from "@/components/layout/DatasetContext";
import { AppShell } from "@/components/layout/AppShell";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orqestra AI — Enterprise Process Intelligence",
  description:
    "Discover actual business process paths, measure stage waiting bottlenecks, compare variants, and predict case delays.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-porcelain text-ink antialiased">
        <MotionConfig reducedMotion="user">
          <DatasetProvider>
            <AppShell>{children}</AppShell>
          </DatasetProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
