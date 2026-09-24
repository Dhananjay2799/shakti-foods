import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";

export default function StorefrontLayout({
  children
}) {
  return (
    <CartProvider>
      <Navbar />

      {children}
      <Footer />

    </CartProvider>
  );
}