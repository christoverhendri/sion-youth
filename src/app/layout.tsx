import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import Script from "next/script";
import { Backdrop, PointerEffects } from "@/components/effects";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";
import "./redesign.css";
import "./sion-ui.css";

const sans = Manrope({
  variable: "--font-sans-src",
  subsets: ["latin"],
});
const serif = Instrument_Serif({
  variable: "--font-serif-src",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  title: "Sion Youth",
  description: "Dashboard data jemaat, absensi, dan GDG Sion Youth",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Variabel font di <html> (bukan <body>) supaya bisa dibaca token tema Tailwind yang ada di :root
    <html lang="id" data-theme="dark" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Script id="tema" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <Backdrop />
        <PointerEffects />
        <div className="relative z-[1]">{children}</div>
      </body>
    </html>
  );
}
