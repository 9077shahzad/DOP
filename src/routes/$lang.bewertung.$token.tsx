/**
 * /:lang/bewertung/:token — public review page.
 *
 * The token is the capability: it names one job and can be used once. No
 * personal data is shown beyond the job reference the customer already has.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button, Card, CardHeader, ErrorState, Field, LoadingState, Textarea } from "@/components/system";
import {
  fetchReviewByToken,
  fetchReviewSettings,
  submitReview,
  type PublicReview,
  type PublicReviewSettings,
} from "@/lib/operations";

export const Route = createFileRoute("/$lang/bewertung/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bewertung — PS Umzug AG" },
      { name: "description", content: "Bewerten Sie Ihren Umzug mit PS Umzug AG in wenigen Sekunden." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Bewertung — PS Umzug AG" },
      { property: "og:description", content: "Bewerten Sie Ihren Umzug mit PS Umzug AG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { token } = Route.useParams();
  const [review, setReview] = useState<PublicReview | null | "loading">("loading");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [settings, setSettings] = useState<PublicReviewSettings>({ googleReviewUrl: "", lowRatingThreshold: 4 });

  useEffect(() => {
    void fetchReviewByToken(token).then(setReview);
    void fetchReviewSettings().then(setSettings);
  }, [token]);

  if (review === "loading") return <LoadingState label="Lädt …" />;

  if (!review) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState message="Dieser Bewertungslink ist ungültig oder abgelaufen." />
      </main>
    );
  }

  const already = done || review.submittedAt !== null;
  const givenRating = done ? rating : (review.rating ?? 0);
  // A happy customer sees the public link; a critical one stays with us, so
  // the comment reaches the office instead of a public page.
  const showGoogle = already && settings.googleReviewUrl !== "" && givenRating >= settings.lowRatingThreshold;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardHeader eyebrow={`Auftrag ${review.jobReference}`} title="Wie war Ihr Umzug?" />
        {already ? (
          <>
            <p className="type-body mt-4 text-ink-2">Vielen Dank für Ihre Bewertung.</p>
            {showGoogle ? (
              <>
                <p className="type-body mt-3 text-ink-2">
                  Schön, dass Sie zufrieden sind. Teilen Sie Ihre Erfahrung auch öffentlich auf Google.
                </p>
                <div className="mt-4">
                  <Button variant="primary" onClick={() => window.open(settings.googleReviewUrl, "_blank", "noopener")}>
                    Auf Google bewerten
                  </Button>
                </div>
              </>
            ) : already && givenRating > 0 && givenRating < settings.lowRatingThreshold ? (
              <p className="type-body mt-3 text-ink-2">
                Ihre Rückmeldung geht direkt an unser Büro. Wir melden uns bei Ihnen.
              </p>
            ) : null}
          </>
        ) : (
          <>
            {error ? <ErrorState className="mt-4" message={error} /> : null}
            <div className="mt-5 flex gap-2" role="group" aria-label="Bewertung in Sternen">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={rating >= n ? "primary" : "outline"}
                  aria-pressed={rating >= n}
                  onClick={() => setRating(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Field label="Kommentar (optional)" className="mt-5">
              {(p) => <Textarea {...p} value={comment} onChange={(e) => setComment(e.target.value)} />}
            </Field>
            <div className="mt-5">
              <Button
                variant="primary"
                disabled={rating === 0}
                onClick={() =>
                  void submitReview(token, rating, comment)
                    .then((ok) => (ok ? setDone(true) : setError("Diese Bewertung wurde bereits abgegeben.")))
                    .catch(() => setError("Senden fehlgeschlagen. Bitte später erneut versuchen."))
                }
              >
                Bewertung senden
              </Button>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
