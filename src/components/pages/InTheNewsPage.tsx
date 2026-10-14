import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartLink } from "@/components/ui/SmartLink";
import { getCollection } from "@/content/loaders";
import type { PressItem } from "@/content/schema";
import { display } from "@/content/todo";
import { formatDate } from "@/lib/dates";
import { enumLabel, t } from "@/lib/i18n";
import { crumbs } from "./crumbs";
import { sortPress } from "./press";
import type { PageDef } from "./types";

/** Press coverage: outlet, date, a linked headline and a type badge. Links leave the site, so they say so (SmartLink). */
export function PressList({ items }: { items: readonly PressItem[] }) {
  return (
    <ul className="press-list">
      {items.map((item) => (
        <li key={item.slug} className="press-list__item">
          <p className="press-list__meta">
            <Badge>{enumLabel("pressType", item.type)}</Badge>
            <span>{item.outlet}</span>
            <time dateTime={item.date}>{formatDate(item.date)}</time>
          </p>
          <h3 className="press-list__title">
            <SmartLink href={item.url}>{display(item.title)}</SmartLink>
          </h3>
        </li>
      ))}
    </ul>
  );
}

export const inTheNewsPage: PageDef = {
  meta: () => ({ title: t("pages.press.title"), description: t("pages.press.description") }),
  render: () => (
    <>
      <PageHeader
        trail={[crumbs.about(), { label: t("pages.press.title") }]}
        eyebrow={t("pages.crumbs.about")}
        title={t("pages.press.title")}
        lead={t("pages.press.description")}
      />
      <div className="wrapper py-section">
        <PressList items={sortPress(getCollection("press"))} />
      </div>
    </>
  ),
};
