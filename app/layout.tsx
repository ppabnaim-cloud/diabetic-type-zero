import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diabetic Type Zero",
  description:
    "Image-based early detection across the diabetes course: metabolic skin signs of insulin resistance, infected diabetic foot ulcers, and wound healing progression. Research prototype.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
