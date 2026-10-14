import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BackedBySection, prepareBackedBy } from "@/components/sections/BackedBySection";
import { HappeningSection, prepareHappening } from "@/components/sections/HappeningSection";
import { ConstellationSection } from "@/components/sections/WhyTiles";
import { Hero } from "@/components/sections/Hero";
import { ImpactSection, prepareImpact } from "@/components/sections/ImpactSection";
import { JourneySection, prepareJourney } from "@/components/sections/JourneySection";
import { LogoCarousel, prepareLogos } from "@/components/sections/LogoCarousel";
import { PathsSection, preparePaths } from "@/components/sections/PathsSection";
import { PitchBand } from "@/components/sections/PitchBand";
import { SpotlightSection, prepareSpotlight } from "@/components/sections/SpotlightSection";
import {
  TestimonialsSection,
  prepareTestimonials,
} from "@/components/sections/TestimonialsSection";
import { WhySection, prepareWhy } from "@/components/sections/WhySection";
import { getSiteSettings } from "@/content/loaders";
import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: { absolute: t("site.defaultTitle") },
    description: t("site.description"),
    path: "/",
  });
}

interface Entry {
  key: string;
  /** Numbered sections get "01 /", "02 /"… in the order they actually appear; the logo strip is not numbered. */
  numbered: boolean;
  render: (number: number) => ReactNode;
}

/**
 * The home page's 14 sections (SPEC §3): utility bar and header (from the layout), hero, impact, why IICE, journey,
 * paths, spotlight, logo strip, what's happening, testimonials, backed by, the pitch band, and the footer (layout).
 * A section with nothing honest to show is skipped, and the ordinals are counted from what remains, so "03 /" is never
 * left after a hidden "02 /".
 */
export default function HomePage() {
  getSiteSettings();
  const impact = prepareImpact();
  const why = prepareWhy();
  const paths = preparePaths();
  const spotlight = prepareSpotlight();
  const logos = prepareLogos();
  const happening = prepareHappening();
  const testimonials = prepareTestimonials();
  const backedBy = prepareBackedBy();

  const entries: (Entry | null)[] = [
    impact && {
      key: "impact",
      numbered: true,
      render: (n) => <ImpactSection stats={impact} number={n} />,
    },
    why && { key: "why", numbered: true, render: (n) => <WhySection tiles={why} number={n} /> },
    prepareJourney()
      ? { key: "journey", numbered: true, render: (n) => <JourneySection number={n} /> }
      : null,
    paths && {
      key: "paths",
      numbered: true,
      render: (n) => <PathsSection cards={paths} number={n} />,
    },
    spotlight && {
      key: "spotlight",
      numbered: true,
      render: (n) => <SpotlightSection items={spotlight} number={n} />,
    },
    logos && { key: "logos", numbered: false, render: () => <LogoCarousel logos={logos} /> },
    happening && {
      key: "happening",
      numbered: true,
      render: (n) => <HappeningSection data={happening} number={n} />,
    },
    testimonials && {
      key: "testimonials",
      numbered: true,
      render: (n) => <TestimonialsSection items={testimonials} number={n} />,
    },
    backedBy && {
      key: "backed",
      numbered: true,
      render: (n) => <BackedBySection groups={backedBy} number={n} />,
    },
  ];

  let counter = 0;
  return (
    <>
      <Hero />
      <ConstellationSection />
      {entries.flatMap((entry) => {
        if (!entry) return [];
        if (entry.numbered) counter += 1;
        return [<div key={entry.key}>{entry.render(counter)}</div>];
      })}
      <PitchBand />
    </>
  );
}
