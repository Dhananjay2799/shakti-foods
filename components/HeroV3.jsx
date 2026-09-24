"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  Leaf,
  UsersRound
} from "lucide-react";

const values = [
  {
    icon: Leaf,
    title: "Pure & Naturally Aged"
  },
  {
    icon: Heart,
    title: "Brings Families Together"
  },
  {
    icon: UsersRound,
    title: "A Tradition You Can Trust"
  }
];

export default function HeroV3() {
  return (
    <>
      {/* =====================================================
          MOBILE
      ====================================================== */}

      <section
        className="
          relative
          w-full
          overflow-hidden
          bg-[#faf7f1]
          lg:hidden
        "
      >
        <div className="relative w-full">
          <Image
            src="/images/shakti-hero-mobile.jpg"
            alt="Shakti Foods Premium Basmati Rice"
            width={940}
            height={1672}
            priority
            sizes="100vw"
            className="
              block
              h-auto
              w-full
            "
          />

          {/*
            The buttons are already visually present
            inside shakti-hero-mobile.jpg.

            These transparent links make them real,
            accessible, clickable website controls.
          */}

          {/* SHOP OUR RICE — MOBILE CLICK AREA */}
          <Link
            href="/products"
            aria-label="Shop Our Rice"
            className="
              absolute
              left-[6.5%]
              top-[40.6%]
              z-30
              h-[4.8%]
              w-[41%]
              rounded-md
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-white
            "
          />

          {/* OUR STORY — MOBILE CLICK AREA */}
          <Link
            href="/about"
            aria-label="Our Story"
            className="
              absolute
              left-[6.5%]
              top-[46.0%]
              z-30
              h-[4.8%]
              w-[41%]
              rounded-md
              focus-visible:outline
              focus-visible:outline-2
              focus-visible:outline-[#b80d1b]
            "
          />
        </div>
      </section>

      {/* =====================================================
          DESKTOP
      ====================================================== */}

      <section
        className="
          relative
          hidden
          h-[720px]
          w-full
          overflow-hidden
          bg-[#faf7f1]
          lg:block

          xl:h-[735px]

          2xl:h-[750px]
        "
      >
        {/* HERO PHOTOGRAPH */}
        <div className="absolute inset-0">
          <Image
            src="/images/shakti-hero.jpg"
            alt="Shakti Foods Premium Basmati Rice"
            fill
            priority
            sizes="100vw"
            className="
              object-cover
              object-[67%_center]
            "
          />
        </div>

        {/* ===================================================
            LEFT IVORY GRADIENT

            Kept shorter so the food photography stays rich.
        ==================================================== */}

        <div
          className="
            absolute
            inset-0
            bg-[linear-gradient(90deg,#faf7f1_0%,#faf7f1_29%,rgba(250,247,241,0.97)_33%,rgba(250,247,241,0.82)_37%,rgba(250,247,241,0.48)_41%,rgba(250,247,241,0.16)_45%,transparent_50%)]
          "
        />

        {/* CONTENT */}
        <div
          className="
            relative
            z-10
            mx-auto
            flex
            h-full
            max-w-[1500px]
            items-center
            px-10
            pt-[68px]

            xl:px-14

            2xl:max-w-[1600px]
          "
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 18
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              duration: 0.6
            }}
            className="
              w-full
              max-w-[555px]
            "
          >
            {/* EYEBROW */}
            <div className="flex items-center gap-4">
              <span
                className="
                  text-[11px]
                  font-black
                  uppercase
                  tracking-[0.27em]
                  text-[#a8661e]
                "
              >
                Premium Basmati Rice
              </span>

              <span className="h-px w-10 bg-[#c88a3d]" />
            </div>

            {/* HEADLINE */}
            <h1
              className="
                mt-4
                font-display
                text-[62px]
                font-bold
                leading-[0.91]
                tracking-[-0.045em]
                text-[#15100f]

                xl:text-[66px]

                2xl:text-[70px]
              "
            >
              Good Food
              <br />

              Brings Us
              <br />

              <span className="text-[#bd0d1b]">
                Together.
              </span>
            </h1>

            {/* DESCRIPTION */}
            <p
              className="
                mt-5
                max-w-[480px]
                text-[15px]
                leading-[1.7]
                text-[#443b37]

                xl:text-base
              "
            >
              Naturally aged and exceptionally
              fragrant. Shakti Foods brings premium
              Basmati rice to everyday meals,
              celebrations, and the people who matter
              most.
            </p>

            {/* CTA */}
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/products"
                className="
                  inline-flex
                  h-[50px]
                  items-center
                  justify-center
                  gap-3
                  rounded-md
                  bg-[#bd0d1b]
                  px-7
                  text-sm
                  font-bold
                  text-white
                  shadow-[0_10px_25px_rgba(189,13,27,0.18)]
                  transition
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-[#9f0b17]
                "
              >
                Shop Our Rice

                <ArrowRight
                  size={17}
                  strokeWidth={1.8}
                />
              </Link>

              <Link
                href="/about"
                className="
                  inline-flex
                  h-[50px]
                  items-center
                  justify-center
                  rounded-md
                  border
                  border-[#bd0d1b]
                  bg-white/75
                  px-7
                  text-sm
                  font-bold
                  text-[#bd0d1b]
                  backdrop-blur-sm
                  transition
                  duration-200
                  hover:bg-white
                "
              >
                Our Story
              </Link>
            </div>

            {/* TRUST POINTS */}
            <div
              className="
                mt-8
                border-t
                border-[#2b1c18]/10
                pt-5
              "
            >
              <div
                className="
                  grid
                  max-w-[545px]
                  grid-cols-3
                  gap-5
                "
              >
                {values.map(
                  ({
                    icon: Icon,
                    title
                  }) => (
                    <div
                      key={title}
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <Icon
                        size={21}
                        strokeWidth={1.6}
                        className="
                          shrink-0
                          text-[#bd0d1b]
                        "
                      />

                      <span
                        className="
                          text-[10px]
                          font-semibold
                          leading-[1.35]
                          text-[#342b28]

                          xl:text-[11px]
                        "
                      >
                        {title}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}