/**
 * Review invitation settings — server only.
 *
 * One row holds the owner's decisions: whether invitations go out at all, the
 * public Google review link, and the star rating from which a customer is
 * shown that link. Nothing is invented: with no link stored, the public review
 * page simply thanks the customer and stops there.
 */

export type ReviewSettings = {
  enabled: boolean;
  googleReviewUrl: string;
  lowRatingThreshold: number;
};

export async function loadReviewSettings(): Promise<ReviewSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("review_settings")
    .select("enabled, google_review_url, low_rating_threshold")
    .eq("id", "default")
    .maybeSingle();

  return {
    enabled: Boolean(data?.enabled),
    googleReviewUrl: (data?.google_review_url ?? "").trim(),
    lowRatingThreshold: Number(data?.low_rating_threshold ?? 4),
  };
}

export async function reviewInvitesEnabled(): Promise<boolean> {
  return (await loadReviewSettings()).enabled;
}
