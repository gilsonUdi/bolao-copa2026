import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bolão Copa 2026 ⚽",
  description: "Faça suas apostas para a Copa do Mundo 2026 com amigos",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: "Bolão Copa 2026",
    description: "Crie seu grupo e aposte nos jogos da Copa do Mundo 2026",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
