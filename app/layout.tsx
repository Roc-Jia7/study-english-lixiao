import type { Metadata, Viewport } from "next";
import { Baloo_2 } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Word Star Academy · 单词星球",
  description:
    "A gamified English vocabulary adventure for kids — feed your dragon, beat the forgetting curve!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // kids double-tap fast; avoid accidental zoom
  themeColor: "#1d1446",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} antialiased`}>{children}</body>
    </html>
  );
}
