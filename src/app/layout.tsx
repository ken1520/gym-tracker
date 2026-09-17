import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/toast";
import { getCurrentUser } from "@/server/auth/dal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym Tracker",
  description: "Log workouts, track volume, and watch your lifts go up",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading the session here is what lets the nav know who is signed in. It
  // never redirects — the login page renders inside this layout too, and a
  // database outage must still reach the page's own ConnectionError banner
  const user = await getCurrentUser().catch(() => null);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <ToastProvider>
          <Nav user={user} />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
