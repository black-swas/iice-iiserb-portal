import { Picture } from "./Picture";
import { SmartLink } from "./SmartLink";
import type { Image } from "@/content/schema";

export interface TimelineItem {
  id: string;
  /** The year or date label. */
  when: string;
  title: string;
  description: string;
  href?: string | undefined;
  image?: Image | undefined;
}

/** A vertical timeline for milestones. Plain list markup: it reads in order for every assistive technology. */
export function Timeline({ items }: { items: readonly TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.id} className="timeline__item">
          <p className="timeline__when">{item.when}</p>
          <div className="timeline__body">
            <h3 className="timeline__title">
              {item.href ? <SmartLink href={item.href}>{item.title}</SmartLink> : item.title}
            </h3>
            <p>{item.description}</p>
            {item.image ? (
              <Picture
                image={item.image}
                sizes="(min-width: 768px) 24rem, 90vw"
                className="timeline__image"
              />
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
