-- ============================================================
-- 001_stabilize.sql
-- alert_logs UNIQUE 제약 및 alert_rules.name NOT NULL 패치
-- ============================================================

-- alert_logs UNIQUE 제약이 없을 경우 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'alert_logs_alert_rule_id_patent_id_key'
      AND conrelid = 'public.alert_logs'::regclass
  ) THEN
    ALTER TABLE public.alert_logs
      ADD CONSTRAINT alert_logs_alert_rule_id_patent_id_key
      UNIQUE (alert_rule_id, patent_id);
  END IF;
END;
$$;

-- alert_rules.name NOT NULL 및 기본값 패치
-- 기존 null 값이 있을 경우 채움
UPDATE public.alert_rules SET name = '알림 규칙' WHERE name IS NULL OR name = '';

-- name 컬럼 NOT NULL 제약 적용
ALTER TABLE public.alert_rules
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN name SET DEFAULT '알림 규칙';

-- alert_rules.updated_at 기본값 보장
ALTER TABLE public.alert_rules
  ALTER COLUMN updated_at SET DEFAULT now();

-- applicants.updated_at 기본값 보장
ALTER TABLE public.applicants
  ALTER COLUMN updated_at SET DEFAULT now();

-- patents.updated_at 기본값 보장
ALTER TABLE public.patents
  ALTER COLUMN updated_at SET DEFAULT now();
