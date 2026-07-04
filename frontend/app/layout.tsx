import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CEDX Governance Operator SPA',
  description: 'CEDX Next.js Real-Time Observability Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`light ${inter.variable}`}>
      <body className="min-h-screen p-0 m-0 flex flex-col font-sans bg-[#fafafa] text-zinc-900 selection:bg-zinc-200">
        {children}
      </body>
    </html>
  );
}
