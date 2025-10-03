import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kancelaria Faktury - System Fakturowania",
  description: "Profesjonalny system do wystawiania faktur dla kancelarii prawnych i firm usługowych",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        suppressHydrationWarning
        className="font-sans antialiased"
      >
        {children}
      </body>
    </html>
  );
}
