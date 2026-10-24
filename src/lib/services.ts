/**
 * Service catalogue for the public site.
 *
 * The ids double as the route segment (`/$lang/leistungen/$service`) and as
 * the i18n key inside the `svc` block, so a zone in the property explorer,
 * the service page and the navigation all resolve from one list.
 *
 * The authoritative, admin-editable catalogue lives in the database table
 * `service_catalogue` (same keys). This list only defines which services get
 * a public page and where they sit in the explorer.
 */
export const SERVICE_IDS = [
  "umzug",
  "reinigung",
  "entsorgung",
  "lagerung",
  "transport",
  "besichtigung",
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];

export function isServiceId(value: string): value is ServiceId {
  return (SERVICE_IDS as readonly string[]).includes(value);
}

/** Where a zone sits in the isometric building: floor index and footprint. */
export type Zone = {
  id: ServiceId;
  /** Stacking level, 0 = basement. */
  floor: number;
  /** Grid column start / span inside the 4-column plan. */
  col: number;
  span: number;
};

export const ZONES: Zone[] = [
  { id: "lagerung", floor: 0, col: 1, span: 2 },
  { id: "entsorgung", floor: 0, col: 3, span: 2 },
  { id: "reinigung", floor: 1, col: 1, span: 2 },
  { id: "transport", floor: 1, col: 3, span: 2 },
  { id: "besichtigung", floor: 2, col: 1, span: 4 },
  { id: "umzug", floor: 3, col: 1, span: 4 },
];
