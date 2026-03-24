ALTER TABLE public.receipts ADD COLUMN paid_by text;
UPDATE public.receipts SET paid_by = created_by WHERE paid_by IS NULL;
ALTER TABLE public.receipts ALTER COLUMN paid_by SET NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN paid_by SET DEFAULT '';