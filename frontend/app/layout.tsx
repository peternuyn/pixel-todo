import type { Metadata } from "next";
import { Press_Start_2P, VT323, Pixelify_Sans, Silkscreen, Jersey_10 } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify",
  display: "swap",
});

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
  display: "swap",
});

const jersey = Jersey_10({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-jersey",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meowdow Study Farm",
  description: "A cozy pixel-art study room with your farm cat companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${pressStart.variable} ${vt323.variable} ${pixelify.variable} ${silkscreen.variable} ${jersey.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
