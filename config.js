/** ============================================================================
 *  안성여고 수학 수행평가 시스템 - 공통 설정 파일
 *  ----------------------------------------------------------------------------
 *  ⚠️ 아래 2곳의 따옴표 안 내용만 바꿔 주세요.
 *  (구글 앱스 스크립트는 더 이상 사용하지 않습니다. BASE_SCRIPT_URL 삭제됨)
 * ============================================================================ */


/** [1] 수파베이스 프로젝트 URL
 *  수파베이스 → Project Settings → Data API → Project URL
 *  예: https://abcdefghijklmn.supabase.co
 */
const SUPABASE_URL = "https://xkxqbowangecvotyxwsz.supabase.co";


/** [2] 수파베이스 anon key (public)
 *  수파베이스 → Project Settings → API Keys → anon public
 *  ⚠️ service_role 키는 절대 여기에 넣지 마세요. (브라우저에 그대로 노출됩니다)
 */
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhreHFib3dhbmdlY3ZvdHl4d3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTEwNDEsImV4cCI6MjA5NDMyNzA0MX0.LvNmU2zzN70VnHvIIxv0hGZxvjUE2HlLKc5H-inSQLM";


/** ============================================================================
 *  아래는 수정하지 않아도 됩니다. (수파베이스 테이블 이름)
 * ============================================================================ */

/* 학생 명렬표 (학년 · 반 · 번호 · 이름) — 이미 만들어 두신 표 */
const SB_TABLE_STUDENTS = "students";

/* 1학기 (2026-1-0x.html, grading.html) */
const SB_TABLE_SUBMISSIONS_1 = "submissions_2026_1";
const SB_TABLE_LOGS_1 = "exam_logs_2026_1";

/* 2학기 (2026-2-01.html, grading-2026-2.html) */
const SB_TABLE_SUBMISSIONS_2 = "submissions_2026_2";
const SB_TABLE_LOGS_2 = "exam_logs_2026_2";

/* 기존 2학기 페이지가 쓰던 이름 — 그대로 두어야 2학기 페이지가 계속 동작합니다 */
const SB_TABLE_SUBMISSIONS = SB_TABLE_SUBMISSIONS_2;
const SB_TABLE_LOGS = SB_TABLE_LOGS_2;


/** ============================================================================
 *  [공통] 수파베이스 REST 호출 헬퍼
 *  모든 페이지가 이 함수들을 함께 사용합니다.
 * ============================================================================ */
const SB_HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
};

/* 설정이 안 되어 있으면 화면에 친절히 알려 주기 위한 확인용 */
const SB_READY = !String(SUPABASE_URL).includes("여기에") && !String(SUPABASE_ANON_KEY).includes("여기에");

/* 조회 : sbSelect('students', 'select=*&grade=eq.2') */
async function sbSelect(table, query = 'select=*') {
    // ⚠️ 수파베이스는 쿼리에 들어온 이름을 모두 '열 이름 필터'로 봅니다.
    //    캐시 방지용 t=... 같은 값을 붙이면 조회가 실패하므로 넣지 않습니다.
    //    (캐시는 아래 cache: 'no-store' 로 막습니다)
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
    const res = await fetch(url, { headers: SB_HEADERS, cache: 'no-store' });
    if (!res.ok) throw new Error(`[${table}] 조회 실패 (${res.status}) ${await res.text()}`);
    return await res.json();
}

/* 저장 : sbInsert('exam_logs_2026_1', { ... }) */
async function sbInsert(table, row) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify(row)
    });
    if (!res.ok) throw new Error(`[${table}] 저장 실패 (${res.status}) ${await res.text()}`);
    return true;
}

/* 수정 : sbUpdate('submissions_2026_1', 12, { score1: 5 })  ← 12는 행의 id */
async function sbUpdate(table, id, patch) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error(`[${table}] 수정 실패 (${res.status}) ${await res.text()}`);
    return true;
}

/** ----------------------------------------------------------------------------
 *  명렬표(students) 읽기
 *  실제 표 구조 : student_id / grade1_num / grade2_num / grade3_num / name / ...
 *  학생 한 명이 학년마다 학번이 달라지므로, 해당 학년의 칸을 골라서 읽습니다.
 * -------------------------------------------------------------------------- */
const SB_STUDENTS_NAME_COL = "name";
const SB_STUDENTS_NUM_COL = { 1: "grade1_num", 2: "grade2_num", 3: "grade3_num" };

/* 우리 학교 최대 반 수 — 학번 해석이 애매할 때 판단 기준으로 씁니다 */
const SB_MAX_CLASS = 12;

/** 학번 문자열 → { grade, cls, num }
 *  아래 형태를 모두 알아봅니다.
 *    "20305"      → 2학년 3반 5번
 *    "0305"       → (칸이 알려주는 학년) 3반 5번
 *    "305"        → (칸이 알려주는 학년) 3반 5번
 *    "2-3-5", "2학년 3반 5번", "3-5" 처럼 구분자가 있는 경우
 */
function sbParseStuNo(raw, gradeHint, gradeLeads) {
    if (raw === null || raw === undefined) return null;
    const parts = String(raw).trim().split(/[^0-9]+/).filter(v => v !== '');
    if (parts.length === 0) return null;

    if (parts.length >= 3) {
        return { grade: +parts[0], cls: +parts[1], num: +parts[2] };
    }
    if (parts.length === 2) {
        return { grade: +gradeHint, cls: +parts[0], num: +parts[1] };
    }

    const d = parts[0];
    if (d.length >= 5) {
        return { grade: +d[0], cls: +d.slice(1, 3), num: +d.slice(3) };
    }
    if (d.length === 4) {
        // 네 자리는 두 가지로 읽힐 수 있습니다.
        //   "1305" = 1학년 3반 5번   (학년+반+번호)
        //   "1205" = 12반 5번        (반두자리+번호)
        // 어느 쪽인지는 sbLoadStudents() 가 표 전체를 보고 판단해 알려 줍니다.
        if (gradeLeads === true) return { grade: +d[0], cls: +d[1], num: +d.slice(2) };
        if (gradeLeads === false) return { grade: +gradeHint, cls: +d.slice(0, 2), num: +d.slice(2) };

        const cls = +d.slice(0, 2);
        if (cls >= 1 && cls <= SB_MAX_CLASS) return { grade: +gradeHint, cls: cls, num: +d.slice(2) };
        return { grade: +d[0], cls: +d[1], num: +d.slice(2) };
    }
    if (d.length === 3) {
        return { grade: +gradeHint, cls: +d[0], num: +d.slice(1) };
    }
    return null;
}

/* 명렬표 전체를 한 번 읽어 캐시해 둡니다 (같은 페이지에서 반복 호출해도 1회만 통신) */
let _sbStudentCache = null;
async function sbLoadStudents() {
    if (_sbStudentCache) return _sbStudentCache;

    // 필요한 열만 가져옵니다. (희망 계열·학과 같은 다른 정보는 받지 않습니다)
    const cols = ['name', 'grade1_num', 'grade2_num', 'grade3_num'].join(',');
    const rows = await sbSelect(SB_TABLE_STUDENTS, 'select=' + cols);

    /** 네 자리 학번이 "학년+반+번호" 인지 "반두자리+번호" 인지 표 전체를 보고 판단합니다.
     *  grade2_num 의 네 자리 값이 거의 전부 2로 시작한다면 → 맨 앞이 학년입니다. */
    const gradeLeads = {};
    for (const g of [1, 2, 3]) {
        const four = rows
            .map(r => String(r[SB_STUDENTS_NUM_COL[g]] ?? '').replace(/[^0-9]/g, ''))
            .filter(v => v.length === 4);
        if (four.length < 3) { gradeLeads[g] = undefined; continue; }
        const lead = four.filter(v => v[0] === String(g)).length / four.length;
        gradeLeads[g] = lead >= 0.9 ? true : (lead <= 0.1 ? false : undefined);
    }

    const list = [];

    rows.forEach(r => {
        const name = String(r[SB_STUDENTS_NAME_COL] ?? '').trim();
        // 한 학생이 1·2·3학년 칸을 모두 가질 수 있으므로 채워진 칸마다 한 줄씩 만듭니다.
        for (const g of [1, 2, 3]) {
            const parsed = sbParseStuNo(r[SB_STUDENTS_NUM_COL[g]], g, gradeLeads[g]);
            if (!parsed || !parsed.cls || !parsed.num) continue;
            list.push({
                grade: String(parsed.grade),
                cls: String(parsed.cls),
                num: String(parsed.num),
                name: name
            });
        }
    });

    _sbStudentCache = list;
    return list;
}

/* 특정 학년·반의 명렬표만 (번호순 정렬) */
async function sbStudentsOf(grade, cls) {
    const all = await sbLoadStudents();
    return all
        .filter(s => String(s.grade) === String(grade) && String(s.cls) === String(cls))
        .sort((a, b) => (parseInt(a.num) || 0) - (parseInt(b.num) || 0));
}
