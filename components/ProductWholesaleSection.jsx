export default function ProductWholesaleSection() {
  return (
    <section
      className="
        relative
        overflow-hidden
        bg-[#fffaf2]
      "
    >
      {/* =====================================================
          MOBILE
      ====================================================== */}

      <div
        className="
          relative
          h-[430px]
          overflow-hidden
          md:hidden
        "
      >
        {/* BACKGROUND IMAGE */}
        <img
          src="/images/wholesale-rice-bag.jpg"
          alt="Shakti Foods premium Basmati rice wholesale"
          className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
            object-[30%_20%]
          "
        />

        {/* TOP / LEFT CREAM BLEND */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[linear-gradient(155deg,#fffaf2_0%,rgba(255,250,242,0.97)_24%,rgba(255,250,242,0.80)_39%,rgba(255,250,242,0.38)_53%,rgba(255,250,242,0.08)_67%,rgba(255,250,242,0)_76%)]
          "
        />

        {/* EXTRA LEFT READABILITY */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[linear-gradient(135deg,rgba(255,250,242,0.97)_0%,rgba(255,250,242,0.93)_24%,rgba(255,250,242,0.72)_42%,rgba(255,250,242,0.28)_56%,rgba(255,250,242,0)_70%)]
          "
        />

        {/* TOP FADE */}
        <div
          className="
            pointer-events-none
            absolute
            inset-x-0
            top-0
            h-[95px]
            bg-gradient-to-b
            from-[#fffaf2]
            via-[#fffaf2]/85
            to-transparent
          "
        />

        {/* CONTENT */}
        <div
          className="
            relative
            z-10
            px-[28px]
            pt-[25px]
          "
        >
          {/* LABEL */}
          <div className="flex items-center gap-[12px]">
            <span
              className="
                whitespace-nowrap
                text-[8px]
                font-black
                uppercase
                tracking-[0.17em]
                text-[#9b5c13]
              "
            >
              Wholesale Partnerships
            </span>

            <span
              className="
                h-px
                w-[34px]
                shrink-0
                bg-[#b77924]
              "
            />
          </div>

          {/* HEADING */}
          <h2
            className="
              mt-[13px]
              w-[225px]
              font-display
              text-[29px]
              font-bold
              leading-[0.90]
              tracking-[-0.04em]
              text-[#17120f]

              min-[390px]:w-[235px]
              min-[390px]:text-[30px]
            "
          >
            <span className="block">
              Partner with
            </span>

            <span className="block">
              Shakti Foods
            </span>

            <span className="block text-[#d1081b]">
              for Greater
            </span>

            <span className="block text-[#d1081b]">
              Possibilities
            </span>
          </h2>

          {/* DESCRIPTION */}
          <p
            className="
              mt-[15px]
              w-[205px]
              text-[10px]
              font-medium
              leading-[1.45]
              text-[#403a35]

              min-[390px]:w-[215px]
              min-[390px]:text-[10.5px]
            "
          >
            Get wholesale pricing for consistent quality,
            reliable supply, and exceptional value.
          </p>

          {/* CTA */}
          <a
            href="/contact?type=wholesale"
            className="
              mt-[17px]
              inline-flex
              min-h-[43px]
              items-center
              justify-center
              gap-[12px]
              whitespace-nowrap
              rounded-[5px]
              bg-[#c90019]
              px-[15px]
              text-[10px]
              font-extrabold
              text-white
              shadow-[0_8px_20px_rgba(201,0,25,0.16)]
              transition
              duration-200

              hover:bg-[#ad0016]
              active:scale-[0.98]

              min-[390px]:px-[20px]
              min-[390px]:text-[10.5px]
            "
          >
            Request Wholesale Pricing

            <span
              aria-hidden="true"
              className="text-[16px] leading-none"
            >
              →
            </span>
          </a>
        </div>
      </div>

      {/* =====================================================
          TABLET / DESKTOP
          LEAVE DESKTOP DESIGN SEPARATE
      ====================================================== */}

      <div
        className="
          relative
          hidden
          min-h-[330px]

          md:block
          lg:min-h-[360px]
        "
      >
        {/* WHOLESALE IMAGE */}

        <div
          className="
            absolute
            bottom-0
            right-0
            top-0
            w-[58%]

            lg:w-[61%]
          "
        >
          <img
            src="/images/wholesale-rice-bag.jpg"
            alt="Shakti Foods premium Basmati rice wholesale"
            className="
              h-full
              w-full
              object-cover
              object-center
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-[linear-gradient(90deg,#fffaf2_0%,rgba(255,250,242,0.94)_12%,rgba(255,250,242,0.58)_24%,rgba(255,250,242,0.12)_38%,transparent_52%)]
            "
          />
        </div>

        {/* CONTENT */}

        <div
          className="
            container-brand
            relative
            z-10
          "
        >
          <div
            className="
              flex
              min-h-[330px]
              max-w-[560px]
              flex-col
              justify-center
              py-12

              lg:min-h-[360px]
              lg:max-w-[570px]
            "
          >
            <div className="flex items-center gap-3">
              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.18em]
                  text-[#9b5c13]
                "
              >
                Wholesale Partnerships
              </span>

              <span className="h-px w-8 bg-[#b77924]" />
            </div>

            <h2
              className="
                mt-3
                max-w-[510px]
                font-display
                text-[38px]
                font-bold
                leading-[0.96]
                tracking-[-0.035em]
                text-[#17120f]

                lg:text-[44px]
              "
            >
              Partner with Shakti Foods

              <span className="block text-[#d1081b]">
                for Greater Possibilities
              </span>
            </h2>

            <p
              className="
                mt-4
                max-w-[460px]
                text-[13px]
                leading-[1.55]
                text-[#413a34]
              "
            >
              Get wholesale pricing for consistent quality,
              reliable supply, and exceptional value. Trusted by
              restaurants, caterers, and grocers across North America.
            </p>

            <div className="mt-5">
              <a
                href="/contact?type=wholesale"
                className="
                  inline-flex
                  min-h-[46px]
                  items-center
                  justify-center
                  gap-3
                  rounded-[5px]
                  bg-[#c90019]
                  px-7
                  text-[11px]
                  font-extrabold
                  text-white
                  shadow-[0_8px_20px_rgba(201,0,25,0.18)]
                  transition
                  duration-200

                  hover:-translate-y-0.5
                  hover:bg-[#ad0016]

                  active:translate-y-0
                "
              >
                Request Wholesale Pricing

                <span
                  aria-hidden="true"
                  className="text-[17px] leading-none"
                >
                  →
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}