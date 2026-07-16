import SectionHeading from "@/components/SectionHeading";
import CTASection from "@/components/CTASection";
import VideoBackground from "@/components/VideoBackground";

export const metadata = { title: "About | Shakti Foods" };

export default function AboutPage() {
  return (
    <main className="relative overflow-hidden pt-24 text-black md:pt-28">
      <VideoBackground
        src="/videos/farm.mp4"
        mobileSrc="/videos/farm-mobile.mp4"
        poster="/nature/rice-fields.svg"
        overlayClassName="bg-white/70 md:bg-white/62"
      />

      <section className="section-pad relative z-10 py-14 md:py-24">
        <div className="container-brand grid min-h-[70svh] items-center">
          <div className="mobile-card max-w-3xl rounded-[2rem] bg-white/78 p-5 text-black shadow-lift backdrop-blur-md md:rounded-[2.5rem] md:p-12">
            <SectionHeading
              eyebrow="About Shakti Foods"
              title="Power of Purity, presented with a stronger brand identity."
              text="Replace this sample text with your real company story, sourcing details, and what makes your rice and EcoWare products special."
            />
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <CTASection />
      </div>
    </main>
  );
}
