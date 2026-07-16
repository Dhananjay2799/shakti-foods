import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";

export default function FloatingWhatsApp() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-4 text-sm font-bold text-white shadow-lift transition hover:scale-105"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={18} /> WhatsApp
    </a>
  );
}
