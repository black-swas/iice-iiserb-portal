import { Mail, Phone } from "lucide-react";
import type { Person } from "@/content/schema";
import { display } from "@/content/todo";
import { telHref } from "@/lib/contact";
import { t } from "@/lib/i18n";
import { Monogram } from "./Monogram";
import { Picture } from "./Picture";

/** "Prof. Gobardhan Das": the honorific, if there is one, and the name. */
export const personName = (person: Pick<Person, "honorific" | "name">) =>
  [person.honorific, person.name].filter(Boolean).join(" ");

/** A team member: photo or initials, name, role, and plain `mailto:` and `tel:` links (SPEC §4.5). */
export function PersonCard({ person }: { person: Person }) {
  const name = personName(person);
  return (
    <article className="person-card">
      {person.photo ? (
        <Picture image={person.photo} sizes="6rem" className="person-card__photo" />
      ) : (
        <Monogram name={person.name} className="person-card__photo" />
      )}
      <div className="person-card__body">
        <h3 className="person-card__name">{name}</h3>
        {person.team ? <p className="person-card__role">{display(person.team.role)}</p> : null}
        {person.designation ? (
          <p className="person-card__designation">{display(person.designation)}</p>
        ) : null}
        {person.bio ? <p className="person-card__bio">{display(person.bio)}</p> : null}
        <ul className="person-card__contact">
          {person.email ? (
            <li>
              <a href={`mailto:${person.email}`} aria-label={t("pages.team.emailPerson", { name })}>
                <Mail aria-hidden="true" />
                {person.email}
              </a>
            </li>
          ) : null}
          {person.phone ? (
            <li>
              <a href={telHref(person.phone)} aria-label={t("pages.team.phonePerson", { name })}>
                <Phone aria-hidden="true" />
                {person.phone}
              </a>
            </li>
          ) : null}
        </ul>
      </div>
    </article>
  );
}
