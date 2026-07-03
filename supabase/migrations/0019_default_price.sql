-- 0019_default_price.sql
-- Lower the suggested program price from $149 to $20. New programs default to $20;
-- programs still sitting at the old default (never customized by the creator) are
-- moved to the new default so they reflect it. Deliberately-set prices are untouched.
alter table programs alter column price_cents set default 2000;
update programs set price_cents = 2000 where price_cents = 14900;
