"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import VideoBackground from "./VideoBackground";

function FallingGrains() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="grain-dot"
          style={{
            left: `${(i * 17) % 100}%`,
            top: "-30px",
            animationDuration: `${8 + (i % 6)}s`,
            animationDelay: `${(i % 9) * 0.65}s`,
            ["--x"]: `${((i * 19) % 80) - 40}px`
          }}
        />
      ))}
    </div>
  );
}

export default function HeroV3() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden pt-24 md:pt-28">
      <VideoBackground
        src="/videos/rice-farm.mp4"
        mobileSrc="/videos/rice-farm-mobile.mp4"
        poster="/nature/rice-fields.svg"
        overlayClassName="bg-white/68 md:bg-white/58"
      />
      <FallingGrains />

      <div className="section-pad relative z-10">
        <div className="container-brand flex min-h-[calc(100svh-6rem)] items-center py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75 }}
            className="mobile-card w-full max-w-3xl rounded-[2rem] bg-white/78 p-5 text-black shadow-soft backdrop-blur-md sm:p-7 md:rounded-[2.5rem] md:p-10"
          >
            <h1 className="mobile-title font-display font-bold text-black md:text-6xl xl:text-7xl">
              Premium rice,
              <br />
              better motion,
              <br />
              stronger brand feel.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-black md:mt-6 md:text-lg md:leading-8">
              A cleaner Shakti Foods storefront with real rice bag size switching,
              calmer product motion, a shopping cart, and a checkout flow.
            </p>

            <div className="mt-7 md:mt-8">
              <Link
                href="/products"
                className="inline-flex w-full justify-center rounded-full bg-black px-7 py-4 text-center font-bold text-white shadow-soft transition hover:bg-[#333333] sm:w-auto"
              >
                Explore Products
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
