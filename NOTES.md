# Notes & Assumptions

- All core tables (`leads`, `applications`, `tasks`) include `id`, `tenant_id`, `created_at`, and `updated_at` as required.
- `applications.lead_id` references `leads(id)`, and `tasks.related_id` references `applications(id)` with `ON DELETE CASCADE`.
- `tasks.type` is constrained to `('call', 'email', 'review')` and `tasks.due_at >= created_at` using CHECK constraints.
- Indexes are added for common queries:
  - Leads by `tenant_id`, `owner_id`, `stage`, `created_at`.
  - Applications by `lead_id`.
  - Tasks by `tenant_id` and `due_at` to support “tasks due today”.
- RLS policies assume:
  - JWT contains `role` = `admin` or `counselor`.
  - `auth.uid()` returns the currently authenticated user.
  - `user_teams(user_id, team_id)` exists to map counselors to teams.
- The Edge Function uses the Supabase service role key and is intended to be deployed as `create-task` as per Supabase conventions.

---

## Stripe Checkout Flow for Application Fee

1. Expose a backend endpoint (e.g. `/api/checkout`) that calls `stripe.checkout.sessions.create()` with the application fee amount, currency, and success/cancel URLs.  
2. Before creating the session, insert a `payment_requests` row linked to the application with status `"pending"` and store the Stripe `session.id`.  
3. The frontend calls this endpoint, gets the `sessionId`, and redirects the user to Stripe Checkout using `stripe.redirectToCheckout({ sessionId })`.  
4. Configure a secure Stripe webhook endpoint (e.g. `/api/stripe/webhook`) and verify the signature on incoming events.  
5. On `checkout.session.completed`, look up the `payment_requests` row by `session.id`, mark it as `"paid"`, and store relevant metadata (amount, currency, customer).  
6. Update the related `applications` row, setting `payment_status = 'paid'` and moving its stage to something like `"fee_paid"` or inserting a timeline event.  
7. For failed or expired sessions, keep the payment request as `"pending"` or mark it `"failed"` and do not advance the application stage.
