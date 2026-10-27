import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import PresenterControl from "@/components/PresenterControl";
import { DemoScenarioProvider } from "@/components/demo";
import { Ger4kStoreProvider } from "@/components/state/Ger4kStore";
import { GerakKhasProvider, GerakKhasMount } from "@/components/gerak-khas";
import { StationSheet } from "@/components/pulse/StationSheet";
import { PrototypeAlertBanner } from "@/components/alerts/alerts";
import "./globals.css";

/*
 * GER4K sans typeface (Inter via next/font, self-hosted, no layout shift),
 * exposed as `--font-inter` and mapped to Tailwind's `font-sans`.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GER4K — Klang Valley journeys, planned and recovered",
  description:
    "GER4K helps Klang Valley commuters plan, compare and recover their public-transport journeys.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F8FA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/*
          Client state boundary: Demo_Scenario (presenter-controlled simulated
          disruption) + the local prototype store (saved journeys, points,
          preferences). Global overlays — station sheet and prototype alert —
          render once here so every screen can use them.
        */}
        <DemoScenarioProvider>
          <Ger4kStoreProvider>
            <GerakKhasProvider>
              {children}
              <GerakKhasMount />
              <StationSheet />
            <PrototypeAlertBanner />
            {/* Gated demo toolbar. Suspense boundary required for useSearchParams. */}
            <Suspense fallback={null}>
              <PresenterControl />
            </Suspense>
            </GerakKhasProvider>
          </Ger4kStoreProvider>
        </DemoScenarioProvider>
      </body>
    </html>
  );
}


