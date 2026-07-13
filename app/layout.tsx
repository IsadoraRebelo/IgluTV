import { Inter, Bricolage_Grotesque } from 'next/font/google';

import type { Metadata } from 'next';
import { NavBar, Toaster } from '@/components';

import './globals.css';

const geistSans = Inter({
  variable: '--font-inter-sans',
  subsets: ['latin'],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: '--font-bricolage-grotesque-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'IgluTV',
  description: 'IgluTV - Your personalized TV show tracker',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolageGrotesque.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Toaster />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
