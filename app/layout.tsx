import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Norte360 | El Waze de tus finanzas",
  description:
    "Norte360 ayuda a entender donde estas financieramente, definir tu norte y comparar rutas para tomar mejores decisiones.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
