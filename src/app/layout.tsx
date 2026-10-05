import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Cabecera from "@/components/Cabecera";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Suite de Ingeniería", template: "%s · Suite de Ingeniería" },
  description: "Estudios de ingeniería con memoria de cálculo lista para firma.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Cabecera />
        {children}
        <footer className="no-print border-t border-linea">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-zinc-500 sm:px-6">
            <span>Suite de Ingeniería · Memorias de cálculo para México</span>
            <span>Los resultados deben revisarse y firmarse por un ingeniero responsable.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
