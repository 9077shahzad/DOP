/**
 * Six customer-language categories on top of the technical service catalogue.
 *
 * The catalogue in `services.ts` is how the business thinks; this is how a
 * customer thinks. Twenty options at once is a wall — six categories with
 * their sub-services revealed after a choice is a decision anyone can make.
 *
 * `services` only ever holds real ids from SERVICE_IDS, so every revealed
 * sub-service resolves to an existing page and an existing booking target.
 * A category with no sub-services routes to the contact page instead.
 */
import type { ServiceId } from "@/lib/services";

export type CategoryId = "umzug" | "reinigung" | "entsorgung" | "lagerung" | "transport" | "besichtigung";

export type Category = {
  id: CategoryId;
  services: ServiceId[];
  /** Where the category itself leads when it has no sub-services. */
  fallback: "planner" | "contact";
};

export const CATEGORIES: Category[] = [
  { id: "umzug", services: ["umzug"], fallback: "planner" },
  { id: "reinigung", services: ["reinigung"], fallback: "planner" },
  { id: "entsorgung", services: ["entsorgung"], fallback: "contact" },
  { id: "lagerung", services: ["lagerung"], fallback: "contact" },
  { id: "transport", services: ["transport"], fallback: "contact" },
  { id: "besichtigung", services: ["besichtigung"], fallback: "contact" },
];
