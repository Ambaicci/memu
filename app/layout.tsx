import type { Metadata } from "next";
import { ToastProvider } from '@/contexts/ToastContext';
import "./globals.css";

export const metadata: Metadata = {
  title: "memu — communicate differently",
  description: "A different kind of communication platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}