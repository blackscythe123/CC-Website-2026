import type { Metadata } from 'next';
import SiteNavbar from '../components/SiteNavbar';
import HeadingReveal from '../components/HeadingReveal';
import './globals.css';
import '@coding-club/scrapbook-ui/scrapbook.css';
import '@coding-club/scrapbook-ui/responsive.css';
import '@coding-club/scrapbook-ui/vertical-portal.css';
import './verticals-interaction.css';
import './about-letter.css';

export const metadata: Metadata = {
  title: 'SSN Coding Club | Build. Learn. Repeat.',
  description: 'A community for curious minds who build.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HeadingReveal />
        <SiteNavbar />
        {children}
      </body>
    </html>
  );
}
