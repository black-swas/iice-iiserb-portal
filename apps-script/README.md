# Form endpoint (Google Apps Script)

`Code.gs` is the reference endpoint for every form on the website: contact, pitch, application, mentor, partner, booking and
newsletter. It checks the spam traps, validates the data, rate-limits by email address, saves a row in a Google Sheet,
emails the office, and replies with a reference number such as `APP-2026-000123`.
The design is in `docs/TRD.md` §10.2; the data contracts are in `docs/BACKEND_SCHEMA.md` §5 and §6.

It is only a reference. Any service that accepts the same JSON can replace it: change `NEXT_PUBLIC_FORM_ENDPOINT` and rebuild.

## Set it up

Use a Google account that IICE owns, not a personal one, so the data stays with IICE when people change roles.

1. **Create the spreadsheet.** A blank Google Sheet. Copy its id from the address bar
   (`docs.google.com/spreadsheets/d/<this part>/edit`). The script creates the tabs (`contact`, `pitch`, `applications`,
   `mentors`, `partners`, `bookings`, `newsletter`, and a hidden `_spam`) the first time each form is used.
2. **Create the script.** In the sheet, choose Extensions › Apps Script. Replace the contents of `Code.gs` with this
   repository's `apps-script/Code.gs`.
3. **Set the script properties** (Project settings › Script properties):

   | Property | Required | Meaning |
   | --- | --- | --- |
   | `SHEET_ID` | yes | The spreadsheet id from step 1 |
   | `NOTIFY_DEFAULT` | no | Address that gets an email for every submission |
   | `NOTIFY_APPLICATION`, `NOTIFY_BOOKING`, `NOTIFY_CONTACT`, `NOTIFY_PITCH`, `NOTIFY_MENTOR`, `NOTIFY_PARTNER`, `NOTIFY_NEWSLETTER` | no | A different address for one form (for example, bookings go to the facilities in-charge) |
   | `SITE_URL` | no | The website, for the "back to the site" link on the plain-HTML reply (default `https://iice.iiserb.ac.in`) |
   | `RATE_LIMIT` | no | Submissions allowed per email address per hour (default 5) |

4. **Deploy.** Deploy › New deployment › Web app. Execute as **Me**, who has access **Anyone**. Authorise the script when asked
   (it needs the spreadsheet, mail and script-properties scopes). Copy the web app URL, which ends in `/exec`.
5. **Schedule the spam clean-up.** In the editor, run `installTriggers` once. It adds a daily trigger that deletes
   discarded spam from the `_spam` tab after 30 days.
6. **Point the website at it.** Set `NEXT_PUBLIC_FORM_ENDPOINT` to the `/exec` URL in the build environment, then rebuild and
   deploy the site. Until it is set, the production site shows an email prompt instead of each form.

To check the deployment, open the `/exec` URL in a browser: it should answer `{"ok":true,"service":"iice-forms","version":1}`.

## How a submission travels

The page posts `FormEnvelope` JSON as `text/plain`, which a browser sends without a preflight request (Apps Script cannot
answer one). The same form also works with JavaScript off: the plain HTML form posts the fields by name (`applicant.name`),
the script rebuilds the same envelope from them, and answers with a small HTML page instead of JSON.

| Situation | Reply |
| --- | --- |
| Valid | `{ ok: true, id }` |
| Fields wrong | `{ ok: false, errors: { "applicant.email": "Enter a valid email address." } }` |
| Honeypot filled, or sent in under three seconds | `{ ok: true, id: "SPAM" }`, and the payload is kept in `_spam` for tuning |
| Over the rate limit | `{ ok: false, errors: {}, message: "Too many submissions. Please try again later." }` |

Apps Script always answers HTTP 200, so the page reads the JSON, not the status.

## Keep the rules in step with the site

The validation rules in `Code.gs` (between the `generated:rules` markers) are generated from the Zod schemas in
`src/content/forms.ts`. After changing a form's fields:

```
npm run form-rules          # rewrites src/content/form-rules.json and the block in Code.gs
npm run form-rules -- --check
```

then paste the updated `Code.gs` into the Apps Script project and deploy a new version. `npm run build` and the unit tests fail if
the generated block is out of date. The functions at the top of `Code.gs` that end in an underscore and use no Google services
(`validatePayload_`, `toPayload_`…) are a hand port of `src/lib/form-validate.ts`, and `tests/unit/form-rules.test.ts` runs the
two against the same fixtures: change one, change the other.

## Limits to know about

Apps Script limits email (about 100 a day on a consumer account, more on Workspace) and execution time. The spreadsheet is the
record: a failed notification never loses a submission. If volume grows, give each form its own `NOTIFY_*` address or move to a
different endpoint.
