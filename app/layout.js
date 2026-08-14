import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import CheckoutReturnWatcher from "@/components/CheckoutReturnWatcher";
import { site } from "@/lib/site";
import { CartProvider } from "@/components/CartProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata = {
  metadataBase: new URL(site.baseUrl),
  title: {
    default:
      "Shakti Foods | Premium Basmati Rice & Simpli Ecoware",
    template: "%s | Shakti Foods"
  },

  icons: {
  icon: "/images/logo-shakti.png",
  shortcut: "/images/logo-shakti.png",
  apple: "/images/logo-shakti.png"
  },

  description:
    "Premium Shakti Foods Basmati rice and Simpli Ecoware compostable sugarcane bagasse plates, bowls, trays, and food containers for families, restaurants, caterers, and wholesale buyers.",
  keywords: [
    "Basmati rice supplier",
    "Wholesale rice bag",
    "Disposable plates supplier",
    "Eco-friendly food containers",
    "Catering disposable plates",
    "Indian grocery rice supplier",
    "Sugarcane bagasse tableware"
  ],
  openGraph: {
    title:
      "Shakti Foods | Premium Basmati Rice & Simpli Ecoware",
    description:
      "Premium rice and compostable foodservice products for retail and wholesale buyers.",
    type: "website",
    url: site.baseUrl,
    siteName: "Shakti Foods"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable}`}
      >
        <CartProvider>
          <Analytics />
          <CheckoutReturnWatcher />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}