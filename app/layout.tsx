import type { Metadata, Viewport } from "next";
import "@fontsource-variable/jost/wght.css";
import "./globals.css";
import { SiteShell } from "./components/SiteShell";
import { absoluteSiteUrl, siteUrl } from "./lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zeyu Ren - Product Motion Designer",
    template: "Zeyu Ren - %s",
  },
  description:
    "Product motion design focused on interaction, motion systems, and launch storytelling.",
  applicationName: "Zeyu Ren Product Motion Portfolio",
  authors: [{ name: "Zeyu Ren", url: siteUrl }],
  creator: "Zeyu Ren",
  openGraph: {
    type: "website",
    url: absoluteSiteUrl("/work/"),
    siteName: "Zeyu Ren",
    title: "Zeyu Ren - Product Motion Designer",
    description:
      "Selected product motion, interaction, and motion systems work.",
    images: [{ url: absoluteSiteUrl("/og.jpg"), width: 1916, height: 1080 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeyu Ren - Product Motion Designer",
    description:
      "Selected product motion, interaction, and motion systems work.",
    images: [absoluteSiteUrl("/og.jpg")],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f2" },
    { media: "(prefers-color-scheme: dark)", color: "#181918" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
