import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Chess Game with Music Player',
  description: 'A multiplayer chess game with integrated music player built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
