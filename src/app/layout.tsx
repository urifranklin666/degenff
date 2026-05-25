import type { Metadata, Viewport } from "next";
import { Anton, Playfair_Display, IBM_Plex_Mono, Big_Shoulders } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TeethRain from "@/components/TeethRain";
import Heartbeat from "@/components/Heartbeat";
import ClassificationBanner from "@/components/ClassificationBanner";
import ScrollGlitch from "@/components/ScrollGlitch";

// Anton — ultra-condensed brutal sans for slam headlines
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

// Playfair Display Black Italic — menace serif counterpoint
const playfair = Playfair_Display({
  weight: ["900"],
  style: ["italic", "normal"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// IBM Plex Mono — operator-cult bones (kept)
const plexMono = IBM_Plex_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

// Big Shoulders Display — variable wght 100-900, kinetic display companion to Anton
const shoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-shoulders",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#cc0000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://degeneratefuckface.com"),
  title: {
    default: "degeneratefuckface.com — STEP RIGHT UP",
    template: "%s · degeneratefuckface.com",
  },
  description:
    "A multimedia drop-zone, a coding-feats display case, and a Discord-integrated cult of weirdos. Tabloid trash with the lights on. Self-hosted, ground-up, edge-to-edge.",
  applicationName: "degeneratefuckface.com",
  authors: [{ name: "deadplug", url: "https://deadplug.digital" }],
  openGraph: {
    type: "website",
    siteName: "degeneratefuckface.com",
    title: "degeneratefuckface.com — STEP RIGHT UP",
    description: "Submit a work. Show a feat. Loiter in the Discord. Grand prize: a feeling.",
    url: "https://degeneratefuckface.com/",
  },
  twitter: {
    card: "summary_large_image",
    title: "degeneratefuckface.com — STEP RIGHT UP",
    description: "Tabloid trash with the lights on.",
  },
  icons: { icon: "/mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${anton.variable} ${playfair.variable} ${plexMono.variable} ${shoulders.variable}`}
    >
      <body>
        <div className="bloom" aria-hidden />
        <div className="grid-bg" aria-hidden />
        <div className="grime" aria-hidden />
        <TeethRain count={22} />
        <div className="scanlines" aria-hidden />
        <div className="border-pulse" aria-hidden />
        <div className="page">
          <ClassificationBanner />
          <Nav />
          <main>{children}</main>
          <Footer />
        </div>
        <Heartbeat />
        <ScrollGlitch />
      </body>
    </html>
  );
}
