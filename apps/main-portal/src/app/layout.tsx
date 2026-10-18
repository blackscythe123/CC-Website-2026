import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAllVerticals } from "@/lib/verticals";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "SSN Coding Club (CC) | 8 Engineering Verticals",
  description: "Official portal of SSN Coding Club showcasing our 8 autonomous technical verticals, engineering articles, workshops, and open-source projects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const verticals = getAllVerticals();
  const posts = getAllPosts();

  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="flex min-h-screen flex-col bg-[#FAF7EE] text-stone-900 antialiased font-sans selection:bg-[#F43F5E] selection:text-white">
        <Navbar verticals={verticals} posts={posts} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
