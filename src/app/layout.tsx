import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Poppins is The Celebration Society's own typeface (it is what
// thecelebrationsociety.com.au loads). Geometric, friendly, and its heavy
// weights hold up as the big numbers on a warehouse screen.
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Warehouse Today — The Celebration Society",
  description: "Daily warehouse operations dashboard for The Celebration Society.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f2e9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={poppins.variable}>
      <body className="min-h-screen bg-ivory text-ink antialiased">{children}</body>
    </html>
  );
}
