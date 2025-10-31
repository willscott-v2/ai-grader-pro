import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AI Grader Pro - AI Search Readiness Analyzer",
  description: "Analyze how well your webpages perform in AI-powered search results. Get instant visibility scores, entity analysis, and actionable recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set initial theme before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try{
                  var saved = localStorage.getItem('theme');
                  var useDark = saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (useDark) document.documentElement.classList.add('dark');
                }catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
