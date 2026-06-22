import Reveal from "./Reveal";

export type Feature = {
  icon: string;
  title: string;
  desc: string;
};

// A single "what you get" card. Scroll-reveals (staggered by `index`), lifts on
// hover, and wiggles its icon — the hover/lift polish lives in `.feature-card`
// (globals.css). Presentational + data-driven via the {@link Feature} shape.
export default function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <Reveal delay={index * 80}>
      <article className="panel feature-card group flex h-full flex-col gap-2">
        <span className="text-3xl">{feature.icon}</span>
        <h3 className="font-jersey text-2xl text-ink leading-none">{feature.title}</h3>
        <p className="font-pixelify text-sm text-ink/60 leading-snug">{feature.desc}</p>
      </article>
    </Reveal>
  );
}
