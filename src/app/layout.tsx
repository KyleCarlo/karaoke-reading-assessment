import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
// @ts-expect-error -- Next.js supports global CSS side-effect imports in app layout files.
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "Reading Assessment App",
  description: "Website to assess the reading skills and gaps of students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable}`}>{children}</body>
    </html>
  );
}
