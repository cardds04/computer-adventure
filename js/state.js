/* ============================================================
   state.js — 세션 단위 상태
   브라우저 탭을 닫으면 초기화됨 (sessionStorage).
   ID/캐릭터 선택 없이, 그날그날 깨끗하게 시작.
   ============================================================ */

const STATE_KEY = "computer_adventure_session_v2";

// 캐릭터는 하나로 고정 (10단계 진화 영웅)
const FIXED_CHARACTER_ID = "hero";

const DEFAULT_STATE = {
    points: 0,
    lessonsCompleted: [],
    bestScores: {},                 // { lesson1: 2700, ... }
};

function loadState() {
    try {
        const raw = sessionStorage.getItem(STATE_KEY);
        if (!raw) return { ...DEFAULT_STATE };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed };
    } catch (e) {
        console.warn("state load failed", e);
        return { ...DEFAULT_STATE };
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

// ----- 단원 통과 헬퍼 -----
function isLessonPassed(lessonId) {
    const lesson = LESSONS.find(l => l.id === lessonId);
    if (!lesson) return false;
    const best = state.bestScores[lessonId] || 0;
    return best >= lesson.goalScore;
}

function isLessonUnlocked(index) {
    if (BYPASS_LESSON_LOCKS) return true;
    if (index === 0) return true;
    return isLessonPassed(LESSONS[index - 1].id);
}

function areAllLessonsPassed() {
    return LESSONS.every(l => isLessonPassed(l.id));
}

function totalScoreFromBestScores() {
    return LESSONS.reduce((sum, l) => sum + (state.bestScores[l.id] || 0), 0);
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
