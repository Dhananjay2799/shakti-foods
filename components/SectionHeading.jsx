export default function SectionHeading({ eyebrow, title, text, light = false }) {
  return (
    <div className="max-w-3xl">
      <p className={`text-xs font-bold uppercase tracking-[.22em] md:text-sm md:tracking-[.28em] ${light ? "text-white/65" : "text-black"}`}>
        {eyebrow}
      </p>
      <h2 className={`mobile-section-title mt-3 font-display font-bold md:text-6xl ${light ? "text-white" : "text-black"}`}>
        {title}
      </h2>
      {text ? (
        <p className={`mt-4 text-base leading-7 md:mt-5 md:text-lg md:leading-8 ${light ? "text-white/75" : "text-black"}`}>
          {text}
        </p>
      ) : null}
    </div>
  );
}
