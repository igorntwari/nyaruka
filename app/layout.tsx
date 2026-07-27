import type { Metadata } from 'next';
import { Sora, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/lib/store';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['600', '700', '800'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700'] });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['500', '600'] });

export const metadata: Metadata = {
  title: 'Nyaruka',
  description: 'Affordable e-bicycle delivery for Kigali, on any phone.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
  <html lang="en">
  <body className={`${sora.variable} ${inter.variable} ${plexMono.variable} font-body`}>
    <StoreProvider>{children}</StoreProvider>
  </body>
  </html>
  );
}
