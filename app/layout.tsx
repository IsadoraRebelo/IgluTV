import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';

import { Footer, Toaster } from '@/components';
import { NavBar } from '@/components/NavBar/NavBar';
import { ViewerProvider } from '@/components/ViewerProvider/ViewerProvider';

import { getViewer } from '@/services/viewer';

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
  appleWebApp: {
    capable: true,
    title: 'IgluTV',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#14181c',
  colorScheme: 'dark',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewerPromise = getViewer();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolageGrotesque.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ViewerProvider viewerPromise={viewerPromise}>
          <Toaster />
          <NavBar />
          {children}
          <Footer />
        </ViewerProvider>
      </body>
    </html>
  );
}
