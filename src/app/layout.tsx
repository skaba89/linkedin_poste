import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedInPost — SaaS de Gestion de Contenu",
  description: "Créez, gérez et publiez vos posts LinkedIn avec l'intelligence artificielle. Workflow de validation intégré, multi-fournisseurs IA, et publication directe.",
  keywords: ["LinkedIn", "SaaS", "gestion de contenu", "IA", "publication", "réseaux sociaux"],
  authors: [{ name: "LinkedInPost Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LinkedInPost — SaaS de Gestion de Contenu",
    description: "Gérez intelligemment vos publications LinkedIn grâce à l'IA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className={inter.variable}>
      <body
        className={`${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
