
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";

export default function StorefrontLayout({ children }) {
  return (
    <CartProvider>
      <div className="shakti-storefront min-h-screen bg-white">
        <Navbar />

        {children}

        <Footer />
      </div>
    </CartProvider>
  );
}
