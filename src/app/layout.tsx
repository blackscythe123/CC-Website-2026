import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Coding Club CMS | Git-Backed Publishing Platform",
  description: "A simple Next.js and Decap CMS portal allowing non-tech club members to write and publish articles directly to GitHub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
