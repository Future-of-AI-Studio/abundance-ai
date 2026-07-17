-- 0030_enrollment_payment_unique.sql
-- One payment backs at most one enrollment. Without this, a single succeeded
-- PaymentIntent could be replayed through the public `enroll` function to
-- create unlimited enrollment rows. Partial: demo/seed enrollments (and
-- pre-0018 rows) carry a null payment intent and stay unaffected.
-- (Re-committed: this was applied to the local DB as an uncommitted 0029 whose
-- file was lost, so `if not exists` keeps it re-runnable there.)
create unique index if not exists enrollments_stripe_payment_intent_key
  on enrollments (stripe_payment_intent)
  where stripe_payment_intent is not null;
