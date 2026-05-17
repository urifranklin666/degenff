import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const viewport: Viewport = {
  themeColor: "#cc0000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://degeneratefuckface.com"),
  title: {
    default: "degeneratefuckface.com — submissions, feats, and other indecencies",
    template: "%s · degeneratefuckface.com",
  },
  description:
    "An eclectic platform for artist submissions, coding feats, and a Discord-integrated cult of weirdos. Hand-built. Self-hosted. Edge-to-edge.",
  applicationName: "degeneratefuckface.com",
  authors: [{ name: "deadplug", url: "https://deadplug.digital" }],
  openGraph: {
    type: "website",
    siteName: "degeneratefuckface.com",
    title: "degeneratefuckface.com",
    description:
      "Submit a work. Show a feat. Loiter in the Discord. Built ground-up on infrastructure we own.",
    url: "https://degeneratefuckface.com/",
  },
  twitter: {
    card: "summary_large_image",
    title: "degeneratefuckface.com",
    description: "Submit a work. Show a feat. Loiter in the Discord.",
  },
  icons: { icon: "/mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <div className="bloom" aria-hidden />
        <div className="grid-bg" aria-hidden />
        <div className="scanlines" aria-hidden />
        <div className="page">
          <Nav />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
