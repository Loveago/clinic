import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Action Boat Medical Centre / Homeopathy & Action Health College',
  description: 'Compassionate homeopathic & conventional healthcare and accredited caregiving & allied health education at Tema Michel Camp, Ghana.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}

