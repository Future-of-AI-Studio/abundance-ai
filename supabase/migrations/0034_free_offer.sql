-- 0034_free_offer.sql
-- Free-enrollment offer: a creator can let people join a paid program for free
-- for a limited time (e.g. a launch week). While the offer is open, the public
-- landing page (/p/:id) lets a buyer choose "enroll free" or pay, and the
-- creator sees which each participant chose in their participants list.
--
-- "Free vs paid" for a participant is derived from enrollments.amount_cents
-- (0 = free), so no new enrollment column is needed. The `enroll` Edge Function
-- re-checks the window server-side before recording a $0 enrollment.

alter table programs
  add column free_offer_enabled boolean not null default false,
  -- When the free offer stops. Null = no end date (free while the offer is on).
  add column free_offer_until timestamptz;
