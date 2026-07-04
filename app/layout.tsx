import type { Metadata } from "next";
import { ToastProvider } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/server';
import QueryProvider from '@/components/QueryProvider';
import "./globals.css";

export const metadata: Metadata = {
  title: "memu — communicate differently",
  description: "A different kind of communication platform",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize Supabase server client & get user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}