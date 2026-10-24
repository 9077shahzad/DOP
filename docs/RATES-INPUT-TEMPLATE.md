# PS Umzug AG — Commercial Rates Input Template

**Status:** Awaiting owner-supplied rates. Do not activate any figure below until it is confirmed in writing by PS Umzug AG.

The public website mentions storage from CHF 15.–/m² per month and a seasonal 10 % autumn promotion. Both are recorded here as **reference only** and must not be hard-coded into Price List v1 until their terms are confirmed.

---

## How to use this template

1. Fill each section with the current PS Umzug AG commercial rate or rule.
2. Mark any item you do not want automated quoting to use as **“not for public quoting”**.
3. Return the completed template; the development team will translate it into a published, versioned price list with an effective date and regression tests.

---

## 1. Moving

| Item | Rate / Rule | Notes |
| --- | --- | --- |
| Rate per mover / hour | | |
| Vehicle + driver / hour | | By vehicle type if applicable |
| Crew packages | | E.g. 2 movers + vehicle, 3 movers + vehicle |
| Minimum billable hours | | Per job or per service |
| Travel / approach charge | | Fixed, per km, or zone-based |
| Kilometre charge | | If applicable beyond base distance |
| Waiting time | | Per hour or per 15 min |
| Floor / no-lift surcharge | | Per floor, per item, or percentage |
| Long-carry / access surcharge | | Distance from door to vehicle |
| Heavy-item / piano / safe surcharge | | Per item or by weight |

---

## 2. Packing

| Item | Rate / Rule | Notes |
| --- | --- | --- |
| Boxes | | Purchase or rental |
| Wardrobe boxes | | |
| Packing paper | | Per kg or per roll |
| Bubble wrap | | Per metre or per roll |
| Tape | | Per roll |
| Protective material | | Blankets, foil, etc. |
| Packing / unpacking labour | | Per person-hour or per m³ |

---

## 3. Cleaning

| Item | Rate / Rule | Notes |
| --- | --- | --- |
| Rate per m² | | Or alternative calculation method |
| Minimum charge | | |
| Window supplement | | |
| Balcony supplement | | |
| Appliance supplement | | Oven, fridge, etc. |
| Abgabegarantie treatment | | Included / optional / price |

---

## 4. Disposal / Räumung

| Item | Rate / Rule | Notes |
| --- | --- | --- |
| CHF per m³ | | Or actual disposal-cost model |
| Labour | | Per person-hour |
| Vehicle | | Per hour or per trip |
| Recycling / disposal fees | | Fixed, per item, or pass-through |

---

## 5. Storage

| Item | Rate / Rule | Notes |
| --- | --- | --- |
| CHF per m² / month | | Reference: website advertises CHF 15.–/m²/month |
| Minimum area | | |
| Minimum duration | | |
| Handling in / out charge | | Per m³ or per pallet |
| Insurance / condition requirements | | |

**Reference note:** the CHF 15.–/m²/month figure from the public website is recorded here for verification. Do not activate it in Price List v1 until PS Umzug AG confirms it is still valid and whether minimum-area, minimum-duration or other conditions apply.

---

## 6. Surcharges

| Situation | Rate / Rule | Notes |
| --- | --- | --- |
| Saturday | | |
| Sunday / public holiday | | |
| Evening / after-hours | | Define evening start time |
| Urgent / short-notice booking | | Define notice threshold |
| Peak / Zügeltermin window | | Swiss official moving dates |

---

## 7. Commercial rules

| Rule | Value / Description |
| --- | --- |
| VAT treatment / rate | | |
| Quote validity | | Days after issue |
| Cancellation rules | | Customer and PS Umzug AG |
| Deposit / prepayment | | Amount or percentage |
| Rounding rules | | CHF 0.05, CHF 1.00, etc. |
| Discount permissions | | Who can grant and up to what limit |
| Effective-from date for Price List v1 | | |
| Price List version number | | E.g. 1.0 |

---

## 8. Promotions

### Autumn 10 % promotion (reference only)

Do not activate until confirmed:

| Question | Answer |
| --- | --- |
| Eligibility | |
| Services covered | |
| Validity dates | |
| Stacking rules | | Can it combine with other discounts? |
| Maximum discount cap | | |
| How applied | | Percentage off subtotal, specific lines, etc. |

---

## 9. Pricing architecture requirements

- Every published price list must have a version number and effective-from date.
- Historical quotes must remain linked to the price list version that produced them.
- Future price-list changes must not alter already-issued quotes.
- Provisional or unconfirmed rates must be flagged `requires_commercial_review` and excluded from the signed-off published list.
- No rates may be invented, extrapolated or reverse-engineered from the public website.
