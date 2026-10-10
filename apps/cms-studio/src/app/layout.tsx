import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coding Club CMS Portal",
  description: "Centralized CMS Studio with role-based Git approval workflow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
