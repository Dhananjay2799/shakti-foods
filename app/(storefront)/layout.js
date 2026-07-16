import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { CartProvider } from "@/components/CartProvider";

export default function StorefrontLayout({
  children
}) {
  return (
    <CartProvider>
      <Navbar />

      {children}

      <Footer />

      <FloatingWhatsApp />
    </CartProvider>
  );
}