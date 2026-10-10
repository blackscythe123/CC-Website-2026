import type { Metadata } from "next";
import "./globals.css";
import portalConfig from "../../portal.config.json";

export const metadata: Metadata = {
  title: `${portalConfig.name} | SSN Coding Club`,
  description: portalConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black antialiased selection:bg-black selection:text-white">
        <header className="border-b border-black">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-black uppercase tracking-widest bg-black text-white px-2 py-0.5">
                CC // {portalConfig.verticalSlug}
              </span>
              <span className="font-mono text-xs text-neutral-500 hidden sm:inline">
                {portalConfig.domain}
              </span>
            </div>
            <nav className="flex items-center gap-4 font-mono text-xs">
              <a
                href="/"
                className="hover:underline font-bold uppercase tracking-wider"
              >
                Index
              </a>
              <a
                href="https://codingclub.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-neutral-500 hover:text-black uppercase tracking-wider"
              >
                Main Portal ↗
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="border-t border-black py-8 mt-20 font-mono text-xs text-neutral-500">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              © 2026 SSN Coding Club // {portalConfig.name}
            </div>
            <div>
              Standardized Monochrome Portal Template
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
