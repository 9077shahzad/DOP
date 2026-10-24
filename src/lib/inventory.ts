/**
 * Inventory catalogue — the list of items a customer can count in the wizard.
 *
 * The catalogue is data, not code: staff maintain it in /admin/inventar and the
 * wizard reads whatever is active. Volumes are a capacity model (m³ per item),
 * not a price, so they carry no commercial rate.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Lang } from "@/i18n/config";
import { labelIn } from "@/lib/i18n-label";

export type InventoryItem = Tables<"inventory_catalogue">;

/** The item name in the active interface language; German is the fallback. */
export function inventoryName(item: InventoryItem, lang: Lang): string {
  return labelIn(item.label_i18n, lang, item.name_de);
}

export async function fetchInventory(includeInactive = false): Promise<InventoryItem[]> {
  let query = supabase.from("inventory_catalogue").select("*").order("sort_order").order("name_de");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function saveInventoryItem(
  input: TablesInsert<"inventory_catalogue"> & { id?: string },
): Promise<InventoryItem> {
  if (input.id) {
    const { id, ...rest } = input;
    const { data, error } = await supabase
      .from("inventory_catalogue")
      .update(rest as TablesUpdate<"inventory_catalogue">)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("inventory_catalogue").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function setInventoryActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("inventory_catalogue").update({ active }).eq("id", id);
  if (error) throw error;
}
