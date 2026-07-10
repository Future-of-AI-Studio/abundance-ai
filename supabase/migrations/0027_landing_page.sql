-- 0027_landing_page.sql
-- Landing page customization — the creator's chosen appearance & copy for their
-- public program landing page (theme, background, heading font, eyebrow/tagline/
-- CTA overrides), stored as one jsonb blob. Null = the default look; the shape is
-- validated by landingPageSettingsSchema in @abundance/shared.
alter table profiles add column if not exists landing_page jsonb;
