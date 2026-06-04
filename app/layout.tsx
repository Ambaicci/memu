import type { Metadata } from "next";
import { ToastProvider } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/server';
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
    <html lang="en">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased">
        <ToastProvider>
          {/* 
            `user` is now available server-side. 
            Pass it to client components via props or context if needed.
            Example: <AuthContextProvider user={user}>{children}</AuthContextProvider>
          */}
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}