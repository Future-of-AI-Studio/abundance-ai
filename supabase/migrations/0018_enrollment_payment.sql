-- 0018_enrollment_payment.sql
-- Enrollments now go through a real payment step (Stripe PaymentIntent) before
-- they're recorded. Keep the PaymentIntent id for reconciliation. Null for
-- demo/mock enrollments made without configured Stripe keys.
alter table enrollments add column stripe_payment_intent text;
