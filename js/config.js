/* ============================================================
   Supabase 설정
   ----
   ① https://supabase.com 대시보드 → 프로젝트 → Settings → API
   ② 아래 두 값을 복사해서 붙여넣기:
       - Project URL
       - anon public key (긴 토큰 문자열)
   ③ 그 후 supabase SQL Editor에서 다음 SQL 실행:

       create table hall_of_fame (
           id bigserial primary key,
           name text not null unique,
           score bigint not null,     -- ⚠️ bigint! (integer는 약 21.4억까지라 레벨 200(22억+) 점수가 저장 안 됨)
           level integer,
           created_at timestamptz default now(),
           updated_at timestamptz default now()
       );

       -- 이미 score integer로 만든 경우, 아래 한 줄로 bigint으로 변경 (데이터 유지됨):
       --   alter table hall_of_fame alter column score type bigint;

       create index hall_score_idx on hall_of_fame (score desc);

       alter table hall_of_fame enable row level security;

       create policy "anyone can read" on hall_of_fame
           for select using (true);
       create policy "anyone can insert" on hall_of_fame
           for insert with check (true);
       create policy "anyone can update" on hall_of_fame
           for update using (true);

   비워 두면 자동으로 localStorage (이 기기 전용)로 fallback 됩니다.
   ============================================================ */

const SUPABASE_URL = "https://vhfyxpgntddprfrdfaay.supabase.co";       // 예: "https://abcdefg.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZnl4cGdudGRkcHJmcmRmYWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MjU1NDgsImV4cCI6MjA5NTAwMTU0OH0._-y-BjI5Sv6lmPs5y4SweynawW6WuQw0zfQj4FSXb5o";  // 예: "eyJhbG..." (긴 토큰)
