#!/usr/bin/env node
/**
 * scripts/seed-demo.mjs
 * 데모 데이터 시딩 스크립트
 * 사용법: node scripts/seed-demo.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env.local 파싱
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  try {
    const raw = readFileSync(envPath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    console.warn('⚠ .env.local not found, using existing environment variables')
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정해 주세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? 'demo@patent-platform.dev'
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Demo@1234!'
const ORG_NAME = 'Demo Organization'

// ─── Applicants ───────────────────────────────────────────────
const APPLICANTS = [
  { name: '삼성전자(주)', name_en: 'Samsung Electronics Co., Ltd.', country: 'KR' },
  { name: 'LG전자(주)', name_en: 'LG Electronics Inc.', country: 'KR' },
  { name: '현대자동차(주)', name_en: 'Hyundai Motor Company', country: 'KR' },
  { name: 'SK하이닉스(주)', name_en: 'SK Hynix Inc.', country: 'KR' },
  { name: '한국전자통신연구원', name_en: 'ETRI', country: 'KR' },
]

// ─── util ─────────────────────────────────────────────────────
function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Patents ──────────────────────────────────────────────────
function buildPatents(applicantIds) {
  const today = new Date().toISOString().slice(0, 10)

  return [
    // PENDING × 8
    {
      source_patent_id: 'KR-10-2023-0001001',
      source: 'KIPRIS',
      title: '이차전지 양극 활물질 및 그 제조방법',
      title_en: 'Cathode Active Material for Secondary Battery and Manufacturing Method Thereof',
      status: 'PENDING',
      filing_date: '2023-03-15',
      ipc_codes: ['H01M', 'H01M 4/36'],
      applicant_name: APPLICANTS[0].name,
      applicant_id: applicantIds[0],
      inventor_names: ['김철수', '이영희'],
    },
    {
      source_patent_id: 'KR-10-2023-0001002',
      source: 'KIPRIS',
      title: '유기 발광 다이오드 디스플레이 패널',
      title_en: 'Organic Light Emitting Diode Display Panel',
      status: 'PENDING',
      filing_date: '2023-05-20',
      ipc_codes: ['H01L', 'H01L 51/50'],
      applicant_name: APPLICANTS[0].name,
      applicant_id: applicantIds[0],
      inventor_names: ['박민준'],
    },
    {
      source_patent_id: 'KR-10-2023-0001003',
      source: 'KIPRIS',
      title: '인공지능 기반 영상 처리 시스템',
      title_en: 'AI-based Image Processing System',
      status: 'PENDING',
      filing_date: '2023-07-10',
      ipc_codes: ['G06N', 'G06T'],
      applicant_name: APPLICANTS[1].name,
      applicant_id: applicantIds[1],
      inventor_names: ['정수진', '최동현'],
    },
    {
      source_patent_id: 'KR-10-2023-0001004',
      source: 'KIPRIS',
      title: '전기차 모터 제어 장치 및 방법',
      title_en: 'Electric Vehicle Motor Control Device and Method',
      status: 'PENDING',
      filing_date: '2023-08-01',
      ipc_codes: ['B60L', 'H02P'],
      applicant_name: APPLICANTS[2].name,
      applicant_id: applicantIds[2],
      inventor_names: ['한기범'],
    },
    {
      source_patent_id: 'KR-10-2023-0001005',
      source: 'KIPRIS',
      title: '반도체 메모리 소자의 데이터 저장 방법',
      title_en: 'Data Storage Method for Semiconductor Memory Device',
      status: 'PENDING',
      filing_date: '2023-09-15',
      ipc_codes: ['G11C', 'H01L 27/11'],
      applicant_name: APPLICANTS[3].name,
      applicant_id: applicantIds[3],
      inventor_names: ['윤상혁', '오민지'],
    },
    {
      source_patent_id: 'KR-10-2023-0001006',
      source: 'KIPRIS',
      title: '5G 통신 다중 안테나 빔포밍 기술',
      title_en: '5G Multi-Antenna Beamforming Technology',
      status: 'PENDING',
      filing_date: '2023-10-05',
      ipc_codes: ['H04B', 'H04W'],
      applicant_name: APPLICANTS[4].name,
      applicant_id: applicantIds[4],
      inventor_names: ['강서연'],
    },
    {
      source_patent_id: 'KR-10-2022-0009001',
      source: 'KIPRIS',
      title: '나노 구조 촉매를 이용한 수소 생산 방법',
      title_en: 'Hydrogen Production Method Using Nanostructure Catalyst',
      status: 'PENDING',
      filing_date: '2022-11-20',
      ipc_codes: ['C01B', 'B01J'],
      applicant_name: APPLICANTS[4].name,
      applicant_id: applicantIds[4],
      inventor_names: ['임태우', '서지은'],
    },
    {
      source_patent_id: 'KR-10-2022-0009002',
      source: 'KIPRIS',
      title: '스마트 팩토리 IoT 플랫폼 시스템',
      title_en: 'Smart Factory IoT Platform System',
      status: 'PENDING',
      filing_date: '2022-12-01',
      ipc_codes: ['G05B', 'H04L'],
      applicant_name: APPLICANTS[1].name,
      applicant_id: applicantIds[1],
      inventor_names: ['노소희'],
    },

    // REGISTERED × 5
    {
      source_patent_id: 'KR-10-2020-0500001',
      source: 'KIPRIS',
      title: '플렉시블 디스플레이 기판 제조 방법',
      title_en: 'Method for Manufacturing Flexible Display Substrate',
      status: 'REGISTERED',
      filing_date: '2020-02-10',
      registration_date: '2021-08-15',
      expiry_date: addDays(today, 90),
      ipc_codes: ['H01L', 'G09F'],
      applicant_name: APPLICANTS[0].name,
      applicant_id: applicantIds[0],
      inventor_names: ['김태영', '이주희'],
    },
    {
      source_patent_id: 'KR-10-2019-0500002',
      source: 'KIPRIS',
      title: '자율주행 차량용 라이다 센서 시스템',
      title_en: 'LiDAR Sensor System for Autonomous Vehicles',
      status: 'REGISTERED',
      filing_date: '2019-06-20',
      registration_date: '2020-12-01',
      expiry_date: addDays(today, 180),
      ipc_codes: ['G01S', 'B60W'],
      applicant_name: APPLICANTS[2].name,
      applicant_id: applicantIds[2],
      inventor_names: ['최우진', '박하나'],
    },
    {
      source_patent_id: 'KR-10-2021-0500003',
      source: 'KIPRIS',
      title: 'DDR5 메모리 데이터 인터페이스 회로',
      title_en: 'DDR5 Memory Data Interface Circuit',
      status: 'REGISTERED',
      filing_date: '2021-01-15',
      registration_date: '2022-04-20',
      expiry_date: addDays(today, 15), // ← 만료 임박 15일
      ipc_codes: ['H01L', 'G11C 11/407'],
      applicant_name: APPLICANTS[3].name,
      applicant_id: applicantIds[3],
      inventor_names: ['신민서'],
    },
    {
      source_patent_id: 'KR-10-2020-0500004',
      source: 'KIPRIS',
      title: '머신러닝 기반 이상 탐지 시스템',
      title_en: 'Machine Learning-Based Anomaly Detection System',
      status: 'REGISTERED',
      filing_date: '2020-09-05',
      registration_date: '2022-01-10',
      expiry_date: addDays(today, 7), // ← 만료 임박 7일
      ipc_codes: ['G06N', 'G06F 17/18'],
      applicant_name: APPLICANTS[4].name,
      applicant_id: applicantIds[4],
      inventor_names: ['류민성', '조은별'],
    },
    {
      source_patent_id: 'KR-10-2018-0500005',
      source: 'KIPRIS',
      title: '고효율 태양전지 모듈 및 제조방법',
      title_en: 'High-Efficiency Solar Cell Module and Manufacturing Method',
      status: 'REGISTERED',
      filing_date: '2018-04-01',
      registration_date: '2019-11-30',
      expiry_date: addDays(today, 25), // ← 만료 임박 25일
      ipc_codes: ['H01L 31/04', 'H02S'],
      applicant_name: APPLICANTS[1].name,
      applicant_id: applicantIds[1],
      inventor_names: ['배정원'],
    },

    // EXPIRED × 2
    {
      source_patent_id: 'KR-10-2010-0700001',
      source: 'KIPRIS',
      title: '초기 스마트폰 터치스크린 인터페이스',
      title_en: 'Early Smartphone Touchscreen Interface',
      status: 'EXPIRED',
      filing_date: '2010-03-22',
      registration_date: '2011-09-01',
      expiry_date: '2021-03-22',
      ipc_codes: ['G06F 3/041'],
      applicant_name: APPLICANTS[0].name,
      applicant_id: applicantIds[0],
      inventor_names: ['홍길동'],
    },
    {
      source_patent_id: 'KR-10-2008-0700002',
      source: 'KIPRIS',
      title: '플래시 메모리 셀 구조',
      title_en: 'Flash Memory Cell Structure',
      status: 'EXPIRED',
      filing_date: '2008-07-14',
      registration_date: '2009-12-20',
      expiry_date: '2019-07-14',
      ipc_codes: ['H01L 29/788', 'G11C 16/04'],
      applicant_name: APPLICANTS[3].name,
      applicant_id: applicantIds[3],
      inventor_names: ['전병호', '남궁선'],
    },
  ]
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Demo 데이터 시딩 시작...\n')

  // 1. Demo 유저 생성 (이미 있으면 스킵)
  console.log(`👤 데모 사용자 생성: ${DEMO_EMAIL}`)
  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })

  let userId
  if (signUpError?.message?.includes('already been registered') || signUpError?.code === 'email_exists') {
    const { data: listData } = await supabase.auth.admin.listUsers()
    const existing = listData?.users?.find((u) => u.email === DEMO_EMAIL)
    if (!existing) { console.error('❌ 기존 유저를 찾을 수 없습니다.'); process.exit(1) }
    userId = existing.id
    console.log(`  ↳ 기존 사용자 사용: ${userId}`)
  } else if (signUpError) {
    console.error('❌ 사용자 생성 실패:', signUpError.message)
    process.exit(1)
  } else {
    userId = signUpData.user.id
    console.log(`  ↳ 생성됨: ${userId}`)
  }

  // 2. Org 생성
  console.log(`\n🏢 조직 생성: ${ORG_NAME}`)
  const { data: existingOrg } = await supabase
    .from('orgs')
    .select('id')
    .eq('name', ORG_NAME)
    .maybeSingle()

  let orgId
  if (existingOrg) {
    orgId = existingOrg.id
    console.log(`  ↳ 기존 조직 사용: ${orgId}`)
  } else {
    const { data: newOrg, error: orgError } = await supabase
      .from('orgs')
      .insert({ name: ORG_NAME, plan: 'pro' })
      .select('id')
      .single()
    if (orgError) { console.error('❌ 조직 생성 실패:', orgError.message); process.exit(1) }
    orgId = newOrg.id
    console.log(`  ↳ 생성됨: ${orgId}`)
  }

  // 3. org_members
  const { error: memberError } = await supabase
    .from('org_members')
    .upsert({ org_id: orgId, user_id: userId, role: 'admin' }, { onConflict: 'org_id,user_id', ignoreDuplicates: true })
  if (memberError) console.warn('  ⚠ org_members upsert:', memberError.message)
  else console.log('  ↳ org_members 설정 완료')

  // 4. Applicants
  console.log('\n👔 출원인 데이터 삽입...')
  const { data: insertedApplicants, error: applicantError } = await supabase
    .from('applicants')
    .upsert(
      APPLICANTS.map((a) => ({ ...a, org_id: orgId })),
      { onConflict: 'org_id,name', ignoreDuplicates: false },
    )
    .select('id, name')
  if (applicantError) { console.error('❌ 출원인 삽입 실패:', applicantError.message); process.exit(1) }
  const applicantIds = insertedApplicants.map((a) => a.id)
  console.log(`  ↳ ${insertedApplicants.length}개 출원인 완료`)

  // 5. Patents
  console.log('\n📄 특허 데이터 삽입...')
  const patents = buildPatents(applicantIds)
  const { data: insertedPatents, error: patentError } = await supabase
    .from('patents')
    .upsert(
      patents.map((p) => ({ ...p, org_id: orgId })),
      { onConflict: 'source_patent_id', ignoreDuplicates: false },
    )
    .select('id, title, status')
  if (patentError) { console.error('❌ 특허 삽입 실패:', patentError.message); process.exit(1) }
  console.log(`  ↳ ${insertedPatents.length}개 특허 완료`)
  for (const p of insertedPatents) {
    console.log(`    • [${p.status}] ${p.title.slice(0, 40)}...`)
  }

  // 6. Watchlist (처음 5개)
  console.log('\n❤️  주시 목록 추가 (처음 5개)...')
  const watchItems = insertedPatents.slice(0, 5).map((p) => ({
    org_id: orgId,
    user_id: userId,
    patent_id: p.id,
    note: `Demo 주시 메모 - ${p.title.slice(0, 20)}`,
  }))
  const { error: watchError } = await supabase
    .from('watchlist')
    .upsert(watchItems, { onConflict: 'user_id,patent_id', ignoreDuplicates: true })
  if (watchError) console.warn('  ⚠ watchlist:', watchError.message)
  else console.log(`  ↳ ${watchItems.length}개 주시 완료`)

  // 7. Alert rules
  console.log('\n🔔 알림 규칙 추가...')
  const alertRules = [
    {
      org_id: orgId,
      user_id: userId,
      name: '배터리 키워드 모니터링',
      type: 'KEYWORD',
      channel: 'EMAIL',
      condition: { keyword: '이차전지' },
      is_active: true,
    },
    {
      org_id: orgId,
      user_id: userId,
      name: '삼성전자 특허 추적',
      type: 'COMPETITOR',
      channel: 'EMAIL',
      condition: { applicant_name: '삼성전자' },
      is_active: true,
    },
    {
      org_id: orgId,
      user_id: userId,
      name: 'H01M IPC 모니터링',
      type: 'IPC',
      channel: 'EMAIL',
      condition: { ipc_codes: ['H01M'] },
      is_active: true,
    },
    {
      org_id: orgId,
      user_id: userId,
      name: '만료 임박 알림',
      type: 'EXPIRY',
      channel: 'EMAIL',
      condition: { days_before: [7, 30] },
      is_active: true,
    },
  ]
  const { error: ruleError } = await supabase.from('alert_rules').upsert(alertRules, {
    ignoreDuplicates: false,
  })
  if (ruleError) console.warn('  ⚠ alert_rules:', ruleError.message)
  else console.log(`  ↳ ${alertRules.length}개 알림 규칙 완료`)

  console.log('\n✅ 시딩 완료!')
  console.log(`\n📋 로그인 정보:`)
  console.log(`   이메일: ${DEMO_EMAIL}`)
  console.log(`   비밀번호: ${DEMO_PASSWORD}`)
}

main().catch((e) => {
  console.error('❌ 치명적 오류:', e)
  process.exit(1)
})
