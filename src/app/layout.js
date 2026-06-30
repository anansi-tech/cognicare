import { Inter, Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";
import { LiamProvider } from "@/components/liam/LiamProvider";
import { LiamSheet } from "@/components/liam/LiamSheet";
import { SubscriptionGate } from "@/components/billing/SubscriptionGate";

const inter = Inter({ subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata = {
  title: "CogniCare",
  description: "Mental Health Professional Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${bricolage.variable} ${hanken.variable}`}>
        <Toaster position="top-right" />
        <Providers>
          <SubscriptionGate>
            <LiamProvider>
              <Navbar />
              <main className="min-h-screen bg-background">
                {children}
              </main>
              <LiamSheet />
            </LiamProvider>
          </SubscriptionGate>
        </Providers>
      </body>
    </html>
  );
}
