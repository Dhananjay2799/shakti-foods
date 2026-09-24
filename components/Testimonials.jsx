"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Quote,
  Sparkles
} from "lucide-react";

import { testimonials } from "@/lib/data";

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!testimonials?.length) {
    return null;
  }

  const activeTestimonial = testimonials[activeIndex];

  function previousTestimonial() {
    setActiveIndex((current) =>
      current === 0
        ? testimonials.length - 1
        : current - 1
    );
  }

  function nextTestimonial() {
    setActiveIndex((current) =>
      current === testimonials.length - 1
        ? 0
        : current + 1
    );
  }

  return (
    <section
      className="
        relative
        isolate
        overflow-hidden
        bg-[#fff8ec]
        text-[#18120f]
      "
    >
      {/* =====================================================
          RESPONSIVE BACKGROUNDS
      ====================================================== */}

      {/* DESKTOP */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          -z-20
          hidden
          bg-cover
          bg-center
          bg-no-repeat
          md:block
        "
        style={{
          backgroundImage:
            "url('/images/testimonials-bg-desktop.png')"
        }}
      />

      {/* MOBILE */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          -z-20
          bg-cover
          bg-center
          bg-no-repeat
          md:hidden
        "
        style={{
          backgroundImage:
            "url('/images/testimonials-bg-mobile.png')"
        }}
      />

      {/* Soft overlay so text stays readable */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          -z-10
          bg-white/[0.08]
        "
      />

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div
        className="
          relative
          mx-auto
          max-w-[1320px]
          px-5
          pb-16
          pt-14
          sm:px-6
          md:px-8
          md:pb-20
          md:pt-16
          lg:px-10
          lg:pb-24
          lg:pt-20
        "
      >
        {/* =================================================
            HEADING
        ================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 16
          }}
          whileInView={{
            opacity: 1,
            y: 0
          }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="
            mx-auto
            max-w-[780px]
            text-center
          "
        >
          <Sparkles
            size={27}
            strokeWidth={1.5}
            className="
              mx-auto
              text-[#c58a28]
            "
          />

          <div
            className="
              mt-3
              flex
              items-center
              justify-center
              gap-3
            "
          >
            <span
              className="
                h-px
                w-[38px]
                bg-[#d49a3c]
                sm:w-[62px]
              "
            />

            <div
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.27em]
                text-[#b80b19]
                sm:text-[10px]
                md:text-[11px]
              "
            >
              Loved By Families
            </div>

            <span
              className="
                h-px
                w-[38px]
                bg-[#d49a3c]
                sm:w-[62px]
              "
            />
          </div>

          <h2
            className="
              mx-auto
              mt-4
              font-display
              text-[34px]
              font-bold
              leading-[0.98]
              tracking-[-0.035em]
              text-[#17120f]
              sm:text-[42px]
              md:text-[50px]
              lg:text-[58px]
            "
          >
            Rice That Brings People{" "}
            <span className="text-[#c90019]">
              Together
            </span>
          </h2>

          <p
            className="
              mx-auto
              mt-5
              max-w-[610px]
              text-[13px]
              leading-[1.55]
              text-[#514943]
              sm:text-[14px]
              md:text-[15px]
            "
          >
            From everyday meals to special occasions,
            discover the experience Shakti Foods brings
            to homes, restaurants, and businesses.
          </p>
        </motion.div>

        {/* =================================================
            DESKTOP CARDS
        ================================================== */}

        <div
          className="
            mt-11
            hidden
            grid-cols-3
            gap-5
            md:grid
            lg:mt-12
            lg:gap-6
          "
        >
          {testimonials.map((item, index) => (
            <motion.article
              key={`${item.name}-${index}`}
              initial={{
                opacity: 0,
                y: 24
              }}
              whileInView={{
                opacity: 1,
                y: 0
              }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: index * 0.07
              }}
              className="
                relative
                flex
                min-h-[270px]
                flex-col
                overflow-hidden
                rounded-[20px]
                border
                border-[#e7d3b3]
                bg-[#fffdf8]/95
                p-7
                shadow-[0_12px_35px_rgba(72,44,23,0.10)]
                backdrop-blur-[2px]
              "
            >
              {/* Top row */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-[48px]
                      w-[48px]
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#e2c58e]
                      bg-[#fff6e5]
                      font-display
                      text-[17px]
                      font-bold
                      text-[#bd0b1a]
                    "
                  >
                    {getInitials(item.name)}
                  </div>

                  <div>
                    <div
                      className="
                        text-[13px]
                        font-bold
                        text-[#17120f]
                      "
                    >
                      {item.name}
                    </div>

                    <div
                      className="
                        mt-[2px]
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.15em]
                        text-[#a9701d]
                      "
                    >
                      Buyer Perspective
                    </div>
                  </div>
                </div>

                <Quote
                  size={32}
                  strokeWidth={1.4}
                  className="
                    text-[#d99a35]
                  "
                />
              </div>

              {/* Decorative stars */}
              <div
                aria-hidden="true"
                className="
                  mt-6
                  flex
                  gap-[3px]
                  text-[#dc951f]
                "
              >
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>

              <p
                className="
                  mt-4
                  flex-1
                  font-display
                  text-[17px]
                  leading-[1.5]
                  text-[#332a25]
                "
              >
                &ldquo;{item.text}&rdquo;
              </p>

              <div
                className="
                  mt-6
                  h-px
                  bg-[#eadfce]
                "
              />
            </motion.article>
          ))}
        </div>

        {/* DESKTOP DOTS */}
        <div
          className="
            mt-8
            hidden
            items-center
            justify-center
            gap-3
            md:flex
          "
        >
          {testimonials.map((item, index) => (
            <span
              key={`${item.name}-desktop-dot`}
              className={
                index === 0
                  ? "h-[10px] w-[10px] rounded-full bg-[#c90019]"
                  : "h-[8px] w-[8px] rounded-full bg-[#d8d0c6]"
              }
            />
          ))}
        </div>

        {/* =================================================
            MOBILE CARD
        ================================================== */}

        <div
          className="
            mt-8
            md:hidden
          "
        >
          <AnimatePresence
            mode="wait"
            initial={false}
          >
            <motion.article
              key={activeIndex}
              initial={{
                opacity: 0,
                x: 20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              exit={{
                opacity: 0,
                x: -20
              }}
              transition={{
                duration: 0.22
              }}
              className="
                relative
                mx-auto
                max-w-[345px]
                overflow-hidden
                rounded-[18px]
                border
                border-[#e7d2ae]
                bg-[#fffdf8]/95
                p-5
                shadow-[0_12px_32px_rgba(72,44,23,0.10)]
                backdrop-blur-[2px]
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-[45px]
                      w-[45px]
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#e2c58e]
                      bg-[#fff6e5]
                      font-display
                      text-[16px]
                      font-bold
                      text-[#bd0b1a]
                    "
                  >
                    {getInitials(
                      activeTestimonial.name
                    )}
                  </div>

                  <div>
                    <div
                      className="
                        text-[12px]
                        font-bold
                        text-[#17120f]
                      "
                    >
                      {activeTestimonial.name}
                    </div>

                    <div
                      className="
                        mt-[2px]
                        text-[7px]
                        font-bold
                        uppercase
                        tracking-[0.14em]
                        text-[#a9701d]
                      "
                    >
                      Buyer Perspective
                    </div>
                  </div>
                </div>

                <Quote
                  size={28}
                  strokeWidth={1.4}
                  className="
                    text-[#d99a35]
                  "
                />
              </div>

              <div
                aria-hidden="true"
                className="
                  mt-5
                  flex
                  gap-[2px]
                  text-[14px]
                  text-[#dc951f]
                "
              >
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>

              <p
                className="
                  mt-4
                  font-display
                  text-[16px]
                  leading-[1.5]
                  text-[#332a25]
                "
              >
                &ldquo;
                {activeTestimonial.text}
                &rdquo;
              </p>
            </motion.article>
          </AnimatePresence>

          {/* MOBILE CONTROLS */}
          <div
            className="
              mx-auto
              mt-5
              flex
              max-w-[345px]
              items-center
              justify-between
            "
          >
            <button
              type="button"
              onClick={previousTestimonial}
              aria-label="Previous testimonial"
              className="
                flex
                h-[38px]
                w-[38px]
                items-center
                justify-center
                rounded-full
                border
                border-[#d99836]
                bg-[#fffdf8]
                text-[#c90019]
                shadow-sm
              "
            >
              <ChevronLeft
                size={18}
                strokeWidth={2}
              />
            </button>

            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              {testimonials.map(
                (item, index) => (
                  <button
                    key={`${item.name}-${index}-mobile-dot`}
                    type="button"
                    onClick={() =>
                      setActiveIndex(index)
                    }
                    aria-label={`Show testimonial ${
                      index + 1
                    }`}
                    className={
                      activeIndex === index
                        ? "h-[9px] w-[9px] rounded-full bg-[#c90019]"
                        : "h-[7px] w-[7px] rounded-full bg-[#d5cec5]"
                    }
                  />
                )
              )}
            </div>

            <button
              type="button"
              onClick={nextTestimonial}
              aria-label="Next testimonial"
              className="
                flex
                h-[38px]
                w-[38px]
                items-center
                justify-center
                rounded-full
                border
                border-[#d99836]
                bg-[#fffdf8]
                text-[#c90019]
                shadow-sm
              "
            >
              <ChevronRight
                size={18}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}