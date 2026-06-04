/* ============================================================
   state.js — 세션 단위 상태
   브라우저 탭을 닫으면 초기화됨 (sessionStorage).
   ID/캐릭터 선택 없이, 그날그날 깨끗하게 시작.
   ============================================================ */

const STATE_KEY = "computer_adventure_session_v2";

// 캐릭터는 하나로 고정 (10단계 진화 영웅)
const FIXED_CHARACTER_ID = "hero";

// freshState()는 호출할 때마다 새로운 객체/배열을 만들어 줌
// (참조 공유 버그 방지 — 이전엔 DEFAULT_STATE.bestScores를 게임이 직접 수정해서
//  나중에 초기화해도 이미 더럽혀진 객체를 참조하는 문제가 있었음)
function freshState() {
    return {
        points: 0,
        lessonsCompleted: [],
        bestScores: {},                 // { lesson1: 2700, ... }
        playerName: "",                  // 명예의 전당 이름
        currentUnit: 1,                  // 현재 보고 있는 단원
        shooterAttempts: 0,              // 스텝5 슈터 도전 횟수 (단계 진행 결정)
    };
}

// 호환용 (기존 코드가 참조)
const DEFAULT_STATE = freshState();

function loadState() {
    try {
        const raw = sessionStorage.getItem(STATE_KEY);
        if (!raw) return freshState();
        const parsed = JSON.parse(raw);
        return Object.assign(freshState(), parsed);
    } catch (e) {
        console.warn("state load failed", e);
        return freshState();
    }
}

function saveState(s) {
    try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(s));
    } catch (e) {
        console.warn("state save failed", e);
    }
}

function resetState() {
    sessionStorage.removeItem(STATE_KEY);
    cancelGraduationReset();
}

// ----- 졸업 후 자동 초기화 (유휴 시간 기반) -----
// 한 수업이 끝난 후 다음 수업이 들어왔을 때 이전 기록이 이어지지 않도록.
//
// ⚠️ 예전엔 졸업 화면을 본 시점부터 "벽시계 10분"이 지나면 무조건 초기화했는데,
//    학생이 졸업 후 다른 단원을 계속 플레이해도 게임 도중에 갑자기 리셋되는
//    버그가 있었다. 이제는 "활동이 없는 유휴 시간"을 기준으로 바꾼다.
//    → 클릭/키 입력 등 활동이 있을 때마다 데드라인을 뒤로 미루므로,
//      게임을 활발히 하고 있는 학생은 절대 초기화되지 않는다.
//    → 자리가 비어 N분간 아무 활동도 없을 때(= 다음 수업 차례)만 초기화된다.
let _gradResetTimer = null;
let _gradResetArmed = false;          // 졸업 화면을 본 후 감시 활성화 여부
let _gradResetMinutes = 10;
let _gradIdleDeadline = null;         // 이 시각까지 활동 없으면 초기화

function _performGraduationReset() {
    _gradResetTimer = null;
    _gradResetArmed = false;
    _gradIdleDeadline = null;
    sessionStorage.removeItem(STATE_KEY);
    // freshState()로 깨끗한 새 객체 생성 (bestScores 등 nested 객체까지 모두 초기화)
    const f = freshState();
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, f);
    if (typeof navigate === "function") navigate("home");
    if (typeof showToast === "function") {
        showToast("🌟 새 수업이 시작돼요!\n진행이 초기화되었어요.");
    }
}

// 졸업 화면에서 호출 — 유휴 감시 시작
function scheduleGraduationReset(minutes = 10) {
    _gradResetMinutes = minutes;
    _gradResetArmed = true;
    bumpGraduationIdle();   // 첫 데드라인 설정
}

// 활동이 감지될 때마다 호출 — 유휴 데드라인을 뒤로 미룬다
function bumpGraduationIdle() {
    if (!_gradResetArmed) return;     // 감시 중이 아니면 아무 것도 안 함 (오버헤드 0)
    _gradIdleDeadline = Date.now() + _gradResetMinutes * 60 * 1000;
    if (_gradResetTimer) clearTimeout(_gradResetTimer);
    _gradResetTimer = setTimeout(_onGraduationIdleCheck, _gradResetMinutes * 60 * 1000);
}

function _onGraduationIdleCheck() {
    _gradResetTimer = null;
    if (!_gradResetArmed) return;
    const remaining = (_gradIdleDeadline || 0) - Date.now();
    if (remaining > 250) {
        // 활동으로 데드라인이 미뤄졌음 — 남은 시간만큼 다시 대기
        _gradResetTimer = setTimeout(_onGraduationIdleCheck, remaining);
        return;
    }
    _performGraduationReset();
}

function cancelGraduationReset() {
    _gradResetArmed = false;
    _gradIdleDeadline = null;
    if (_gradResetTimer) {
        clearTimeout(_gradResetTimer);
        _gradResetTimer = null;
    }
}

function getGraduationResetRemaining() {
    if (!_gradResetArmed || !_gradIdleDeadline) return null;
    return Math.max(0, _gradIdleDeadline - Date.now());
}

// 전역 활동 감지 — 졸업 유휴 초기화 데드라인을 활동마다 미룸.
// (감시 중이 아닐 땐 bumpGraduationIdle()이 즉시 return 하므로 부담 없음)
// pointerdown은 마우스·터치·펜을 모두 포함, touchstart는 구형 사파리 대비.
if (typeof document !== "undefined") {
    ["pointerdown", "keydown", "touchstart"].forEach(evt => {
        document.addEventListener(evt, bumpGraduationIdle, { passive: true, capture: true });
    });
}

// 전역 상태
const state = loadState();

function commit() {
    saveState(state);
}

function addPoints(delta) {
    state.points = Math.max(0, state.points + delta);
    commit();
}

function recordBestScore(lessonId, score) {
    const prev = state.bestScores[lessonId] || 0;
    if (score > prev) {
        state.bestScores[lessonId] = score;
        commit();
    }
}

function markLessonCompleted(lessonId) {
    if (!state.lessonsCompleted.includes(lessonId)) {
        state.lessonsCompleted.push(lessonId);
        commit();
    }
}

function getCharacter() {
    return CHARACTERS.find(c => c.id === FIXED_CHARACTER_ID) || CHARACTERS[0];
}

function getCurrentEmoji() {
    const ch = getCharacter();
    if (!ch) return "🥚";
    const lvl = getLevelFromPoints(state.points);
    return ch.evolved[Math.min(lvl - 1, ch.evolved.length - 1)];
}

function getCurrentLevelName() {
    return getLevelName(getLevelFromPoints(state.points));
}

function getEmojiForLevel(level) {
    const ch = getCharacter();
    if (!ch) return "🥚";
    return ch.evolved[Math.min(level - 1, ch.evolved.length - 1)];
}

// ============================================================
// 명예의 전당 — Supabase 우선, localStorage 백업
// ============================================================
const HALL_KEY = "computer_adventure_hall_v3";   // v3 = 순위 초기화

// 이전 버전 키 정리
try {
    localStorage.removeItem("computer_adventure_hall_v1");
    localStorage.removeItem("computer_adventure_hall_v2");
} catch(e) {}

// Supabase 클라이언트 (config.js의 값이 있을 때만 생성)
let supabaseClient = null;
try {
    if (typeof SUPABASE_URL === "string" && SUPABASE_URL && typeof supabase !== "undefined") {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✓ Supabase 연결됨:", SUPABASE_URL);
    } else {
        console.log("ℹ️ Supabase 미설정 — localStorage로 동작 (이 기기 전용)");
    }
} catch (e) {
    console.warn("Supabase init 실패", e);
}

function isSharedHallEnabled() {
    return !!supabaseClient;
}

// --- 로컬 백업 ---
function getLocalHall() {
    try {
        return JSON.parse(localStorage.getItem(HALL_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveLocalHall(list) {
    try {
        localStorage.setItem(HALL_KEY, JSON.stringify(list));
    } catch (e) {}
}

function addToLocalHall(name, score, level) {
    if (!name || typeof score !== "number") return;
    const list = getLocalHall();
    const idx = list.findIndex(e => e.name === name);
    const entry = { name, score, level, date: new Date().toISOString() };
    if (idx >= 0) {
        if (score > list[idx].score) list[idx] = entry;
    } else {
        list.push(entry);
    }
    list.sort((a, b) => b.score - a.score);
    saveLocalHall(list.slice(0, 50));
}

// --- 통합 API (async, Supabase 우선) ---
async function fetchHallTop(n = 10) {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from("hall_of_fame")
                .select("name, score, level")
                .order("score", { ascending: false })
                .limit(n);
            if (!error && data) return data;
        } catch (e) {
            console.warn("Supabase fetch 실패, 로컬로 폴백", e);
        }
    }
    return getLocalHall().slice(0, n);
}

async function addToHall(name, score, level) {
    if (!name || typeof score !== "number") return;
    addToLocalHall(name, score, level);  // 항상 로컬 백업

    if (supabaseClient) {
        try {
            // 기존 점수 확인
            const { data: existing } = await supabaseClient
                .from("hall_of_fame")
                .select("score")
                .eq("name", name)
                .maybeSingle();
            // 새 점수가 더 높을 때만 갱신/삽입
            if (!existing || score > (existing.score || 0)) {
                const { error } = await supabaseClient
                    .from("hall_of_fame")
                    .upsert(
                        { name, score, level, updated_at: new Date().toISOString() },
                        { onConflict: "name" }
                    );
                if (error) console.warn("Supabase upsert 에러", error);
            }
        } catch (e) {
            console.warn("Supabase 저장 실패", e);
        }
    }
}

// 동기 (기존 코드 호환용 — 로컬만)
function getTopHall(n = 10) {
    return getLocalHall().slice(0, n);
}

// 주어진 점수가 Top 30에 들어가는지
async function wouldQualifyForTop10(score) {
    const list = await fetchHallTop(30);
    if (list.length < 30) return true;
    const lowest = list[list.length - 1].score || 0;
    return score > lowest;
}

// 주어진 점수가 몇 위인지 (1-based, 31 이상이면 31 반환)
async function getRankForScore(score) {
    const list = await fetchHallTop(50);
    let rank = 1;
    for (const entry of list) {
        if (entry.score > score) rank++;
        else break;
    }
    return rank;
}

// ----- 단원 통과 헬퍼 -----
function findLessonById(lessonId) {
    for (const arr of Object.values(LESSONS_BY_UNIT)) {
        const l = arr.find(x => x.id === lessonId);
        if (l) return l;
    }
    return null;
}

function isLessonPassed(lessonId) {
    const lesson = findLessonById(lessonId);
    if (!lesson) return false;
    const best = state.bestScores[lessonId] || 0;
    return best >= lesson.goalScore;
}

function isLessonUnlocked(index, lessonsArr) {
    const arr = lessonsArr || getLessonsForUnit(state.currentUnit);
    if (BYPASS_LESSON_LOCKS) return true;
    if (index === 0) return true;
    return isLessonPassed(arr[index - 1].id);
}

function areAllLessonsPassed(unitNum) {
    const arr = getLessonsForUnit(unitNum || state.currentUnit);
    return arr.every(l => isLessonPassed(l.id));
}

function totalScoreFromBestScores(unitNum) {
    const arr = getLessonsForUnit(unitNum || state.currentUnit);
    return arr.reduce((sum, l) => sum + (state.bestScores[l.id] || 0), 0);
}

// 단원 게임이 끝났을 때: 이전 최고점보다 높으면 차이만큼만 누적 포인트에 더함
// (재시도해서 점수가 같거나 낮으면 누적 포인트 변화 없음)
function finishLesson(lessonId, finalScore) {
    const prevBest = state.bestScores[lessonId] || 0;
    const gain = Math.max(0, finalScore - prevBest);
    if (gain > 0) {
        state.bestScores[lessonId] = finalScore;
        state.points = Math.max(0, state.points + gain);
    }
    if (!state.lessonsCompleted.includes(lessonId)) {
        state.lessonsCompleted.push(lessonId);
    }
    commit();
    return { gain, prevBest, newBest: state.bestScores[lessonId] || prevBest };
}

// 단원 시작 시 적용할 시작 점수 (이전 최고점)
function getStartingScore(lessonId) {
    return state.bestScores[lessonId] || 0;
}
