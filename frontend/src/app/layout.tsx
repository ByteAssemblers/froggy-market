import { ThemeProvider } from "@/providers/ThemeProvider";
import ClientProvider from "@/providers/ClientProvider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Serif } from "next/font/google";
import "./globals.css";
import Header from "@/components/page/Header";
import Footer from "@/components/page/Footer";
import { QueryProvider } from "@/providers/QueryProvider";

const serifSans = Noto_Serif({
  variable: "--font-serif-sans",
  subsets: ["latin"],
});

const jetbrainMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Froggy Market",
  description: "Pepecoin Market Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${serifSans.variable} ${jetbrainMono.variable} m-0 min-h-screen min-w-[320px] cursor-auto bg-[#121212] text-[#fffffff2] antialiased`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ClientProvider>
              <div className="flex flex-col items-center">
                <Header />
                <main className="tiny:p-8 relative min-h-[calc(100vh-5rem)] w-full max-w-[1200px] p-3">
                  {children}
                </main>
                <Footer />
              </div>
            </ClientProvider>
          </ThemeProvider>
          <Toaster richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
