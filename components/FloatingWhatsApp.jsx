import {
  MessageCircle,
  ArrowUpRight
} from "lucide-react";

import { whatsappLink } from "@/lib/site";

export default function FloatingWhatsApp() {
  return (
    <section
      className="
        border-t
        border-[#eadfce]
        bg-[#fffaf2]
        px-5
        py-6
        sm:px-6
        md:py-7
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-[1200px]
          flex-col
          items-center
          justify-between
          gap-4
          text-center
          sm:flex-row
          sm:text-left
        "
      >
        {/* LEFT */}
        <div>
          <div
            className="
              text-[9px]
              font-black
              uppercase
              tracking-[0.22em]
              text-[#bd0b1a]
            "
          >
            Need Help?
          </div>

          <div
            className="
              mt-1
              font-display
              text-[21px]
              font-bold
              leading-tight
              text-[#19130f]
              md:text-[24px]
            "
          >
            Have a question about
            our products?
          </div>

          <p
            className="
              mt-1.5
              max-w-[480px]
              text-[12px]
              leading-5
              text-[#6c625a]
              md:text-[13px]
            "
          >
            Chat with Shakti Foods
            for product, retail, or
            wholesale assistance.
          </p>
        </div>

        {/* WHATSAPP BUTTON */}
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with Shakti Foods on WhatsApp"
          className="
            group
            inline-flex
            shrink-0
            items-center
            justify-center
            gap-2.5
            rounded-full
            bg-[#25D366]
            px-6
            py-3.5
            text-[13px]
            font-bold
            text-white
            shadow-[0_8px_22px_rgba(37,211,102,0.22)]
            transition
            duration-300
            hover:-translate-y-0.5
            hover:bg-[#20bd5a]
            hover:shadow-[0_12px_28px_rgba(37,211,102,0.28)]
          "
        >
          <MessageCircle
            size={19}
            strokeWidth={2}
          />

          Chat on WhatsApp

          <ArrowUpRight
            size={16}
            strokeWidth={2}
            className="
              transition-transform
              duration-300
              group-hover:translate-x-0.5
              group-hover:-translate-y-0.5
            "
          />
        </a>
      </div>
    </section>
  );
}