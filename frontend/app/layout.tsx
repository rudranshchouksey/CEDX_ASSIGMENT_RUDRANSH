import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="min-h-screen p-4 md:p-6 lg:p-8 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
