-- ============================================================================
--  안성여고 수학 수행평가 (2026-2) 수파베이스 초기 설정
--  수파베이스 → SQL Editor 에 붙여넣고 [Run] 한 번만 실행하세요.
-- ============================================================================

-- 1. 제출물 + 채점 결과 테이블 -------------------------------------------------
create table if not exists submissions_2026_2 (
  id            bigserial primary key,
  created_at    timestamptz default now(),

  -- 학생 정보
  grade         int,
  stu_class     int,
  stu_num       int,
  stu_name      text,

  -- 답안
  func_area     text,          -- 3차함수 / 4차함수
  article_title text,
  ref1          text,
  ref2          text,
  ref3          text,
  reason        text,
  data_points   text,
  formula       text,
  obs1          text,          -- 그래프 설명하기
  obs2          text,          -- 실생활 해석하기

  -- 제출 상태
  submit_type   text,          -- 정상제출 / 시간초과 / 강제제출
  warn_count    int default 0,

  -- 채점 결과 (교사용 페이지가 나중에 기록)
  score1        int,           -- 주제 선정 및 자료 조사하기 (4)
  score2        int,           -- 그래프 설명하기 (8)
  score3        int,           -- 실생활 해석하기 (8)
  total         int,
  ach_level     text,          -- A ~ E
  feedback      text,
  grader        text,
  graded_at     timestamptz
);

-- 2. 시험 시작 / 이탈 경고 기록 테이블 ------------------------------------------
create table if not exists exam_logs_2026_2 (
  id         bigserial primary key,
  created_at timestamptz default now(),
  grade      int,
  stu_class  int,
  stu_num    int,
  stu_name   text,
  event      text,            -- start / warning
  message    text
);

-- 3. 보안 설정 (RLS) ----------------------------------------------------------
alter table submissions_2026_2 enable row level security;
alter table exam_logs_2026_2  enable row level security;

-- 학생용 페이지: 제출(insert)만 허용
create policy "학생 제출 허용" on submissions_2026_2
  for insert to anon with check (true);

create policy "학생 기록 허용" on exam_logs_2026_2
  for insert to anon with check (true);

-- 채점용 페이지: 조회(select)와 점수 기록(update) 허용
-- ⚠️ 아래 두 정책이 켜져 있는 동안에는 anon key를 아는 사람이 모든 답안을 읽을 수 있습니다.
--    시험 시간에는 잠시 꺼두고, 채점할 때만 켜는 방식을 권장합니다.
create policy "채점 조회 허용" on submissions_2026_2
  for select to anon using (true);

create policy "채점 저장 허용" on submissions_2026_2
  for update to anon using (true) with check (true);


-- ============================================================================
--  [참고] 시험 시간 동안 답안 조회를 막고 싶을 때
--    drop policy "채점 조회 허용" on submissions_2026_2;
--    drop policy "채점 저장 허용" on submissions_2026_2;
--  채점할 때 위 create policy 두 줄을 다시 실행하면 됩니다.
-- ============================================================================
