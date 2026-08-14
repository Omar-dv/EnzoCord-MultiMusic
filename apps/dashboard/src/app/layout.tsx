import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EnzoCord Multi Music',
  description: 'Luxury Discord Multi-Bot Control Panel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-900 text-white min-h-screen antialiased selection:bg-electric-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
