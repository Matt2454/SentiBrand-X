import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "../components/theme-provider";
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
  title: "SentiBrand X Analyzer | Real-time Brand Intelligence",
  description: "Advanced AI-powered sentiment analysis for brands on X/Twitter. Track mentions, analyze trends, and get real-time insights.",
  keywords: ["brand sentiment", "twitter analysis", "social media monitoring", "AI sentiment", "brand intelligence", "X analytics"],
  authors: [{ name: "SentiBrand X" }],
  creator: "SentiBrand X",
  publisher: "SentiBrand X",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://sentibrand-x.netlify.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SentiBrand X Analyzer | Real-time Brand Intelligence",
    description: "Advanced AI-powered sentiment analysis for brands on X/Twitter. Track mentions, analyze trends, and get real-time insights.",
    url: "https://sentibrand-x.netlify.app",
    siteName: "SentiBrand X",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SentiBrand X Dashboard - Real-time Brand Sentiment Analysis",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SentiBrand X Analyzer | Real-time Brand Intelligence",
    description: "Advanced AI-powered sentiment analysis for brands on X/Twitter. Track mentions, analyze trends, and get real-time insights.",
    images: ["/og-image.png"],
    creator: "@sentibrandx",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
