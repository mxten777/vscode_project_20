# Patent Platform

특허 모니터링 SaaS — 경쟁사 동향, IPC 분류, 만료 예정 특허를 자동으로 추적하는 플랫폼입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, TypeScript Strict) |
| Styling | TailwindCSS v4 + shadcn/ui (Radix UI) |
| State / Fetch | TanStack Query v5 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Email | Resend |
| Charts | Recharts |
| Validation | Zod v3 |
| Deployment | Vercel (Cron Jobs) |

---

## 프로젝트 구조

```
patent-platform/
├── scripts/
│   └── seed-demo.mjs          # 데모 데이터 시딩
├── src/
│   ├── app/
│   │   ├── (app)/             # Authenticated Route Group
│   │   │   ├── layout.tsx     # 인증 체크 + Header
│   │   │   ├── page.tsx       # 특허 목록 (검색/필터/페이지네이션)
│   │   │   ├── patents/[id]/  # 특허 상세
│   │   │   ├── watchlist/     # 주시 목록
│   │   │   ├── alerts/        # 알림 규칙 관리
│   │   │   └── reports/       # 분석 리포트 (Recharts)
│   │   ├── api/               # Route Handlers
│   │   │   ├── auth/          # signup / signin / signout
│   │   │   ├── patents/       # GET 목록, GET 상세
│   │   │   ├── watchlist/     # CRUD + note 수정
│   │   │   ├── alerts/        # rules CRUD, logs GET
│   │   │   ├── reports/       # summary GET
│   │   │   └── jobs/          # poll-patents, process-alerts (Cron)
│   │   ├── login/             # 로그인 / 회원가입
│   │   ├── globals.css        # TailwindCSS v4 + CSS Variables
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── ui/                # 23개 shadcn/ui 컴포넌트
│   │   ├── header.tsx
│   │   └── providers.tsx
│   ├── hooks/
│   │   └── use-api.ts         # TanStack Query hooks
│   └── lib/
│       ├── supabase/          # client / server / service
│       ├── notifications/     # email / kakao providers
│       ├── types.ts
│       ├── validations.ts
│       ├── helpers.ts
│       ├── auth-context.ts
│       ├── api-response.ts
│       └── utils.ts
├── supabase/
│   ├── schema.sql             # DB 전체 스키마 (tables + RLS + functions)
│   └── migrations/
│       └── 001_stabilize.sql
├── .env.example
├── vercel.json                # Cron 설정
└── package.json
```

---

## 로컬 개발 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 에서 아래 항목을 채워주세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project_id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron 보안 토큰 (임의 문자열)
CRON_SECRET=your-secret-token-here

# KIPRIS API
KIPRIS_API_KEY=<your_kipris_open_api_key>

# Resend (이메일)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 3. Supabase 설정

**방법 A — Supabase 대시보드 SQL 편집기:**

`supabase/schema.sql` 전체를 복사하여 SQL 편집기에 붙여넣고 실행합니다.

**방법 B — Supabase CLI (로컬):**

```bash
supabase start
supabase db push
```

### 4. 데모 데이터 시딩

```bash
node scripts/seed-demo.mjs
```

시딩 성공 후 출력된 이메일/비밀번호로 로그인할 수 있습니다.

기본값:
- 이메일: `demo@patent-platform.dev`
- 비밀번호: `Demo@1234!`

커스텀 계정을 사용하려면 `.env.local`에 추가하세요:

```env
SEED_DEMO_EMAIL=my@email.com
SEED_DEMO_PASSWORD=MyPassword1!
```

### 5. 개발 서버 실행

```bash
npm run dev
```

→ http://localhost:3000

---

## 주요 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/health` | 헬스 체크 |
| POST | `/api/auth/signup` | 회원가입 + 조직 자동 생성 |
| POST | `/api/auth/signin` | 로그인 |
| POST | `/api/auth/signout` | 로그아웃 |
| GET | `/api/patents` | 특허 목록 (검색/필터/페이징) |
| GET | `/api/patents/[id]` | 특허 상세 |
| GET/DELETE/PATCH | `/api/watchlist/[patentId]` | 주시 추가/삭제/메모 수정 |
| GET/POST | `/api/alerts/rules` | 알림 규칙 목록/생성 |
| PATCH/DELETE | `/api/alerts/rules/[id]` | 알림 규칙 수정/삭제 |
| GET | `/api/alerts/logs` | 알림 발송 로그 |
| GET | `/api/reports/summary` | 분석 리포트 집계 |
| POST | `/api/jobs/poll-patents` | KIPRIS 특허 수집 (Cron) |
| POST | `/api/jobs/process-alerts` | 알림 처리 (Cron) |

---

## Cron Job 스케줄

`vercel.json`에 정의된 스케줄 (UTC, KST UTC+9):

| Job | UTC Schedule | KST |
|-----|----------------|-----|
| poll-patents | `30 1 * * 1-5` | 평일 10:30 |
| process-alerts | `0 1 * * 1-5` | 평일 10:00 |

Vercel Cron은 `Authorization: Bearer <CRON_SECRET>` 헤더로 인증됩니다.

---

## Supabase Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있습니다. 사용자는 자신이 속한 조직(`org_id`)의 데이터만 접근할 수 있습니다.

핵심 함수:
- `user_org_ids()` — 현재 사용자가 속한 조직 ID 배열 반환 (SECURITY DEFINER)
- `set_updated_at()` — UPDATE 시 `updated_at` 자동 갱신 트리거

---

## 배포 (Vercel)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel --prod
```

Vercel 프로젝트 환경 변수 설정:
- `.env.local`의 모든 변수를 Vercel 대시보드 → Settings → Environment Variables에 추가합니다.
- `CRON_SECRET`은 Vercel Cron과 공유됩니다.

---

## 라이선스

MIT
