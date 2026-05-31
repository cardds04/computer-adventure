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

// ----- 졸업 후 자동 초기화 (10분) -----
// 한 수업이 끝난 후 다음 수업이 들어왔을 때 이전 기록이 이어지지 않도록
let _gradResetTimer = null;
let _gradResetAt = null;

function scheduleGraduationReset(minutes = 10) {
    if (_gradResetTimer) return;   // 이미 예약됨
    _gradResetAt = Date.now() + minutes * 60 * 1000;
    _gradResetTimer = setTimeout(() => {
        _gradResetTimer = null;
        _gradResetAt = null;
        sessionStorage.removeItem(STATE_KEY);
        // freshState()로 깨끗한 새 객체 생성 (bestScores 등 nested 객체까지 모두 초기화)
        const f = freshState();
        for (const k of Object.keys(state)) delete state[k];
        Object.assign(state, f);
        if (typeof navigate === "function") navigate("home");
        if (typeof showToast === "function") {
            showToast("🌟 새 수업이 시작돼요!\n진행이 초기화되었어요.");
        }
    }, minutes * 60 * 1000);
}

function cancelGraduationReset() {
    if (_gradResetTimer) {
        clearTimeout(_gradResetTimer);
        _gradResetTimer = null;
        _gradResetAt = null;
    }
}

function getGraduationResetRemaining() {
    if (!_gradResetAt) return null;
    return Math.max(0, _gradResetAt - Date.now());
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
