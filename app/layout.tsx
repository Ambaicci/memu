import type { Metadata } from "next";
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/server';
import QueryProvider from '@/components/QueryProvider';
import "./globals.css";

export const metadata: Metadata = {
  title: "memu — communicate differently",
  description: "A different kind of communication platform",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            {/* Wrapping your entire app in the caching engine! */}
            <QueryProvider>
              {children}
            </QueryProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}