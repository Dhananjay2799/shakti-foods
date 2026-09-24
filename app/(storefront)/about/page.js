import Image from "next/image";
import {
  ArrowRight,
  Heart,
  Leaf,
  Wheat,
} from "lucide-react";

export const metadata = {
  title: "About | Shakti Foods",
  description:
    "Discover the story behind Shakti Foods, our commitment to premium Basmati rice, quality, tradition, and bringing people together around the table.",
};

const grainSteps = [
  {
    number: "01",
    title: "Selected With Care",
    description:
      "We source premium Basmati grains from the best growing regions.",
    image: "/images/about-grain-selected.jpg",
  },
  {
    number: "02",
    title: "Naturally Aged",
    description:
      "Carefully aged to develop natural aroma and exceptional flavor.",
    image: "/images/about-grain-aged.jpg",
  },
  {
    number: "03",
    title: "Prepared for Quality",
    description:
      "Long, elegant grains prepared so every meal begins with quality.",
    image: "/images/about-grain-quality.jpg",
  },
  {
    number: "04",
    title: "Brought to Your Table",
    description:
      "Made for everyday meals, celebrations, and moments shared together.",
    image: "/images/about-grain-table.jpg",
  },
];

const storyValues = [
  {
    icon: Leaf,
    title: "Purity",
    text: "Carefully selected quality.",
  },
  {
    icon: Wheat,
    title: "Tradition",
    text: "Made for meals that matter.",
  },
  {
    icon: Heart,
    title: "Togetherness",
    text: "Food that brings people closer.",
  },
];

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-[#fffaf2] text-[#17120f]">

      {/* =====================================================
          01. ABOUT HERO
          MOBILE
      ====================================================== */}

      <section className="relative min-h-[470px] overflow-hidden md:hidden">
        <Image
          src="/images/about-hero-mobile.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />

        {/* Soft left-side readability layer */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[linear-gradient(90deg,rgba(255,250,242,0.98)_0%,rgba(255,250,242,0.92)_42%,rgba(255,250,242,0.38)_68%,rgba(255,250,242,0.02)_100%)]
          "
        />

        <div
          className="
            relative
            z-10
            flex
            min-h-[470px]
            items-center
            px-5
            pb-8
            pt-[88px]
          "
        >
          <div className="w-[61%] max-w-[270px]">
            <div className="flex items-center gap-2">
              <span
                className="
                  text-[7px]
                  font-black
                  uppercase
                  tracking-[0.19em]
                  text-[#a45f13]
                "
              >
                About Shakti Foods
              </span>

              <span className="h-px w-6 bg-[#c98730]" />
            </div>

            <h1
              className="
                mt-2
                font-display
                text-[34px]
                font-bold
                leading-[0.87]
                tracking-[-0.045em]
              "
            >
              Rooted in Purity.
              <span className="block text-[#cf0a1c]">
                Made for
              </span>
              <span className="block text-[#cf0a1c]">
                Togetherness.
              </span>
            </h1>

            <p
              className="
                mt-3
                max-w-[250px]
                text-[9px]
                font-medium
                leading-[1.55]
                text-[#453c36]
              "
            >
              For generations, Shakti Foods has been bringing
              premium Basmati rice to tables around the world.
              Carefully sourced, naturally aged, and chosen for
              the moments that matter most.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          01. ABOUT HERO
          DESKTOP — UNCHANGED
      ====================================================== */}

      <section className="relative hidden min-h-[720px] overflow-hidden md:block lg:min-h-[760px]">
        <Image
          src="/images/about-hero-desktop.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          aria-hidden="true"
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[linear-gradient(90deg,rgba(255,250,242,0.98)_0%,rgba(255,250,242,0.94)_28%,rgba(255,250,242,0.62)_43%,rgba(255,250,242,0.08)_62%,transparent_75%)]
          "
        />

        <div
          className="
            container-brand
            relative
            z-10
            flex
            min-h-[760px]
            items-center
            px-10
            pt-20
            xl:px-12
          "
        >
          <div className="max-w-[570px]">
            <div className="flex items-center gap-3">
              <span
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.22em]
                  text-[#a45f13]
                "
              >
                About Shakti Foods
              </span>

              <span className="h-px w-10 bg-[#c98730]" />
            </div>

            <h1
              className="
                mt-4
                max-w-[520px]
                font-display
                text-[61px]
                font-bold
                leading-[0.9]
                tracking-[-0.045em]
                xl:text-[67px]
              "
            >
              Rooted in Purity.
              <span className="block text-[#cf0a1c]">
                Made for
              </span>
              <span className="block text-[#cf0a1c]">
                Togetherness.
              </span>
            </h1>

            <p
              className="
                mt-5
                max-w-[450px]
                text-[15px]
                font-medium
                leading-[1.65]
                text-[#453c36]
              "
            >
              For generations, Shakti Foods has been bringing
              premium Basmati rice to tables around the world.
              Carefully sourced, naturally aged, and chosen for the
              moments that matter most.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          02. OUR STORY
          MOBILE
      ====================================================== */}

      <section
        id="our-story"
        className="bg-[#fffaf2] md:hidden"
      >
        {/* IMAGE BANNER */}
        <div className="relative h-[205px] w-full overflow-hidden">
          <Image
            src="/images/about-story-mobile.jpg"
            alt="Premium Shakti Foods Basmati rice served at the table"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        {/* CONTENT */}
        <div className="px-5 pb-7 pt-6">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#c98730]" />

            <span
              className="
                text-[7px]
                font-black
                uppercase
                tracking-[0.2em]
                text-[#a45f13]
              "
            >
              Our Story
            </span>

            <span className="h-px w-6 bg-[#c98730]" />
          </div>

          <h2
            className="
              mt-2
              font-display
              text-[31px]
              font-bold
              leading-[0.9]
              tracking-[-0.04em]
            "
          >
            More Than Rice.
            <span className="block text-[#cf0a1c]">
              A Place at the Table.
            </span>
          </h2>

          <p
            className="
              mt-3
              text-[9px]
              leading-[1.6]
              text-[#514943]
            "
          >
            At Shakti Foods, we believe food is more than what
            we serve. It is how families gather, traditions
            continue, and everyday moments become memories.
          </p>

          <p
            className="
              mt-2
              text-[9px]
              leading-[1.6]
              text-[#514943]
            "
          >
            We are committed to bringing premium Basmati rice
            to homes, restaurants, and businesses across North
            America, with a focus on quality, consistency, and
            the people we serve.
          </p>

          {/* VALUES */}
          <div
            className="
              mt-5
              grid
              grid-cols-3
              divide-x
              divide-[#ead8ba]
              border-t
              border-[#ead8ba]
              pt-5
            "
          >
            {storyValues.map(
              ({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="px-1.5 text-center"
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-[38px]
                      w-[38px]
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#e8c58d]
                      bg-white
                      text-[#d1081b]
                    "
                  >
                    <Icon size={17} strokeWidth={1.7} />
                  </div>

                  <h3
                    className="
                      mt-2
                      text-[9px]
                      font-extrabold
                    "
                  >
                    {title}
                  </h3>

                  <p
                    className="
                      mx-auto
                      mt-1
                      max-w-[92px]
                      text-[6.5px]
                      leading-[1.35]
                      text-[#746b64]
                    "
                  >
                    {text}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          02. OUR STORY
          DESKTOP — UNCHANGED
      ====================================================== */}

      <section
        className="
          relative
          hidden
          overflow-hidden
          bg-[#fffaf2]
          md:block
        "
      >
        <div className="grid lg:min-h-[610px] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative min-h-[470px] lg:min-h-[610px]">
            <Image
              src="/images/about-story-desktop.jpg"
              alt="Premium Shakti Foods Basmati rice served at the table"
              fill
              sizes="(max-width: 1023px) 100vw, 52vw"
              className="object-cover object-center"
            />
          </div>

          <div
            className="
              relative
              flex
              items-center
              px-10
              py-12
              lg:px-14
              lg:py-16
              xl:px-20
            "
          >
            <div className="max-w-[590px]">
              <div className="flex items-center gap-3">
                <span className="h-px w-9 bg-[#c98730]" />

                <span
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.22em]
                    text-[#a45f13]
                  "
                >
                  Our Story
                </span>

                <span className="h-px w-9 bg-[#c98730]" />
              </div>

              <h2
                className="
                  mt-4
                  font-display
                  text-[50px]
                  font-bold
                  leading-[0.94]
                  tracking-[-0.04em]
                  xl:text-[57px]
                "
              >
                More Than Rice.
                <span className="block text-[#cf0a1c]">
                  A Place at the Table.
                </span>
              </h2>

              <p
                className="
                  mt-5
                  max-w-[540px]
                  text-[14px]
                  leading-[1.7]
                  text-[#514943]
                "
              >
                At Shakti Foods, we believe food is more than what
                we serve. It is how families gather, traditions
                continue, and everyday moments become memories.
              </p>

              <p
                className="
                  mt-3
                  max-w-[540px]
                  text-[14px]
                  leading-[1.7]
                  text-[#514943]
                "
              >
                We are committed to bringing premium Basmati rice
                to homes, restaurants, and businesses across North
                America, with a focus on quality, consistency, and
                the people we serve.
              </p>

              <div
                className="
                  mt-8
                  grid
                  grid-cols-3
                  divide-x
                  divide-[#ead8ba]
                  border-t
                  border-[#ead8ba]
                  pt-7
                "
              >
                {storyValues.map(
                  ({ icon: Icon, title, text }) => (
                    <div
                      key={title}
                      className="px-4 text-center"
                    >
                      <div
                        className="
                          mx-auto
                          flex
                          h-[46px]
                          w-[46px]
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-[#e8c58d]
                          bg-white
                          text-[#d1081b]
                        "
                      >
                        <Icon size={20} strokeWidth={1.7} />
                      </div>

                      <h3 className="mt-3 text-[12px] font-extrabold">
                        {title}
                      </h3>

                      <p
                        className="
                          mx-auto
                          mt-1
                          max-w-[120px]
                          text-[10px]
                          leading-[1.45]
                          text-[#746b64]
                        "
                      >
                        {text}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          03. OUR BELIEF
          DESKTOP + MOBILE
          IMAGE ALREADY CONTAINS TYPOGRAPHY
      ====================================================== */}

      <section className="relative overflow-hidden bg-[#fffaf2]">
        {/* MOBILE */}
        <div className="relative w-full md:hidden">
          <Image
            src="/images/about-belief-mobile.jpg"
            alt="The best meals aren't just remembered for how they taste. They're remembered for who was there."
            width={900}
            height={1200}
            sizes="100vw"
            className="block h-auto w-full"
          />
        </div>

        {/* DESKTOP */}
        <div className="relative hidden w-full md:block">
          <Image
            src="/images/about-belief-desktop.jpg"
            alt="The best meals aren't just remembered for how they taste. They're remembered for who was there."
            width={1920}
            height={650}
            sizes="100vw"
            className="block h-auto w-full"
          />
        </div>
      </section>

      {/* =====================================================
          04. FROM GRAIN TO TABLE
          MOBILE
      ====================================================== */}

      <section
        className="
          bg-[#fffaf2]
          px-4
          pb-8
          pt-7
          md:hidden
        "
      >
        {/* TITLE */}
        <div
          className="
            mb-5
            flex
            items-center
            justify-center
            gap-2.5
          "
        >
          <span className="h-px w-8 bg-[#d5a254]" />

          <span
            className="
              whitespace-nowrap
              text-[7px]
              font-black
              uppercase
              tracking-[0.2em]
              text-[#c90019]
            "
          >
            From Grain to Table
          </span>

          <span className="h-px w-8 bg-[#d5a254]" />
        </div>

        {/* MOBILE PROCESS LIST */}
        <div className="mx-auto max-w-[430px] space-y-3">
          {grainSteps.map((step) => (
            <div
              key={step.number}
              className="
                grid
                grid-cols-[92px_1fr]
                items-center
                gap-3
              "
            >
              {/* IMAGE */}
              <div
                className="
                  relative
                  h-[66px]
                  overflow-hidden
                  rounded-[8px]
                  border
                  border-[#eadcc6]
                  bg-white
                "
              >
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  sizes="92px"
                  className="object-cover object-center"
                />
              </div>

              {/* CONTENT */}
              <div
                className="
                  grid
                  grid-cols-[30px_1fr]
                  items-start
                  gap-2
                "
              >
                {/* NUMBER */}
                <div
                  className="
                    flex
                    h-[27px]
                    w-[27px]
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-[#cf0a1c]
                    bg-white
                    text-[7px]
                    font-black
                    text-[#cf0a1c]
                  "
                >
                  {step.number}
                </div>

                {/* TEXT */}
                <div>
                  <h3
                    className="
                      font-display
                      text-[13px]
                      font-bold
                      leading-[1.05]
                      text-[#17120f]
                    "
                  >
                    {step.title}
                  </h3>

                  <p
                    className="
                      mt-1
                      max-w-[230px]
                      text-[7px]
                      leading-[1.45]
                      text-[#665d56]
                    "
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          04. FROM GRAIN TO TABLE
          DESKTOP — UNCHANGED
      ====================================================== */}

      <section
        className="
          hidden
          bg-[#fffaf2]
          px-7
          py-20
          md:block
        "
      >
        <div className="container-brand">
          <div
            className="
              mb-10
              flex
              items-center
              justify-center
              gap-4
            "
          >
            <span className="h-px w-12 bg-[#d5a254]" />

            <span
              className="
                text-[9px]
                font-black
                uppercase
                tracking-[0.24em]
                text-[#c90019]
              "
            >
              From Grain to Table
            </span>

            <span className="h-px w-12 bg-[#d5a254]" />
          </div>

          <div
            className="
              grid
              gap-7
              md:grid-cols-2
              lg:grid-cols-4
              lg:gap-6
            "
          >
            {grainSteps.map((step, index) => (
              <div
                key={step.number}
                className="relative"
              >
                <div
                  className="
                    h-full
                    overflow-hidden
                    rounded-[18px]
                    border
                    border-[#eadcc6]
                    bg-white
                    shadow-[0_12px_30px_rgba(84,54,24,0.07)]
                  "
                >
                  <div
                    className="
                      relative
                      aspect-[4/3]
                      overflow-hidden
                      lg:aspect-[16/10]
                    "
                  >
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      sizes="
                        (max-width:1023px) 50vw,
                        25vw
                      "
                      className="
                        object-cover
                        object-center
                        transition-transform
                        duration-500
                        hover:scale-[1.04]
                      "
                    />
                  </div>

                  {/* NUMBER */}
                  <div className="flex justify-center bg-white pt-4">
                    <div
                      className="
                        flex
                        h-[42px]
                        w-[42px]
                        items-center
                        justify-center
                        rounded-full
                        bg-[#cf0a1c]
                        text-[11px]
                        font-black
                        text-white
                        shadow-[0_5px_14px_rgba(207,10,28,0.18)]
                      "
                    >
                      {step.number}
                    </div>
                  </div>

                  {/* COPY */}
                  <div
                    className="
                      min-h-[140px]
                      px-5
                      pb-6
                      pt-3
                      text-center
                    "
                  >
                    <h3
                      className="
                        font-display
                        text-[20px]
                        font-bold
                        leading-tight
                      "
                    >
                      {step.title}
                    </h3>

                    <p
                      className="
                        mx-auto
                        mt-2
                        max-w-[230px]
                        text-[11px]
                        leading-[1.6]
                        text-[#665d56]
                      "
                    >
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* ARROW — LARGE DESKTOP ONLY */}
                {index < grainSteps.length - 1 && (
                  <div
                    className="
                      absolute
                      -right-[28px]
                      top-[27%]
                      z-20
                      hidden
                      h-[34px]
                      w-[34px]
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#ead7b8]
                      bg-[#fffaf2]
                      text-[#c78327]
                      shadow-[0_4px_12px_rgba(77,47,17,0.08)]
                      lg:flex
                    "
                    aria-hidden="true"
                  >
                    <ArrowRight
                      size={17}
                      strokeWidth={1.8}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}