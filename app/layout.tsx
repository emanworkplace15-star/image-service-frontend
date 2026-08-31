import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { NavBar } from './nav-bar';
import { ToastProvider } from './toast-provider';

export const metadata: Metadata = {
  title: 'Image Service',
  description: 'Upload images, browse the gallery, inspect records',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main>{children}</main>
        <ToastProvider />
      </body>
    </html>
  );
}
