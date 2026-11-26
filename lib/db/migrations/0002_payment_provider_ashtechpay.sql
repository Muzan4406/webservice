-- Rename payment identifiers without discarding historical transaction data.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deposits' AND column_name = 'sendavapay_reference')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deposits' AND column_name = 'provider_reference') THEN
    ALTER TABLE deposits RENAME COLUMN sendavapay_reference TO provider_reference;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pending_sp_deposits' AND column_name = 'sendavapay_reference')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pending_sp_deposits' AND column_name = 'provider_reference') THEN
    ALTER TABLE pending_sp_deposits RENAME COLUMN sendavapay_reference TO provider_reference;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_payments' AND column_name = 'sendavapay_reference')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_payments' AND column_name = 'provider_reference') THEN
    ALTER TABLE vip_payments RENAME COLUMN sendavapay_reference TO provider_reference;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_payments' AND column_name = 'drimpay_order_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_payments' AND column_name = 'external_reference') THEN
    ALTER TABLE vip_payments RENAME COLUMN drimpay_order_id TO external_reference;
  END IF;
END $$;

ALTER TABLE deposits ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'legacy';
ALTER TABLE pending_sp_deposits ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'legacy';
ALTER TABLE vip_payments ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'legacy';
ALTER TABLE deposits ALTER COLUMN payment_provider SET DEFAULT 'legacy';
ALTER TABLE pending_sp_deposits ALTER COLUMN payment_provider SET DEFAULT 'ashtechpay';
ALTER TABLE vip_payments ALTER COLUMN payment_provider SET DEFAULT 'ashtechpay';
ALTER TABLE pending_sp_deposits ADD COLUMN IF NOT EXISTS otp_ussd_code text;
ALTER TABLE vip_payments ADD COLUMN IF NOT EXISTS otp_ussd_code text;
ALTER TABLE pending_sp_deposits ADD COLUMN IF NOT EXISTS provider_transaction_id text;
ALTER TABLE vip_payments ADD COLUMN IF NOT EXISTS provider_transaction_id text;
ALTER TABLE pending_sp_deposits ALTER COLUMN provider_reference DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vip_payments_drimpay_order_id_unique')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vip_payments_external_reference_unique') THEN
    ALTER INDEX vip_payments_drimpay_order_id_unique RENAME TO vip_payments_external_reference_unique;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pending_sp_deposits_provider_transaction_id_unique
  ON pending_sp_deposits (provider_transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS pending_sp_deposits_external_reference_unique
  ON pending_sp_deposits (external_reference);
CREATE UNIQUE INDEX IF NOT EXISTS vip_payments_external_reference_unique
  ON vip_payments (external_reference);
CREATE UNIQUE INDEX IF NOT EXISTS vip_payments_provider_transaction_id_unique
  ON vip_payments (provider_transaction_id);
