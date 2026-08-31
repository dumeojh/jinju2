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
const SUPABASE_URL = "https://여기에_프로젝트_주소.supabase.co";


/** [2] 수파베이스 anon key (public)
 *  수파베이스 → Project Settings → API Keys → anon public
 *  ⚠️ service_role 키는 절대 여기에 넣지 마세요. (브라우저에 그대로 노출됩니다)
 */
const SUPABASE_ANON_KEY = "여기에_anon_public_키_붙여넣기";


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
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&t=${Date.now()}`;
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
 *  명렬표(students)의 열 이름이 무엇이든 알아서 찾아 주는 도우미
 *  (grade / 학년 / hakN ... 어떤 이름이어도 아래 후보 안에 있으면 인식합니다)
 * -------------------------------------------------------------------------- */
function sbPick(row, candidates) {
    for (const c of candidates) {
        if (row[c] !== undefined && row[c] !== null && row[c] !== '') return row[c];
    }
    // 공백 제거 후 한 번 더 비교
    for (const c of candidates) {
        const target = String(c).replace(/\s+/g, '').toLowerCase();
        for (const k in row) {
            if (String(k).replace(/\s+/g, '').toLowerCase() === target) {
                if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
            }
        }
    }
    return null;
}

/* 명렬표 한 줄 → { grade, cls, num, name } 로 정리 */
function sbNormalizeStudent(row) {
    return {
        grade: String(sbPick(row, ['grade', '학년', 'hakyeon', 'gr']) ?? '').replace('학년', '').trim(),
        cls: String(sbPick(row, ['stu_class', 'class', 'cls', '반', 'ban']) ?? '').replace('반', '').trim(),
        num: String(sbPick(row, ['stu_num', 'num', 'number', 'no', '번호', 'beonho']) ?? '').replace('번', '').trim(),
        name: String(sbPick(row, ['stu_name', 'name', '이름', '성명', 'student_name']) ?? '').trim(),
        hakbun: sbPick(row, ['hakbun', '학번', 'student_id', 'sid'])
    };
}

/* 명렬표 전체를 한 번 읽어 캐시해 둡니다 (같은 페이지에서 반복 호출해도 1회만 통신) */
let _sbStudentCache = null;
async function sbLoadStudents() {
    if (_sbStudentCache) return _sbStudentCache;
    const rows = await sbSelect(SB_TABLE_STUDENTS, 'select=*');
    _sbStudentCache = rows.map(sbNormalizeStudent).filter(s => s.name || s.num);
    return _sbStudentCache;
}

/* 특정 학년·반의 명렬표만 (번호순 정렬) */
async function sbStudentsOf(grade, cls) {
    const all = await sbLoadStudents();
    return all
        .filter(s => String(s.grade) === String(grade) && String(s.cls) === String(cls))
        .sort((a, b) => (parseInt(a.num) || 0) - (parseInt(b.num) || 0));
}
