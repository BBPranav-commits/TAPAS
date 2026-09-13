import type { Metadata } from 'next';
import "./globals.css";
import Navigation from '@/components/Navigation';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'TAPAS',
  description: 'Region-specific thermal shelter design tool for thermal comfort analysis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <div className="flex min-h-screen">
            <Navigation />
            <main className="flex-1 overflow-auto">
              <div className="max-w-[1400px] mx-auto p-6">
                {children}
              </div>
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
