"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useState } from "react";

const recipes = [
  {
    title: "Chicken Biryani",
    time: "45 min",
    image: "/images/recipe-chicken-biryani.jpg",
  },
  {
    title: "Mediterranean Rice Bowl",
    time: "30 min",
    image: "/images/recipe-mediterranean-rice-bowl.jpg",
  },
  {
    title: "Mexican Rice Bowl",
    time: "25 min",
    image: "/images/recipe-mexican-rice-bowl.jpg",
  },
];

function RecipeCard({ recipe }) {
  return (
    <article
      className="
        overflow-hidden
        rounded-[14px]
        border
        border-[#eee4d7]
        bg-white
        shadow-[0_8px_26px_rgba(73,48,24,0.07)]
      "
    >
      {/* IMAGE */}
      <div
        className="
          relative
          aspect-[1.62/1]
          overflow-hidden
          bg-[#eee6dc]
        "
      >
        <Image
          src={recipe.image}
          alt={`${recipe.title} made with basmati rice`}
          fill
          sizes="
            (max-width: 767px) 84vw,
            (max-width: 1200px) 33vw,
            390px
          "
          className="object-cover"
        />
      </div>

      {/* CONTENT */}
      <div className="px-5 py-4 md:px-5 md:py-4">
        <h3
          className="
            font-display
            text-[21px]
            font-bold
            leading-[1.08]
            tracking-[-0.02em]
            text-[#17120f]
            lg:text-[22px]
          "
        >
          {recipe.title}
        </h3>

        <div
          className="
            mt-2.5
            flex
            items-center
            gap-2
            text-[13px]
            font-medium
            text-[#5e5750]
          "
        >
          <Clock
            size={18}
            strokeWidth={2}
            className="text-[#d1081b]"
          />

          <span>{recipe.time}</span>
        </div>
      </div>
    </article>
  );
}

export default function RecipeInspiration() {
  const [activeIndex, setActiveIndex] = useState(0);

  function showPreviousRecipe() {
    setActiveIndex((current) =>
      current <= 0
        ? recipes.length - 1
        : current - 1
    );
  }

  function showNextRecipe() {
    setActiveIndex((current) =>
      current >= recipes.length - 1
        ? 0
        : current + 1
    );
  }

  return (
    <section
      className="
        relative
        overflow-hidden
        bg-[#fffaf2]
        text-[#17120f]
      "
    >
      {/* SOFT BACKGROUND DECORATION */}
      <div
        className="
          pointer-events-none
          absolute
          -left-20
          top-10
          h-56
          w-56
          rounded-full
          bg-[#e6b45b]/[0.05]
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-20
          bottom-0
          h-64
          w-64
          rounded-full
          bg-[#d1081b]/[0.03]
          blur-3xl
        "
      />

      {/* =====================================================
          DESKTOP
      ====================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          hidden
          max-w-[1440px]
          grid-cols-[0.72fr_2fr]
          items-center
          gap-12
          px-8
          py-12
          md:grid
          xl:px-12
          xl:py-14
        "
      >
        {/* INTRO */}
        <div className="self-center">
          {/* EYEBROW */}
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[#d8a548]" />

            <span
              className="
                whitespace-nowrap
                text-[9px]
                font-black
                uppercase
                tracking-[0.17em]
                text-[#d1081b]
              "
            >
              Simple Meals. Inspired by Shakti.
            </span>

            <span className="h-px w-10 bg-[#d8a548]" />
          </div>

          {/* HEADING */}
          <h2
            className="
              mt-4
              max-w-[390px]
              font-display
              text-[48px]
              font-bold
              leading-[0.94]
              tracking-[-0.04em]
              text-[#17120f]
              xl:text-[54px]
            "
          >
            Rice for Every
            <span className="block text-[#d1081b]">
              Kind of Table
            </span>
          </h2>

          {/* DESCRIPTION */}
          <p
            className="
              mt-5
              max-w-[370px]
              text-[13px]
              leading-[1.7]
              text-[#625a53]
              xl:text-[14px]
            "
          >
            From traditional favorites to globally inspired
            bowls, premium basmati rice brings something
            special to every meal.
          </p>
        </div>

        {/* RECIPE CARDS */}
        <div className="grid grid-cols-3 gap-5">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.title}
              recipe={recipe}
            />
          ))}
        </div>
      </div>

      {/* =====================================================
          MOBILE
      ====================================================== */}

      <div
        className="
          relative
          z-10
          px-5
          pb-10
          pt-10
          md:hidden
        "
      >
        {/* INTRO */}
        <div className="text-center">
          <div
            className="
              flex
              items-center
              justify-center
              gap-2.5
            "
          >
            <span className="h-px w-8 bg-[#d8a548]" />

            <span
              className="
                text-[8px]
                font-black
                uppercase
                tracking-[0.14em]
                text-[#d1081b]
              "
            >
              Inspired by Shakti
            </span>

            <span className="h-px w-8 bg-[#d8a548]" />
          </div>

          <h2
            className="
              mx-auto
              mt-3
              max-w-[360px]
              font-display
              text-[38px]
              font-bold
              leading-[0.97]
              tracking-[-0.035em]
              text-[#17120f]
            "
          >
            Rice for Every
            <span className="block text-[#d1081b]">
              Kind of Table
            </span>
          </h2>

          <p
            className="
              mx-auto
              mt-4
              max-w-[335px]
              text-[12px]
              leading-[1.6]
              text-[#625a53]
            "
          >
            From traditional favorites to globally inspired
            bowls, premium basmati rice brings something
            special to every meal.
          </p>
        </div>

        {/* =================================================
            MOBILE RECIPE CAROUSEL
        ================================================== */}

        <div
          className="
            relative
            mx-auto
            mt-7
            max-w-[390px]
          "
        >
          <RecipeCard
            key={recipes[activeIndex].title}
            recipe={recipes[activeIndex]}
          />

          {/* PREVIOUS */}
          <button
            type="button"
            onClick={showPreviousRecipe}
            aria-label="Previous recipe inspiration"
            className="
              absolute
              -left-[14px]
              top-[40%]
              z-20
              flex
              h-[42px]
              w-[42px]
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              bg-[#d1081b]
              text-white
              shadow-[0_8px_22px_rgba(209,8,27,0.30)]
              ring-4
              ring-[#fffaf2]
              transition
              duration-200
              hover:scale-105
              hover:bg-[#b90719]
              active:scale-95
            "
          >
            <ChevronLeft
              size={24}
              strokeWidth={2.4}
            />
          </button>

          {/* NEXT */}
          <button
            type="button"
            onClick={showNextRecipe}
            aria-label="Next recipe inspiration"
            className="
              absolute
              -right-[14px]
              top-[40%]
              z-20
              flex
              h-[42px]
              w-[42px]
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              bg-[#d1081b]
              text-white
              shadow-[0_8px_22px_rgba(209,8,27,0.30)]
              ring-4
              ring-[#fffaf2]
              transition
              duration-200
              hover:scale-105
              hover:bg-[#b90719]
              active:scale-95
            "
          >
            <ChevronRight
              size={24}
              strokeWidth={2.4}
            />
          </button>
        </div>

        {/* DOT NAVIGATION */}
        <div
          className="
            mt-7
            flex
            items-center
            justify-center
            gap-3
          "
        >
          {recipes.map((recipe, index) => {
            const active = index === activeIndex;

            return (
              <button
                key={recipe.title}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${recipe.title}`}
                aria-current={active ? "true" : undefined}
                className={`
                  rounded-full
                  transition-all
                  duration-300
                  ${
                    active
                      ? "h-[11px] w-[11px] bg-[#d1081b]"
                      : "h-[9px] w-[9px] bg-[#e7d2ae] hover:bg-[#d8bb89]"
                  }
                `}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}