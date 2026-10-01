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
      </body>
    </html>
  );
}
