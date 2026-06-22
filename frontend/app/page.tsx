import Image from "next/image";
import Logo from "@/assets/logo2.svg";
import CatFront from "@/assets/cat/cat-front.gif";
import ShaderBackground from "@/components/ShaderBackground";
import SfxLink from "@/components/SfxLink";
import BackgroundMusic from "@/components/BackgroundMusic";
import ScanlineOverlay from "@/components/landing/ScanlineOverlay";
import ParallaxScene from "@/components/landing/ParallaxScene";
import ParallaxLayer from "@/components/landing/ParallaxLayer";
import PixelSprite from "@/components/landing/PixelSprite";
import { SUN, CLOUD, STAR } from "@/components/landing/sprites";
import Reveal from "@/components/landing/Reveal";
import FarmParade from "@/components/landing/FarmParade";
import FeatureCard, { type Feature } from "@/components/landing/FeatureCard";

const FEATURES: Feature[] = [
  { icon: "⏱️", title: "Focus Timer", desc: "Pomodoro-style timer to keep your sessions structured." },
  { icon: "🌿", title: "Study Rooms", desc: "Join public rooms or create private ones with a password." },
  { icon: "😺", title: "Pet Companion", desc: "Your cat grows and reacts as you study together." },
  { icon: "✅", title: "Todo List", desc: "Track tasks per session and harvest them when done." },
  { icon: "💬", title: "Room Chat", desc: "Chat with fellow studiers without leaving the room." },
  { icon: "🏆", title: "Streaks & Badges", desc: "Stay consistent and unlock achievements over time." },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden z-[1]">
      <ShaderBackground />
      <BackgroundMusic src="/sounds/get_started_soundtrack.mp3" />
      <ScanlineOverlay />

      {/* ── Hero ─────────────────────────────────────────────────────────────
          A parallax stage: pixel-art sky sprites drift at different depths as the
          pointer moves, while the foreground content stays readable. */}
      <ParallaxScene className="relative">
        {/* Sky sprites — depth grows from far (stars) to near (low clouds). */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <ParallaxLayer depth={26} depthY={16} className="absolute top-10 right-[12%]">
            <PixelSprite {...SUN} pixel={6} className="animate-float drop-shadow-[0_0_22px_rgba(255,214,107,0.55)]" />
          </ParallaxLayer>

          <ParallaxLayer depth={46} depthY={22} className="absolute top-24 left-[9%]">
            <PixelSprite {...CLOUD} pixel={7} className="animate-cloudDrift" />
          </ParallaxLayer>
          <ParallaxLayer depth={60} depthY={28} className="absolute top-40 right-[28%]">
            <PixelSprite {...CLOUD} pixel={4} className="animate-cloudDrift [animation-delay:1.6s]" />
          </ParallaxLayer>

          <ParallaxLayer depth={12} className="absolute top-28 left-[26%]">
            <PixelSprite {...STAR} pixel={3} className="animate-float [animation-delay:0.6s]" />
          </ParallaxLayer>
          <ParallaxLayer depth={10} className="absolute top-16 left-[62%]">
            <PixelSprite {...STAR} pixel={4} className="animate-float [animation-delay:1.2s]" />
          </ParallaxLayer>
          <ParallaxLayer depth={16} className="absolute top-52 right-[16%]">
            <PixelSprite {...STAR} pixel={3} className="animate-float [animation-delay:1.9s]" />
          </ParallaxLayer>
        </div>

        {/* Foreground content. */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 gap-6 max-w-2xl mx-auto">
          <Image
            src={Logo.src}
            alt="Leap and Bound"
            width={140}
            height={130}
            unoptimized
            priority
            className="drop-shadow-lg animate-float"
          />

          <div className="animate-rise" style={{ animationDelay: "0.05s" }}>
            <h1 className="font-jersey text-5xl sm:text-6xl text-ink [text-shadow:3px_3px_0_#FFD66B] leading-tight">
              Leap and Bound
            </h1>
            <p className="font-press text-[9px] tracking-widest text-wood-dark mt-2">
              FOCUS · GROW · HARVEST
            </p>
          </div>

          <p
            className="font-pixelify text-lg text-ink/70 leading-relaxed max-w-md animate-rise"
            style={{ animationDelay: "0.15s" }}
          >
            A cozy pixel study space where you farm focus, grow habits, and study alongside your cat companion.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2 animate-rise" style={{ animationDelay: "0.25s" }}>
            <SfxLink href="/login" sfx="confirm" className="tag active cta-glow group text-base px-6 py-3">
              Get Started{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </SfxLink>
            <SfxLink href="/rooms" sfx="select" className="tag group text-base px-6 py-3 hover:bg-sun/60">
              Browse Rooms{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </SfxLink>
          </div>

          <div className="mt-3 animate-rise" style={{ animationDelay: "0.35s" }}>
            <ParallaxLayer depth={-12} depthY={-6} className="relative">
              <span className="absolute -top-2 -right-4 text-xl animate-float [animation-delay:0.4s]">✨</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CatFront.src}
                alt="Your study cat companion"
                className="relative z-[1] w-24 h-24 mx-auto [image-rendering:pixelated] animate-catBob"
              />
              <span className="block mx-auto -mt-2 w-20 h-3 rounded-[50%] bg-ink/15 blur-[1px]" />
            </ParallaxLayer>
          </div>
        </section>
      </ParallaxScene>

      {/* ── Horizon parade ───────────────────────────────────────────────── */}
      <FarmParade />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="relative max-w-[1000px] mx-auto px-6 pt-10 pb-20">
        <Reveal>
          <h2 className="font-press text-[10px] tracking-widest text-ink/50 text-center mb-8">
            WHAT YOU GET
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </section>

      {/* ── CTA footer ───────────────────────────────────────────────────── */}
      <section className="relative border-t-4 border-panel-stroke bg-panel/80 py-12 text-center px-6 overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-5 grass-tufts-lg opacity-70" />
        <Reveal>
          <p className="font-jersey text-3xl text-ink mb-5">Ready to start farming focus?</p>
          <SfxLink href="/login" sfx="confirm" className="tag active cta-glow group text-base px-8 py-3">
            Join the Farm{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </SfxLink>
        </Reveal>
      </section>
    </main>
  );
}
