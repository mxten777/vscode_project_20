-- ============================================================
-- patent-platform  schema.sql
-- Enable extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 멀티테넌시
-- ============================================================
CREATE TABLE public.orgs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  plan       text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.orgs (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  UNIQUE (org_id, user_id)
);

-- ============================================================
-- 출원인
-- ============================================================
CREATE TABLE public.applicants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  name_en    text,
  country    text NOT NULL DEFAULT 'KR',
  type       text NOT NULL DEFAULT 'corporation' CHECK (type IN ('corporation', 'individual')),
  raw_json   jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, country)
);

-- ============================================================
-- 특허 공보
-- ============================================================
CREATE TABLE public.patents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_patent_id  text UNIQUE NOT NULL,
  title             text NOT NULL,
  title_en          text,
  abstract          text,
  applicant_id      uuid REFERENCES public.applicants (id) ON DELETE SET NULL,
  applicant_name    text,
  inventor_names    text[] NOT NULL DEFAULT '{}',
  ipc_codes         text[] NOT NULL DEFAULT '{}',
  ipc_names         text[] NOT NULL DEFAULT '{}',
  filing_date       date,
  publication_date  date,
  registration_date date,
  expiry_date       date,
  status            text NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'REGISTERED', 'EXPIRED', 'REJECTED', 'WITHDRAWN')),
  source            text NOT NULL DEFAULT 'KIPRIS'
                    CHECK (source IN ('KIPRIS', 'USPTO')),
  raw_json          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 주시 목록
-- ============================================================
CREATE TABLE public.watchlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.orgs (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  patent_id  uuid NOT NULL REFERENCES public.patents (id) ON DELETE CASCADE,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, patent_id)
);

-- ============================================================
-- 알림 규칙
-- ============================================================
CREATE TABLE public.alert_rules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES public.orgs (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('COMPETITOR', 'IPC', 'EXPIRY', 'KEYWORD')),
  rule_json  jsonb NOT NULL DEFAULT '{}',
  channel    text NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL', 'KAKAO')),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 알림 로그
-- ============================================================
CREATE TABLE public.alert_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id   uuid NOT NULL REFERENCES public.alert_rules (id) ON DELETE CASCADE,
  patent_id       uuid NOT NULL REFERENCES public.patents (id) ON DELETE CASCADE,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL CHECK (status IN ('SENT', 'FAIL')),
  error_message   text,
  UNIQUE (alert_rule_id, patent_id)
);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX idx_patents_status        ON public.patents (status);
CREATE INDEX idx_patents_filing_date   ON public.patents (filing_date);
CREATE INDEX idx_patents_expiry_date   ON public.patents (expiry_date);
CREATE INDEX idx_patents_applicant     ON public.patents (applicant_id);
CREATE INDEX idx_patents_registration  ON public.patents (registration_date);
CREATE INDEX idx_patents_ipc_codes     ON public.patents USING gin (ipc_codes);
CREATE INDEX idx_patents_inventors     ON public.patents USING gin (inventor_names);
CREATE INDEX idx_patents_title_trgm    ON public.patents USING gin (title gin_trgm_ops);
CREATE INDEX idx_patents_applicant_name_trgm ON public.patents USING gin (applicant_name gin_trgm_ops);

CREATE INDEX idx_watchlist_user        ON public.watchlist (user_id);
CREATE INDEX idx_alert_rules_user      ON public.alert_rules (user_id);
CREATE INDEX idx_alert_logs_rule       ON public.alert_logs (alert_rule_id);

-- ============================================================
-- org ID 조회 헬퍼 함수 (RLS 사용)
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
  )
$$;

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_applicants_updated_at
  BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_patents_updated_at
  BEFORE UPDATE ON public.patents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE public.orgs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS 정책
-- ============================================================

-- orgs: 소속 멤버만 조회
CREATE POLICY "orgs_select_own" ON public.orgs
  FOR SELECT USING (id = ANY(public.user_org_ids()));

-- org_members: 소속 org 멤버만 조회
CREATE POLICY "org_members_select_own" ON public.org_members
  FOR SELECT USING (org_id = ANY(public.user_org_ids()));

-- applicants: 전체 공개 읽기
CREATE POLICY "applicants_select_all" ON public.applicants
  FOR SELECT USING (true);

-- patents: 전체 공개 읽기
CREATE POLICY "patents_select_all" ON public.patents
  FOR SELECT USING (true);

-- watchlist: 본인 데이터만
CREATE POLICY "watchlist_select_own" ON public.watchlist
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "watchlist_insert_own" ON public.watchlist
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = ANY(public.user_org_ids()));

CREATE POLICY "watchlist_update_own" ON public.watchlist
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "watchlist_delete_own" ON public.watchlist
  FOR DELETE USING (user_id = auth.uid());

-- alert_rules: 본인 데이터만
CREATE POLICY "alert_rules_select_own" ON public.alert_rules
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "alert_rules_insert_own" ON public.alert_rules
  FOR INSERT WITH CHECK (user_id = auth.uid() AND org_id = ANY(public.user_org_ids()));

CREATE POLICY "alert_rules_update_own" ON public.alert_rules
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "alert_rules_delete_own" ON public.alert_rules
  FOR DELETE USING (user_id = auth.uid());

-- alert_logs: 본인 규칙의 로그만
CREATE POLICY "alert_logs_select_own" ON public.alert_logs
  FOR SELECT USING (
    alert_rule_id IN (
      SELECT id FROM public.alert_rules WHERE user_id = auth.uid()
    )
  );
