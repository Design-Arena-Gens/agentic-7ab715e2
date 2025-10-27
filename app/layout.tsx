import type { Metadata } from "next";
import "./globals.css";
import { Cinzel, Inter } from "next/font/google";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cinzel"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Summit of Dawn — Everest Cinematic Journal",
  description:
    "An immersive 60-second cinematic chronicle of a climber's ascent to the Everest summit, rendered as a living storyboard."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
