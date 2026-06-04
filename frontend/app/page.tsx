import Image from "next/image";
import Link from "next/link";
import Logo from "@/assets/logo2.svg";
import CatGifSrc from "@/assets/cat/cat-front.gif";
import ShaderBackground from "@/components/ShaderBackground";

const FEATURES = [
  { icon: "⏱️", title: "Focus Timer", desc: "Pomodoro-style timer to keep your sessions structured." },
  { icon: "🌿", title: "Study Rooms", desc: "Join public rooms or create private ones with a password." },
  { icon: "😺", title: "Pet Companion", desc: "Your cat grows and reacts as you study together." },
  { icon: "✅", title: "Todo List", desc: "Track tasks per session and harvest them when done." },
  { icon: "💬", title: "Room Chat", desc: "Chat with fellow studiers without leaving the room." },
  { icon: "🏆", title: "Streaks & Badges", desc: "Stay consistent and unlock achievements over time." },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen z-[1]">
      <ShaderBackground />
      
    
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 gap-6 max-w-2xl mx-auto">
        <Image
          src={Logo.src}
          alt="Meowdow Study Farm"
          width={140}
          height={130}
          unoptimized
          className="drop-shadow-lg"
        />
        <div>
          <h1 className="font-jersey text-5xl sm:text-6xl text-ink [text-shadow:3px_3px_0_#FFD66B] leading-tight">
            Meowdow Study Farm
          </h1>
          <p className="font-press text-[9px] tracking-widest text-wood-dark mt-2">
            FOCUS · GROW · HARVEST
          </p>
        </div>

        <p className="font-pixelify text-lg text-ink/70 leading-relaxed max-w-md">
          A cozy pixel study space where you farm focus, grow habits, and study alongside your cat companion.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/login"
            className="tag text-base px-6 py-3 hover:bg-sun"
          >
            Get Started →
          </Link>
          <Link
            href="/rooms"
            className="tag text-base px-6 py-3 hover:bg-sun/60"
          >
            Browse Rooms
          </Link>
        </div>

        {/* Cat gif */}
        <div className="mt-4 relative w-20 h-20 border-[4px] border-panel-stroke bg-day-sky overflow-hidden">
          <Image src={CatGifSrc.src} alt="cat" fill className="object-cover" unoptimized />
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-[1000px] mx-auto px-6 pb-20">
        <h2 className="font-press text-[10px] tracking-widest text-ink/50 text-center mb-8">
          WHAT YOU GET
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel flex flex-col gap-2">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-jersey text-2xl text-ink leading-none">{f.title}</h3>
              <p className="font-pixelify text-sm text-ink/60 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer strip */}
      <section className="border-t-4 border-panel-stroke bg-panel/80 py-10 text-center px-6">
        <p className="font-jersey text-3xl text-ink mb-4">Ready to start farming focus?</p>
        <Link href="/login" className="tag text-base px-8 py-3 hover:bg-sun">
          Join the Farm →
        </Link>
      </section>
    </main>
  );

}
