/**
 * Swiss postcode → locality/canton resolution.
 *
 * The directory is official reference data held in `swiss_postcodes`
 * (swisstopo Amtliches Ortschaftenverzeichnis, supplemented by the GeoNames CH
 * postal-code list for postcodes that exist only as PO-box codes, e.g. 8000
 * Zürich and 3000 Bern). Nothing here guesses: a postcode either resolves from
 * the directory or the customer sees a validation message.
 */

import { supabase } from "@/integrations/supabase/client";

export type Locality = {
  plz: number;
  locality: string;
  canton: string;
};

/** Four digits, 1000–9999 — the Swiss postcode format, not proof of existence. */
export function isSwissPostcodeFormat(zip: string): boolean {
  return /^[1-9]\d{3}$/.test(zip.trim());
}

/** Every locality the directory knows for a postcode, alphabetical. */
export async function lookupPostcode(zip: string): Promise<Locality[]> {
  if (!isSwissPostcodeFormat(zip)) return [];
  const { data, error } = await supabase
    .from("swiss_postcodes")
    .select("plz, locality, canton")
    .eq("plz", Number(zip))
    .order("locality", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Locality[];
}

/** `8000 → Zürich, ZH` — the resolved result shown under the postcode. */
export function formatResolved(place: Locality): string {
  return `${place.plz} → ${place.locality}, ${place.canton}`;
}

/**
 * The single answer for a postcode, or null when the postcode is unknown or
 * carries several localities and the customer has to pick one.
 */
export function soleLocality(options: Locality[]): Locality | null {
  return options.length === 1 ? options[0]! : null;
}
