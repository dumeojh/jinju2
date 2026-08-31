-- ============================================================================
--  안성여고 수학 수행평가 수파베이스 설정 (2026-1 / 2026-2 공통)
--  수파베이스 → SQL Editor 에 붙여넣고 [Run] 하세요. 여러 번 실행해도 안전합니다.
-- ============================================================================


-- ============================================================================
--  0. 학생 명렬표 (students)  ※ 이미 만들어 두셨다면 아래 create 는 건너뜁니다
-- ============================================================================
create table if not exists students (
  id        bigserial primary key,
  grade     int,
  stu_class int,
  stu_num   int,
  stu_name  text
);

-- 명렬표는 학생·교사 페이지 모두 "읽기만" 합니다.
alter table students enable row level security;

drop policy if exists "명렬표 조회 허용" on students;
create policy "명렬표 조회 허용" on students
  for select to anon using (true);


-- ============================================================================
--  1학기 (2026-1)  : 학생용 응시 페이지 + grading.html
--  채점 배점 : 실세계 현상 조사 및 재구성하기(5) / 함수 개념을 통해 현상 분석하기(10)
--              / 대수 개념의 유용성 가치 제시하기(5)  = 총 20점
-- ============================================================================
create table if not exists submissions_2026_1 (
  id            bigserial primary key,
  created_at    timestamptz default now(),

  grade         int,
  stu_class     int,
  stu_num       int,
  stu_name      text,

  func_area     text,          -- 지수함수 / 로그함수 / 삼각함수
  article_title text,
  ref1          text,
  ref2          text,
  ref3          text,
  reason        text,
  data_points   text,
  formula       text,
  obs1          text,          -- (1) 수학적 특징
  obs2          text,          -- (2) 현상 해석
  obs3          text,          -- (3) 가치 성찰

  submit_type   text,          -- 정상제출 / 시간초과 / 강제제출
  warn_count    int default 0,

  score1        int,           -- 실세계 현상 조사 및 재구성하기 (5)
  score2        int,           -- 함수 개념을 통해 현상 분석하기 (10)
  score3        int,           -- 대수 개념의 유용성 가치 제시하기 (5)
  total         int,
  ach_level     text,
  feedback      text,
  grader        text,
  graded_at     timestamptz
);

create table if not exists exam_logs_2026_1 (
  id         bigserial primary key,
  created_at timestamptz default now(),
  grade      int,
  stu_class  int,
  stu_num    int,
  stu_name   text,
  event      text,            -- start / warning
  message    text
);


-- ============================================================================
--  2학기 (2026-2)  : 2026-2-01.html + grading-2026-2.html  (기존과 동일)
-- ============================================================================
create table if not exists submissions_2026_2 (
  id            bigserial primary key,
  created_at    timestamptz default now(),

  grade         int,
  stu_class     int,
  stu_num       int,
  stu_name      text,

  func_area     text,
  article_title text,
  ref1          text,
  ref2          text,
  ref3          text,
  reason        text,
  data_points   text,
  formula       text,
  obs1          text,
  obs2          text,

  submit_type   text,
  warn_count    int default 0,

  score1        int,
  score2        int,
  score3        int,
  total         int,
  ach_level     text,
  feedback      text,
  grader        text,
  graded_at     timestamptz
);

create table if not exists exam_logs_2026_2 (
  id         bigserial primary key,
  created_at timestamptz default now(),
  grade      int,
  stu_class  int,
  stu_num    int,
  stu_name   text,
  event      text,
  message    text
);


-- ============================================================================
--  보안 설정 (RLS)
-- ============================================================================
alter table submissions_2026_1 enable row level security;
alter table exam_logs_2026_1   enable row level security;
alter table submissions_2026_2 enable row level security;
alter table exam_logs_2026_2   enable row level security;

-- 학생용 페이지 : 제출(insert) 만 허용
drop policy if exists "학생 제출 허용 1" on submissions_2026_1;
create policy "학생 제출 허용 1" on submissions_2026_1
  for insert to anon with check (true);

drop policy if exists "학생 기록 허용 1" on exam_logs_2026_1;
create policy "학생 기록 허용 1" on exam_logs_2026_1
  for insert to anon with check (true);

drop policy if exists "학생 제출 허용 2" on submissions_2026_2;
create policy "학생 제출 허용 2" on submissions_2026_2
  for insert to anon with check (true);

drop policy if exists "학생 기록 허용 2" on exam_logs_2026_2;
create policy "학생 기록 허용 2" on exam_logs_2026_2
  for insert to anon with check (true);

-- 교사용 페이지 : 조회(select) 와 점수 기록(update) 허용
-- ⚠️ 이 정책이 켜져 있는 동안에는 anon key를 아는 사람이 모든 답안을 읽을 수 있습니다.
--    시험 시간에는 잠시 꺼두고, 채점할 때만 켜는 방식을 권장합니다. (맨 아래 참고)
drop policy if exists "채점 조회 허용 1" on submissions_2026_1;
create policy "채점 조회 허용 1" on submissions_2026_1
  for select to anon using (true);

drop policy if exists "채점 저장 허용 1" on submissions_2026_1;
create policy "채점 저장 허용 1" on submissions_2026_1
  for update to anon using (true) with check (true);

drop policy if exists "채점 조회 허용 2" on submissions_2026_2;
create policy "채점 조회 허용 2" on submissions_2026_2
  for select to anon using (true);

drop policy if exists "채점 저장 허용 2" on submissions_2026_2;
create policy "채점 저장 허용 2" on submissions_2026_2
  for update to anon using (true) with check (true);

-- 실시간 현황판(dashboard.html) 은 로그 조회가 필요합니다.
drop policy if exists "현황 조회 허용 1" on exam_logs_2026_1;
create policy "현황 조회 허용 1" on exam_logs_2026_1
  for select to anon using (true);

drop policy if exists "현황 조회 허용 2" on exam_logs_2026_2;
create policy "현황 조회 허용 2" on exam_logs_2026_2
  for select to anon using (true);


-- ============================================================================
--  [참고] 시험 시간 동안 답안 조회를 막고 싶을 때
--    drop policy "채점 조회 허용 1" on submissions_2026_1;
--    drop policy "채점 저장 허용 1" on submissions_2026_1;
--  채점할 때 위 create policy 두 개를 다시 실행하면 됩니다.
--  (현황판은 exam_logs 만 읽으므로 답안 조회를 꺼도 계속 동작합니다)
-- ============================================================================
