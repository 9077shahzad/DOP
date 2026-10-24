<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Confirmed distance re-prices the offer client-side (`calculate(..., { confirmedKm })`) and saves via `dop_confirm_distance` as a new version with history — why: the billed km must be the confirmed km, never the postcode estimate.

- Test-suite rows carry `is_test = true` (leads, quotes, jobs_execution, enquiries); operational lists filter them out, archives keep them — why: test data must never pollute production lists yet stay auditable.
- Order documents use the linked accepted offer and a distinct `order` PDF kind; refuse PDF output when current and accepted offer versions differ — why: never present an unaccepted revision as the customer's order.
- List PDF downloads mount the shared dossier/preview renderer and wait for its document data; never maintain a second admin PDF layout — why: customer and staff copies must stay consistent.
- Post-acceptance customer corrections go only through `dop_correct_customer` (admin contact/billing fields, audited, never touches accepted_snapshot); order documents and conversion overlay these corrected contact fields on the snapshot, while price/scope/terms always come from the snapshot; contractual changes after acceptance use change orders — why: the accepted offer must stay the immutable record of what the customer agreed to.
- The pricing engine rounds each position, the discount, net and VAT half-up to the Rappen, so printed rows always add up — why: screen, stored record and PDF must show the identical total.
- Orders cannot leave "scheduled" without a scheduled_start (DB trigger); lists show "Datum ausstehend" instead of a dash — why: no confirmed order may lack a moving date.
- All staff order conversions use the acceptance-checked RPC; the underlying implementation is not executable by authenticated callers — why: UI restrictions must not be bypassable through direct calls.
- Quote and order PDFs (customer and staff downloads) render in the quote's customer language; invoices addressed to the offer's current billing address — why: one consistent customer document regardless of who downloads it.
- Legal policy changes create new document versions and supersede prior rows without changing their bodies or consent references — why: historical customer agreements must remain auditable.
- The upload wizard step reuses LivePanel in compact mode above QUploads with one shared navigation row; upload selection remains delegated to uploadIntakeFile — why: price presentation and file validation keep a single source of truth.
