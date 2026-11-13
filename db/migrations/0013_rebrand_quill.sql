-- 0013_rebrand_quill.sql
-- Rebrand the singleton hotel settings row without touching unrelated content.
UPDATE "hotel_settings"
SET
  "display_name" = 'Quill Apartments',
  "legal_name" = CASE
    WHEN "legal_name" IS NULL
    OR "legal_name" IN (
      'Divine Excellent Apartments',
      'Divine Excellent Luxury Apartments',
      'Divine Excellent Home'
    ) THEN 'Quill Apartments'
    ELSE "legal_name"
  END,
  "whatsapp_prefill_message" = replace(
    "whatsapp_prefill_message",
    'Divine Excellent Luxury Apartments',
    'Quill Apartments'
  ),
  "hero_image_alt" = replace(
    "hero_image_alt",
    'Divine Excellent Luxury Apartments',
    'Quill Apartments'
  ),
  "logo_alt" = replace(
    "logo_alt",
    'Divine Excellent Luxury Apartments',
    'Quill Apartments'
  ),
  "site_config" = CASE
    WHEN "site_config" IS NULL THEN NULL
    ELSE replace(
      replace(
        replace(
          replace(
            "site_config"::text,
            'Divine Excellent Luxury Apartments',
            'Quill Apartments'
          ),
          'Divine Excellent Apartments',
          'Quill Apartments'
        ),
        'Divine Excellent Home',
        'Quill Apartments'
      ),
      'Divine Ex.',
      'Quill'
    )::jsonb
  END
WHERE
  "id" = 1;
