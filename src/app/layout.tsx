import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viekärrsvägen 4 | Boka",
  description: "Boka stugan i Trönningenäs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
