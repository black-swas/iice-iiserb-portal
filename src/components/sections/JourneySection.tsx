import { SectionHeader } from "@/components/ui/SectionHeader";
import { getHomePage, getStages } from "@/content/loaders";
import { JourneyLadder } from "./JourneyLadder";

export const prepareJourney = () => getStages().length > 0;

/** Home §6, "Your incubation journey": the three stages as a ladder (SPEC §3 #6). */
export function JourneySection({ number }: { number: number }) {
  const copy = getHomePage().sectionTitles.journey;
  return (
    <section aria-labelledby="journey-title" className="home-section py-section">
      <SectionHeader
        id="journey-title"
        eyebrow={copy.eyebrow}
        number={number}
        title={copy.title}
        subline={copy.subline}
      />
      <div className="wrapper-wide">
        <JourneyLadder />
      </div>
    </section>
  );
}
