/**
 * IICE website form endpoint: reference implementation (docs/TRD.md §10.2, docs/BACKEND_SCHEMA.md §5 and §6).
 *
 * One Google Apps Script web app receives every form on the site (contact, pitch, application, mentor, partner,
 * booking, newsletter). For each submission it checks the spam traps, validates the data, rate-limits by email address,
 * appends a row to the matching tab of a Google Sheet, emails the office and replies with the reference number.
 * Setup and deployment steps are in apps-script/README.md.
 *
 * The validation rules below the "generated:rules" marker are generated from the Zod schemas in
 * src/content/forms.ts by `npm run form-rules`. Never edit that block by hand. The functions that end in an underscore
 * and use no Google services (validatePayload_, toPayload_ and friends) are a hand-port of src/lib/form-validate.ts;
 * tests/unit/form-rules.test.ts runs both against the same fixtures, so a change to one must be made to the other.
 *
 * Script properties (Project settings > Script properties):
 *   SHEET_ID        required   the id of the spreadsheet that stores submissions
 *   NOTIFY_DEFAULT  optional   address that receives a notification for every submission
 *   NOTIFY_<TYPE>   optional   a different address for one form, e.g. NOTIFY_BOOKING, NOTIFY_APPLICATION
 *   SITE_URL        optional   the website, for the "back to the site" link (default https://iice.iiserb.ac.in)
 *   RATE_LIMIT      optional   submissions allowed per email address per hour (default 5)
 */

var SERVICE_ = "iice-forms";
var FORM_TABS_ = {
  contact: "contact",
  pitch: "pitch",
  application: "applications",
  mentor: "mentors",
  partner: "partners",
  booking: "bookings",
  newsletter: "newsletter",
};
var ID_PREFIX_ = {
  contact: "CON",
  pitch: "PIT",
  application: "APP",
  mentor: "MEN",
  partner: "PAR",
  booking: "BKG",
  newsletter: "NWS",
};
var FORM_LABELS_ = {
  contact: "contact message",
  pitch: "pitch",
  application: "incubation application",
  mentor: "mentor offer",
  partner: "partnership enquiry",
  booking: "booking request",
  newsletter: "newsletter sign-up",
};
var SPAM_TAB_ = "_spam";
var MIN_FILL_MS_ = 3000;
var SPAM_KEEP_DAYS_ = 30;
var DEFAULT_RATE_LIMIT_ = 5;
var RESERVED_FIELDS_ = {
  formType: 1,
  schemaVersion: 1,
  submittedAt: 1,
  startedAt: 1,
  pageUrl: 1,
  locale: 1,
  website: 1,
  consent: 1,
};

// <generated:rules> Do not edit: run `npm run form-rules`.
const RULES_ = {
  "version": 1,
  "forms": {
    "contact": {
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 2,
            "maxLength": 100
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "phone": {
            "type": "string",
            "pattern": "^[+\\d][\\d\\s-]{7,17}$"
          },
          "organisation": {
            "type": "string",
            "maxLength": 120
          },
          "topic": {
            "type": "string",
            "enum": [
              "incubation",
              "partnership-funding",
              "mentoring",
              "facilities-bookings",
              "media",
              "careers",
              "birac-edge",
              "event-invite",
              "other"
            ]
          },
          "message": {
            "type": "string",
            "minLength": 20,
            "maxLength": 3000
          }
        },
        "required": [
          "name",
          "email",
          "topic",
          "message"
        ]
      },
      "conditions": []
    },
    "pitch": {
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 2,
            "maxLength": 100
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "phone": {
            "type": "string",
            "pattern": "^[+\\d][\\d\\s-]{7,17}$"
          },
          "ventureName": {
            "type": "string",
            "minLength": 2,
            "maxLength": 100
          },
          "oneLiner": {
            "type": "string",
            "minLength": 20,
            "maxLength": 200
          },
          "stage": {
            "type": "string",
            "enum": [
              "idea",
              "proof-of-concept",
              "prototype",
              "early-revenue",
              "scaling"
            ]
          },
          "sector": {
            "type": "string",
            "enum": [
              "healthcare-bioengineering",
              "environment-agriculture",
              "iot-ai",
              "social-rural-development",
              "computational-sciences-it",
              "other"
            ]
          },
          "affiliation": {
            "type": "string",
            "enum": [
              "iiserb-faculty",
              "iiserb-former-faculty",
              "iiserb-student",
              "iiserb-alumni",
              "partner-university",
              "external"
            ]
          },
          "assistanceSought": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "incubation-space",
                "lab-access",
                "mentoring",
                "funding",
                "ip-legal",
                "market-access"
              ]
            }
          },
          "deckUrl": {
            "type": "string",
            "format": "uri"
          }
        },
        "required": [
          "name",
          "email",
          "ventureName",
          "oneLiner",
          "stage"
        ]
      },
      "conditions": []
    },
    "application": {
      "schema": {
        "type": "object",
        "properties": {
          "context": {
            "type": "object",
            "properties": {
              "track": {
                "type": "string",
                "enum": [
                  "physical",
                  "virtual",
                  "pre-incubation",
                  "co-development"
                ]
              },
              "stage": {
                "type": "string",
                "enum": [
                  "catalyse",
                  "culture",
                  "commercialise"
                ]
              },
              "schemeSlug": {
                "type": "string",
                "maxLength": 80,
                "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
              },
              "opportunitySlug": {
                "type": "string",
                "maxLength": 80,
                "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
              }
            }
          },
          "applicant": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "minLength": 2,
                "maxLength": 100
              },
              "email": {
                "type": "string",
                "format": "email"
              },
              "phone": {
                "type": "string",
                "pattern": "^[+\\d][\\d\\s-]{7,17}$"
              },
              "affiliation": {
                "type": "string",
                "enum": [
                  "iiserb-faculty",
                  "iiserb-former-faculty",
                  "iiserb-student",
                  "iiserb-alumni",
                  "partner-university",
                  "external"
                ]
              },
              "institution": {
                "type": "string",
                "maxLength": 160
              },
              "iiserbMentor": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 2
                  },
                  "email": {
                    "type": "string",
                    "format": "email"
                  },
                  "department": {
                    "type": "string"
                  }
                },
                "required": [
                  "name",
                  "email"
                ]
              },
              "linkedin": {
                "type": "string",
                "format": "uri"
              }
            },
            "required": [
              "name",
              "email",
              "phone",
              "affiliation"
            ]
          },
          "venture": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "minLength": 2,
                "maxLength": 100
              },
              "incorporated": {
                "type": "boolean"
              },
              "legalEntity": {
                "type": "string",
                "enum": [
                  "pvt-ltd",
                  "llp",
                  "partnership",
                  "proprietorship",
                  "section-8",
                  "not-yet"
                ]
              },
              "incorporationDate": {
                "type": "string",
                "format": "date"
              },
              "website": {
                "type": "string",
                "format": "uri"
              },
              "sector": {
                "type": "string",
                "enum": [
                  "healthcare-bioengineering",
                  "environment-agriculture",
                  "iot-ai",
                  "social-rural-development",
                  "computational-sciences-it",
                  "other"
                ]
              },
              "stage": {
                "type": "string",
                "enum": [
                  "idea",
                  "proof-of-concept",
                  "prototype",
                  "early-revenue",
                  "scaling"
                ]
              },
              "problem": {
                "type": "string",
                "minLength": 50,
                "maxLength": 1500
              },
              "solution": {
                "type": "string",
                "minLength": 50,
                "maxLength": 1500
              },
              "market": {
                "type": "string",
                "minLength": 30,
                "maxLength": 1500
              },
              "teamSize": {
                "type": "integer",
                "minimum": 1,
                "maximum": 500
              },
              "team": {
                "maxItems": 10,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "role": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string",
                      "format": "email"
                    }
                  },
                  "required": [
                    "name",
                    "role"
                  ]
                }
              },
              "fundingToDate": {
                "type": "string",
                "maxLength": 300
              }
            },
            "required": [
              "name",
              "incorporated",
              "sector",
              "stage",
              "problem",
              "solution",
              "market",
              "teamSize"
            ]
          },
          "technology": {
            "type": "object",
            "properties": {
              "ipStatus": {
                "type": "string",
                "enum": [
                  "none",
                  "in-preparation",
                  "filed",
                  "granted",
                  "licensed-in"
                ]
              },
              "developedAtIiserb": {
                "type": "boolean"
              },
              "ipDetails": {
                "type": "string",
                "maxLength": 1500
              },
              "patentNumbers": {
                "maxItems": 10,
                "type": "array",
                "items": {
                  "type": "string",
                  "maxLength": 40
                }
              },
              "ipDocsUrl": {
                "type": "string",
                "format": "uri"
              }
            },
            "required": [
              "ipStatus",
              "developedAtIiserb"
            ]
          },
          "needs": {
            "type": "object",
            "properties": {
              "preferredStage": {
                "type": "string",
                "enum": [
                  "catalyse",
                  "culture",
                  "commercialise"
                ]
              },
              "officeSeats": {
                "type": "integer",
                "minimum": 0,
                "maximum": 50
              },
              "labSpace": {
                "type": "boolean"
              },
              "equipment": {
                "type": "string",
                "maxLength": 800
              },
              "mentoringAreas": {
                "type": "array",
                "items": {
                  "type": "string",
                  "enum": [
                    "technical",
                    "business",
                    "ip-legal",
                    "regulatory",
                    "fundraising",
                    "marketing"
                  ]
                }
              }
            },
            "required": [
              "preferredStage",
              "officeSeats",
              "labSpace"
            ]
          },
          "documents": {
            "type": "object",
            "properties": {
              "businessPlanUrl": {
                "type": "string",
                "format": "uri"
              }
            },
            "required": [
              "businessPlanUrl"
            ]
          },
          "declarations": {
            "type": "object",
            "properties": {
              "infoAccurate": {
                "type": "boolean",
                "const": true
              },
              "agreeToPolicy": {
                "type": "boolean",
                "const": true
              }
            },
            "required": [
              "infoAccurate",
              "agreeToPolicy"
            ]
          }
        },
        "required": [
          "applicant",
          "venture",
          "technology",
          "needs",
          "documents",
          "declarations"
        ]
      },
      "conditions": [
        {
          "code": "mentorRequired",
          "when": [
            {
              "path": "applicant.affiliation",
              "in": [
                "partner-university",
                "external"
              ]
            }
          ],
          "require": [
            "applicant.iiserbMentor.name",
            "applicant.iiserbMentor.email"
          ],
          "errorPath": "applicant.iiserbMentor.name",
          "message": "Applicants from partner universities or outside IISER Bhopal need an IISER Bhopal faculty mentor or collaborator."
        },
        {
          "code": "ipDocsRequired",
          "when": [
            {
              "path": "technology.developedAtIiserb",
              "equals": true
            },
            {
              "path": "technology.ipStatus",
              "in": [
                "filed",
                "granted"
              ]
            }
          ],
          "require": [
            "technology.ipDocsUrl"
          ],
          "errorPath": "technology.ipDocsUrl",
          "message": "For IP developed at IISER Bhopal, share a link to the filed or granted patent application."
        },
        {
          "code": "legalEntityRequired",
          "when": [
            {
              "path": "venture.incorporated",
              "equals": true
            }
          ],
          "require": [
            "venture.legalEntity"
          ],
          "errorPath": "venture.legalEntity",
          "message": "Select the legal entity type."
        }
      ]
    },
    "mentor": {
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 2,
            "maxLength": 100
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "phone": {
            "type": "string",
            "pattern": "^[+\\d][\\d\\s-]{7,17}$"
          },
          "linkedin": {
            "type": "string",
            "format": "uri"
          },
          "title": {
            "type": "string",
            "maxLength": 100
          },
          "organisation": {
            "type": "string",
            "maxLength": 120
          },
          "types": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "business",
                "finance",
                "technical",
                "legal",
                "ip",
                "regulatory",
                "clinical-domain",
                "marketing"
              ]
            }
          },
          "sectors": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "healthcare-bioengineering",
                "environment-agriculture",
                "iot-ai",
                "social-rural-development",
                "computational-sciences-it",
                "other"
              ]
            }
          },
          "expertise": {
            "type": "string",
            "minLength": 20,
            "maxLength": 800
          },
          "engagement": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "one-to-one",
                "workshops",
                "jury-evaluation",
                "office-hours",
                "investor-connect"
              ]
            }
          },
          "hoursPerMonth": {
            "type": "integer",
            "minimum": 1,
            "maximum": 40
          }
        },
        "required": [
          "name",
          "email",
          "title",
          "organisation",
          "types",
          "sectors",
          "expertise",
          "engagement"
        ]
      },
      "conditions": []
    },
    "partner": {
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 2,
            "maxLength": 100
          },
          "designation": {
            "type": "string",
            "maxLength": 100
          },
          "organisation": {
            "type": "string",
            "maxLength": 160
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "phone": {
            "type": "string",
            "pattern": "^[+\\d][\\d\\s-]{7,17}$"
          },
          "partnershipType": {
            "minItems": 1,
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "co-invest",
                "csr",
                "sponsor-challenge",
                "pilot-customer",
                "academic",
                "mentor-network",
                "other"
              ]
            }
          },
          "sectorFocus": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "healthcare-bioengineering",
                "environment-agriculture",
                "iot-ai",
                "social-rural-development",
                "computational-sciences-it",
                "other"
              ]
            }
          },
          "fundsAvailable": {
            "type": "string",
            "maxLength": 100
          },
          "message": {
            "type": "string",
            "minLength": 20,
            "maxLength": 2000
          }
        },
        "required": [
          "name",
          "designation",
          "organisation",
          "email",
          "partnershipType",
          "message"
        ]
      },
      "conditions": []
    },
    "booking": {
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "minLength": 2,
            "maxLength": 100
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "phone": {
            "type": "string",
            "pattern": "^[+\\d][\\d\\s-]{7,17}$"
          },
          "organisation": {
            "type": "string",
            "maxLength": 160
          },
          "userCategory": {
            "type": "string",
            "enum": [
              "incubatee",
              "iiserb",
              "external-academic",
              "industry"
            ]
          },
          "facilitySlug": {
            "type": "string",
            "maxLength": 80,
            "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "instrumentSlug": {
            "type": "string",
            "maxLength": 80,
            "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "preferredDates": {
            "minItems": 1,
            "maxItems": 3,
            "type": "array",
            "items": {
              "type": "string",
              "format": "date"
            }
          },
          "durationEstimate": {
            "type": "string",
            "maxLength": 60
          },
          "sampleDetails": {
            "type": "string",
            "maxLength": 800
          },
          "notes": {
            "type": "string",
            "maxLength": 800
          }
        },
        "required": [
          "name",
          "email",
          "phone",
          "organisation",
          "userCategory",
          "preferredDates",
          "durationEstimate"
        ]
      },
      "conditions": [
        {
          "code": "targetRequired",
          "when": [],
          "requireAny": [
            "facilitySlug",
            "instrumentSlug"
          ],
          "errorPath": "instrumentSlug",
          "message": "Choose a facility or an instrument."
        }
      ]
    },
    "newsletter": {
      "schema": {
        "type": "object",
        "properties": {
          "email": {
            "type": "string",
            "format": "email"
          },
          "interests": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "calls",
                "events",
                "news"
              ]
            }
          }
        },
        "required": [
          "email"
        ]
      },
      "conditions": []
    }
  }
};
// </generated:rules>

// ── Pure helpers (no Google services; hand-port of src/lib/form-validate.ts) ──────────────────────────

var EMAIL_ = /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
var HTTPS_URL_ = /^https:\/\/[^\s/$.?#][^\s]*$/i;
var DATE_ = /^(\d{4})-(\d{2})-(\d{2})$/;
var DATE_TIME_ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function isMissing_(value) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function isRealDate_(text) {
  var m = DATE_.exec(text);
  if (!m) return false;
  var year = Number(m[1]);
  var month = Number(m[2]);
  var day = Number(m[3]);
  var d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function checkString_(schema, raw, path, out) {
  var text = raw.trim();
  if (schema.enum && schema.enum.indexOf(text) < 0) {
    out.push({ path: path, code: "choice" });
    return;
  }
  if (schema.minLength !== undefined && text.length < schema.minLength)
    out.push({ path: path, code: "tooShort", limit: schema.minLength });
  if (schema.maxLength !== undefined && text.length > schema.maxLength)
    out.push({ path: path, code: "tooLong", limit: schema.maxLength });
  if (schema.format === "email" && !EMAIL_.test(text)) out.push({ path: path, code: "email" });
  else if (schema.format === "uri" && !HTTPS_URL_.test(text)) out.push({ path: path, code: "url" });
  else if (schema.format === "date" && !isRealDate_(text)) out.push({ path: path, code: "date" });
  else if (schema.format === "date-time" && !DATE_TIME_.test(text)) out.push({ path: path, code: "date" });
  else if (schema.pattern && !new RegExp(schema.pattern).test(text)) out.push({ path: path, code: "pattern" });
}

function check_(schema, value, path, out) {
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") out.push({ path: path, code: "type" });
      else checkString_(schema, value, path, out);
      return;
    case "number":
    case "integer":
      if (typeof value !== "number" || isNaN(value)) {
        out.push({ path: path, code: "number" });
        return;
      }
      if (schema.type === "integer" && Math.floor(value) !== value) out.push({ path: path, code: "integer" });
      if (schema.minimum !== undefined && value < schema.minimum)
        out.push({ path: path, code: "tooSmall", limit: schema.minimum });
      if (schema.maximum !== undefined && value > schema.maximum)
        out.push({ path: path, code: "tooBig", limit: schema.maximum });
      return;
    case "boolean":
      if (typeof value !== "boolean") out.push({ path: path, code: "type" });
      else if (schema.const !== undefined && value !== schema.const) out.push({ path: path, code: "mustAgree" });
      return;
    case "array":
      if (!Array.isArray(value)) {
        out.push({ path: path, code: "type" });
        return;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems)
        out.push({ path: path, code: "tooFewItems", limit: schema.minItems });
      if (schema.maxItems !== undefined && value.length > schema.maxItems)
        out.push({ path: path, code: "tooManyItems", limit: schema.maxItems });
      if (schema.items)
        value.forEach(function (item, i) {
          if (isMissing_(item)) out.push({ path: path + "." + i, code: "required" });
          else check_(schema.items, item, path + "." + i, out);
        });
      return;
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        out.push({ path: path, code: "type" });
        return;
      }
      var here = function (key) {
        return path ? path + "." + key : key;
      };
      (schema.required || []).forEach(function (key) {
        if (isMissing_(value[key])) out.push({ path: here(key), code: "required" });
      });
      var props = schema.properties || {};
      Object.keys(props).forEach(function (key) {
        if (!isMissing_(value[key])) check_(props[key], value[key], here(key), out);
      });
      return;
    }
    default:
      return;
  }
}

function getAt_(payload, path) {
  var node = payload;
  var parts = path.split(".");
  for (var i = 0; i < parts.length; i++) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[parts[i]];
  }
  return node;
}

function holds_(payload, when) {
  var value = getAt_(payload, when.path);
  if (when.in) return when.in.indexOf(value) >= 0;
  return value === when.equals;
}

function checkConditions_(conditions, payload, out) {
  conditions.forEach(function (rule) {
    if (!rule.when.every(function (w) { return holds_(payload, w); })) return;
    (rule.require || []).forEach(function (path) {
      if (isMissing_(getAt_(payload, path)))
        out.push({ path: path, code: "condition", condition: rule.code, message: rule.message });
    });
    if (
      rule.requireAny &&
      rule.requireAny.every(function (path) { return isMissing_(getAt_(payload, path)); })
    )
      out.push({ path: rule.errorPath, code: "condition", condition: rule.code, message: rule.message });
  });
}

/** Every rule the payload breaks for a form type, one violation per field. An empty list means valid. */
function validatePayload_(formType, payload) {
  var rules = RULES_.forms[formType];
  var found = [];
  check_(rules.schema, payload === undefined || payload === null ? {} : payload, "", found);
  checkConditions_(rules.conditions, payload, found);
  var seen = {};
  return found.filter(function (v) {
    if (seen[v.path]) return false;
    seen[v.path] = true;
    return true;
  });
}

function schemaAt_(root, segments) {
  var node = root;
  for (var i = 0; i < segments.length; i++) {
    if (!node) return undefined;
    node = node.type === "array" && /^\d+$/.test(segments[i]) ? node.items : (node.properties || {})[segments[i]];
  }
  return node;
}

function coerce_(schema, raw) {
  if (raw === undefined) return undefined;
  switch (schema.type) {
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      var word = String(raw).trim().toLowerCase();
      if (word === "true" || word === "on" || word === "yes") return true;
      if (word === "false" || word === "off" || word === "no") return false;
      return undefined;
    }
    case "number":
    case "integer": {
      var text = String(raw).trim();
      if (text === "") return undefined;
      var n = Number(text);
      return isFinite(n) ? n : text;
    }
    case "array": {
      var parts = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\n,]/) : [];
      var items = parts
        .map(function (part) { return schema.items ? coerce_(schema.items, part) : part; })
        .filter(function (item) { return !isMissing_(item); });
      return items.length > 0 ? items : undefined;
    }
    default: {
      if (typeof raw === "boolean") return raw;
      var str = Array.isArray(raw) ? raw.join(", ") : raw.trim();
      return str === "" ? undefined : str;
    }
  }
}

function setAt_(target, segments, value) {
  var node = target;
  segments.forEach(function (segment, i) {
    var key = Array.isArray(node) ? Number(segment) : segment;
    if (i === segments.length - 1) {
      node[key] = value;
      return;
    }
    var next = segments[i + 1];
    var child = node[key] === undefined || node[key] === null ? (/^\d+$/.test(next) ? [] : {}) : node[key];
    node[key] = child;
    node = child;
  });
}

function compact_(value) {
  if (Array.isArray(value))
    return value
      .filter(function (v) { return v !== undefined; })
      .map(compact_);
  if (typeof value === "object" && value !== null) {
    var out = {};
    Object.keys(value).forEach(function (key) {
      out[key] = compact_(value[key]);
    });
    return out;
  }
  return value;
}

/** Flat field values ("applicant.name": "Asha") to the nested, typed payload a form type describes. */
function toPayload_(formType, flat) {
  var schema = RULES_.forms[formType].schema;
  var out = {};
  Object.keys(flat).forEach(function (key) {
    var segments = key.split(".");
    var leaf = schemaAt_(schema, segments);
    if (!leaf) return;
    var value = coerce_(leaf, flat[key]);
    if (value !== undefined) setAt_(out, segments, value);
  });
  return compact_(out);
}

/** Builds the JSON envelope from a plain HTML form post (the page works without JavaScript, TRD §10.1). */
function envelopeFromParameters_(parameter, parameters) {
  var formType = String(parameter.formType || "");
  var flat = {};
  Object.keys(parameter).forEach(function (key) {
    if (RESERVED_FIELDS_[key]) return;
    var values = parameters && parameters[key] ? parameters[key] : [parameter[key]];
    flat[key] = values.length > 1 ? values : values[0];
  });
  var consent = String(parameter.consent || "").toLowerCase();
  return {
    formType: formType,
    schemaVersion: 1,
    submittedAt: parameter.submittedAt || undefined,
    startedAt: parameter.startedAt || undefined,
    pageUrl: parameter.pageUrl || "",
    locale: parameter.locale || "en",
    website: parameter.website || "",
    consent: consent === "true" || consent === "on" || consent === "yes",
    data: RULES_.forms[formType] ? toPayload_(formType, flat) : {},
  };
}

function lastWord_(path) {
  var parts = path.split(".");
  var key = parts[parts.length - 1];
  if (/^\d+$/.test(key) && parts.length > 1) key = parts[parts.length - 2];
  var words = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The endpoint's own wording for a violation. The website shows its own (translated) text for the same codes. */
function violationMessage_(v) {
  var label = lastWord_(v.path);
  switch (v.code) {
    case "required": return label + " is required.";
    case "tooShort": return label + " needs at least " + v.limit + " characters.";
    case "tooLong": return label + " can be at most " + v.limit + " characters.";
    case "tooSmall": return label + " must be at least " + v.limit + ".";
    case "tooBig": return label + " must be at most " + v.limit + ".";
    case "number": return label + " must be a number.";
    case "integer": return label + " must be a whole number.";
    case "email": return "Enter a valid email address.";
    case "url": return "Enter a full web address starting with https://.";
    case "date": return "Enter a valid date.";
    case "pattern": return label + " is not in the expected format.";
    case "choice": return "Choose one of the listed options.";
    case "mustAgree": return "You need to agree to continue.";
    case "tooFewItems": return "Choose at least " + v.limit + ".";
    case "tooManyItems": return "Choose at most " + v.limit + ".";
    case "condition": return v.message || label + " is required.";
    default: return label + " is not valid.";
  }
}

/** { "applicant.email": "Enter a valid email address." } from a violation list. */
function errorsFromViolations_(violations) {
  var errors = {};
  violations.forEach(function (v) {
    errors[v.path] = violationMessage_(v);
  });
  return errors;
}

/** Problems with the envelope itself, as { field: message }. The honeypot is not one: it is handled as spam. */
function envelopeErrors_(env) {
  var errors = {};
  if (typeof env !== "object" || env === null) return { form: "The submission could not be read." };
  if (!FORM_TABS_[env.formType]) errors.formType = "Unknown form.";
  if (env.schemaVersion !== 1) errors.schemaVersion = "Unsupported form version.";
  if (env.consent !== true) errors.consent = "You need to agree to the privacy notice to continue.";
  return errors;
}

/** Why a submission is treated as spam, or "" when it is not. Bots get an ordinary success reply either way. */
function spamReason_(env) {
  if (typeof env.website === "string" && env.website !== "") return "honeypot";
  if (env.startedAt && env.submittedAt) {
    var took = Date.parse(env.submittedAt) - Date.parse(env.startedAt);
    if (!isNaN(took) && took < MIN_FILL_MS_) return "too-fast";
  }
  return "";
}

/** Column names for a form type's tab: every leaf of its schema, arrays flagged "(JSON)". */
function columnsFor_(formType) {
  var columns = [];
  var walk = function (schema, prefix) {
    if (schema.type === "object") {
      Object.keys(schema.properties || {}).forEach(function (key) {
        walk(schema.properties[key], prefix ? prefix + "." + key : key);
      });
    } else if (prefix.indexOf("declarations.") !== 0) {
      columns.push(schema.type === "array" ? prefix + " (JSON)" : prefix);
    }
  };
  walk(RULES_.forms[formType].schema, "");
  return columns;
}

/** A flat { column: value } record of the payload, using the same names as columnsFor_. */
function flattenPayload_(payload) {
  var record = {};
  var walk = function (value, prefix) {
    if (Array.isArray(value)) record[prefix + " (JSON)"] = JSON.stringify(value);
    else if (typeof value === "object" && value !== null)
      Object.keys(value).forEach(function (key) {
        walk(value[key], prefix ? prefix + "." + key : key);
      });
    else if (prefix.indexOf("declarations.") !== 0) record[prefix] = value;
  };
  walk(payload, "");
  return record;
}

// ── Web app entry points ───────────────────────────────────────────────────────────────────────────

function doGet() {
  return json_({ ok: true, service: SERVICE_, version: RULES_.version });
}

function doPost(e) {
  var viaForm = false;
  try {
    var type = String((e.postData && e.postData.type) || "").toLowerCase();
    var env;
    if (type.indexOf("json") >= 0 || type.indexOf("text/plain") >= 0) {
      env = JSON.parse(e.postData.contents);
    } else {
      viaForm = true;
      env = envelopeFromParameters_(e.parameter || {}, e.parameters || {});
    }
    return reply_(handle_(env), viaForm);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return reply_(
      { ok: false, errors: {}, message: "Something went wrong on our side. Please try again, or email the office." },
      viaForm,
    );
  }
}

function handle_(env) {
  var problems = envelopeErrors_(env);
  if (Object.keys(problems).length > 0) return { ok: false, errors: problems };

  var reason = spamReason_(env);
  if (reason) {
    storeSpam_(env, reason);
    return { ok: true, id: "SPAM" }; // no signal for bots
  }

  var violations = validatePayload_(env.formType, env.data);
  if (violations.length > 0) return { ok: false, errors: errorsFromViolations_(violations) };

  var email = env.data && typeof env.data.email === "string" ? env.data.email : "";
  if (email && rateLimited_(env.formType, email))
    return { ok: false, errors: {}, message: "Too many submissions. Please try again later." };

  var id = nextId_(env.formType);
  store_(env, id);
  notify_(env, id);
  if (email) countSubmission_(env.formType, email);
  return { ok: true, id: id };
}

// ── Storage, notification, limits (Google services) ────────────────────────────────────────────────

function props_() {
  return PropertiesService.getScriptProperties();
}

function spreadsheet_() {
  var id = props_().getProperty("SHEET_ID");
  if (!id) throw new Error("Set the SHEET_ID script property to the id of the submissions spreadsheet.");
  return SpreadsheetApp.openById(id);
}

function sheetFor_(formType) {
  var ss = spreadsheet_();
  var name = FORM_TABS_[formType];
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = ["id", "receivedAt", "submittedAt", "pageUrl"]
      .concat(columnsFor_(formType))
      .concat(["status", "assignee", "notes"]);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendRecord_(sheet, record) {
  var lastColumn = sheet.getLastColumn();
  var headers = lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
  var missing = Object.keys(record).filter(function (key) {
    return headers.indexOf(key) < 0;
  });
  if (missing.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    headers = headers.concat(missing);
  }
  sheet.appendRow(
    headers.map(function (header) {
      return record[header] === undefined ? "" : record[header];
    }),
  );
}

function store_(env, id) {
  var record = flattenPayload_(env.data);
  record.id = id;
  record.receivedAt = new Date().toISOString();
  record.submittedAt = env.submittedAt || "";
  record.pageUrl = env.pageUrl || "";
  record.status = env.formType === "newsletter" ? "subscribed" : "new";
  if (env.formType === "newsletter") record.consentAt = record.receivedAt;
  appendRecord_(sheetFor_(env.formType), record);
}

function storeSpam_(env, reason) {
  var ss = spreadsheet_();
  var sheet = ss.getSheetByName(SPAM_TAB_) || ss.insertSheet(SPAM_TAB_).hideSheet();
  if (sheet.getLastRow() === 0) sheet.appendRow(["receivedAt", "formType", "reason", "payload"]);
  sheet.appendRow([new Date().toISOString(), String(env.formType || ""), reason, JSON.stringify(env).slice(0, 40000)]);
}

/** Run daily from a time-driven trigger (installTriggers): spam is kept for SPAM_KEEP_DAYS_ days for tuning, then deleted. */
function purgeSpam() {
  var sheet = spreadsheet_().getSheetByName(SPAM_TAB_);
  if (!sheet || sheet.getLastRow() < 2) return;
  var cutoff = Date.now() - SPAM_KEEP_DAYS_ * 24 * 60 * 60 * 1000;
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  var keep = rows.filter(function (row) {
    return Date.parse(row[0]) >= cutoff;
  });
  sheet.getRange(2, 1, rows.length, 4).clearContent();
  if (keep.length > 0) sheet.getRange(2, 1, keep.length, 4).setValues(keep);
}

/** Run once from the editor to schedule purgeSpam. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "purgeSpam") ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger("purgeSpam").timeBased().everyDays(1).atHour(3).create();
}

/** "APP-2026-000123": the form's prefix, the year in IST and a six-digit sequence that never repeats. */
function nextId_(formType) {
  var year = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy");
  var key = "seq:" + ID_PREFIX_[formType] + ":" + year;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var next = Number(props_().getProperty(key) || 0) + 1;
    props_().setProperty(key, String(next));
    return ID_PREFIX_[formType] + "-" + year + "-" + ("000000" + next).slice(-6);
  } finally {
    lock.releaseLock();
  }
}

function rateKey_(formType, email) {
  return "rl:" + formType + ":" + encodeURIComponent(email.toLowerCase()).slice(0, 200);
}

function rateLimited_(formType, email) {
  var limit = Number(props_().getProperty("RATE_LIMIT") || DEFAULT_RATE_LIMIT_);
  return Number(CacheService.getScriptCache().get(rateKey_(formType, email)) || 0) >= limit;
}

function countSubmission_(formType, email) {
  var cache = CacheService.getScriptCache();
  var key = rateKey_(formType, email);
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 3600);
}

function notify_(env, id) {
  var to = props_().getProperty("NOTIFY_" + env.formType.toUpperCase()) || props_().getProperty("NOTIFY_DEFAULT");
  if (!to) return;
  var lines = ["A new " + FORM_LABELS_[env.formType] + " arrived on the IICE website.", "", "Reference: " + id, "Page: " + (env.pageUrl || ""), ""];
  var record = flattenPayload_(env.data);
  Object.keys(record).forEach(function (key) {
    lines.push(key + ": " + record[key]);
  });
  try {
    MailApp.sendEmail({
      to: to,
      subject: "[IICE website] " + FORM_LABELS_[env.formType] + " " + id,
      body: lines.join("\n"),
      replyTo: env.data && env.data.email ? env.data.email : "",
    });
  } catch (err) {
    console.error("Notification failed for " + id + ": " + err); // the row is already saved; never lose a submission over email
  }
}

// ── Responses ──────────────────────────────────────────────────────────────────────────────────────

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml_(text) {
  return String(text).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function reply_(response, viaForm) {
  if (!viaForm) return json_(response);
  var site = props_().getProperty("SITE_URL") || "https://iice.iiserb.ac.in";
  var body;
  if (response.ok) {
    body =
      "<h1>Thank you</h1><p>We have received your submission." +
      (response.id && response.id !== "SPAM" ? " Your reference is <strong>" + escapeHtml_(response.id) + "</strong>." : "") +
      "</p>";
  } else {
    var items = Object.keys(response.errors || {})
      .map(function (key) {
        return "<li>" + escapeHtml_(response.errors[key]) + "</li>";
      })
      .join("");
    body =
      "<h1>We could not send that</h1>" +
      (response.message ? "<p>" + escapeHtml_(response.message) + "</p>" : "") +
      (items ? "<p>Please go back and fix the following.</p><ul>" + items + "</ul>" : "");
  }
  var html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>" + (response.ok ? "Thank you" : "Not sent") + " · IICE, IISER Bhopal</title>" +
    "<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.6;color:#0f1b24}a{color:#0b4f63}</style>" +
    "</head><body><main>" + body + '<p><a href="' + escapeHtml_(site) + '" target="_top">Back to the IICE website</a></p></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle("IICE, IISER Bhopal");
}
