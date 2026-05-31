/* ============================================================
   data.js — 캐릭터, 단원, 게임 콘텐츠 데이터
   ============================================================ */

// 단일 진화 캐릭터: 알 → 송양초마스터 (30단계)
const CHARACTERS = [
    {
        id: "hero",
        name: "어드벤처러",
        base: "🥚",
        evolved: [
            "🥚",     // L1: 알
            "🐣",     // L2: 병아리
            "🐔",     // L3: 닭
            "🐉",     // L4: 용
            "🐲⚔️",   // L5: 용의 전사
            "👼",     // L6: 천사
            "😈",     // L7: 악마
            "⚡👑",   // L8: 제우스
            "☀️",     // L9: 태양
            "🌌",     // L10: 우주
            "🕳️",     // L11: 블랙홀
            "💥",     // L12: 빅뱅
            "🔮",     // L13: 4차원
            "🪽",     // L14: 천국
            "🔥",     // L15: 지옥
            "🌈",     // L16: 이세계
            "🏛️",     // L17: 유토피아
            "🌅",     // L18: 태초의 세계
            "🌑",     // L19: 완벽한 어둠
            "🧒",     // L20: 송양초 잼민이
            "😎",     // L21: 송양초 형님들
            "💪",     // L22: 송양초 체육부장
            "📋",     // L23: 송양초 학급회장
            "🎖️",    // L24: 송양초 전교부회장
            "🏅",     // L25: 송양초 전교회장
            "⚔️",    // L26: 송양초 전사
            "✨👑",   // L27: 송양초의 신
            "👹🔥",   // L28: 송양초 끝판왕
            "🏫✨",   // L29: 송양초 그자체
            "🏆👑",   // L30: 송양초 마스터
        ],
    },
];

// 각 레벨의 이름 (HUD/홈 화면에 표시)
const LEVEL_NAMES = [
    "알",            // L1
    "병아리",         // L2
    "닭",            // L3
    "용",            // L4
    "용의 전사",      // L5
    "천사",          // L6
    "악마",          // L7
    "제우스",         // L8
    "태양",          // L9
    "우주",          // L10
    "블랙홀",         // L11
    "빅뱅",          // L12
    "4차원",         // L13
    "천국",          // L14
    "지옥",          // L15
    "이세계",         // L16
    "유토피아",       // L17
    "태초의 세계",     // L18
    "완벽한 어둠",     // L19
    "송양초 잼민이",   // L20
    "송양초 형님들",   // L21
    "송양초 체육부장", // L22
    "송양초 학급회장", // L23
    "송양초 전교부회장",// L24
    "송양초 전교회장", // L25
    "송양초 전사",     // L26
    "송양초의 신",     // L27
    "송양초 끝판왕",   // L28
    "송양초 그자체",   // L29
    "송양초 마스터",   // L30
];

// 누적 점수가 얼마면 레벨 N이 되는지 (L1~L30, 후반은 점점 가팔라짐)
const LEVEL_THRESHOLDS = [
    0,         // L1: 알
    750,       // L2: 병아리
    2250,      // L3: 닭
    5250,      // L4: 용
    10500,     // L5: 용의 전사
    18750,     // L6: 천사
    30000,     // L7: 악마
    45000,     // L8: 제우스
    67500,     // L9: 태양
    97500,     // L10: 우주
    135000,    // L11: 블랙홀
    180000,    // L12: 빅뱅
    235000,    // L13: 4차원
    300000,    // L14: 천국
    380000,    // L15: 지옥
    475000,    // L16: 이세계
    590000,    // L17: 유토피아
    730000,    // L18: 태초의 세계
    900000,    // L19: 완벽한 어둠
    1100000,   // L20: 송양초 잼민이
    1350000,   // L21: 송양초 형님들
    1650000,   // L22: 송양초 체육부장
    2000000,   // L23: 송양초 학급회장
    2400000,   // L24: 송양초 전교부회장
    2850000,   // L25: 송양초 전교회장
    3350000,   // L26: 송양초 전사
    3900000,   // L27: 송양초의 신
    4500000,   // L28: 송양초 끝판왕
    5200000,   // L29: 송양초 그자체
    6000000,   // L30: 송양초 마스터 🏆
];

const MAX_LEVEL = LEVEL_THRESHOLDS.length;

function getLevelFromPoints(points) {
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return Math.min(level, MAX_LEVEL);
}

function getLevelProgress(points) {
    const level = getLevelFromPoints(points);
    if (level >= MAX_LEVEL) {
        return { current: points, needed: points, ratio: 1, level, atMax: true };
    }
    const min = LEVEL_THRESHOLDS[level - 1];
    const max = LEVEL_THRESHOLDS[level];
    return {
        current: points - min,
        needed: max - min,
        ratio: (points - min) / (max - min),
        level,
        nextLevel: level + 1,
        atMax: false,
    };
}

function getLevelName(level) {
    return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1] || "";
}

// ============================================================
// 1단원: 컴퓨터의 기초 — 사격 게임
// ============================================================

const COMPUTER_PARTS = {
    monitor: { word: "모니터", emoji: "🖥️" },
    keyboard: { word: "키보드", emoji: "⌨️" },
    mouse: { word: "마우스", emoji: "🖱️" },
    speaker: { word: "스피커", emoji: "🔊" },
    printer: { word: "프린터", emoji: "🖨️" },
    body: { word: "본체", emoji: "💻" },
    cable: { word: "케이블", emoji: "🔌" },
};

const DISTRACTORS = [
    "책상", "의자", "종이", "연필",
    "사과", "공책", "지우개", "가위",
    "텔레비전", "라디오", "에어컨", "선풍기",
];

// 각 라운드의 정답이 화면에 계속 떨어짐 (오답 없음)
const LESSON1_ROUNDS = [
    { prompt: "컴퓨터의 눈 👀",  hint: "보여주는 친구!", correct: ["monitor"] },
    { prompt: "컴퓨터의 손 ✋",  hint: "조작하는 친구!", correct: ["keyboard"] },
    { prompt: "컴퓨터의 머리 🧠", hint: "생각하는 친구!", correct: ["body"] },
];

// 1단원 게임 설정
// 라운드별 점수: R1=35, R2=70, R3=105 (이전의 1/3로 낮춤 — 워밍업 단원이라)
// 낙하 속도: 이전의 70% (30% 감소) — 더 여유롭게 읽고 클릭할 수 있도록
const GAME_CONFIG = {
    roundDuration: 15000,
    fallSpeedBase: 112,           // 160 × 0.7
    fallSpeedPerRound: 42,        // 60 × 0.7  (R1=112, R2=154, R3=196)
    spawnIntervalMs: 320,
    correctRatio: 0.4,
    correctPointsBase: 35,
    comboBonus: 10,
    comboMax: 10,
    wrongPenalty: 10,
};

// ============================================================
// 단원 목록
// ============================================================

const LESSONS = [
    {
        id: "lesson1",
        num: "스텝 1",
        title: "컴퓨터의 기초",
        desc: "컴퓨터 부품의 역할을 알아봐요!",
        icon: "💻",
        game: "game1",
        goalScore: 2000,
    },
    {
        id: "lesson2",
        num: "스텝 2",
        title: "마우스 마스터",
        desc: "한 번 클릭과 더블클릭을 익혀요!",
        icon: "🖱️",
        game: "game2",
        goalScore: 10000,
    },
    {
        id: "lesson3",
        num: "스텝 3",
        title: "택배 마스터",
        desc: "물건을 트럭에 실어요! 드래그 실력 UP",
        icon: "🚚",
        game: "game3",
        goalScore: 10000,
    },
    {
        id: "lesson4",
        num: "스텝 4",
        title: "수학 마스터",
        desc: "덧셈과 곱셈! 정답을 만들어요",
        icon: "🔢",
        game: "game5",
        goalScore: 10000,
    },
    {
        id: "lesson5",
        num: "스텝 5",
        title: "포트리스 챌린지",
        desc: "꾸욱 눌러 파워! 정확한 사격!",
        icon: "🎯",
        game: "game4",
        goalScore: 10000,
    },
];

// 상위 단원 정보
const UNITS = [
    { num: 1,  title: "마우스편",  icon: "🖱️", active: true  },
    { num: 2,  title: "키보드편",  icon: "⌨️", active: true  },
    { num: 3,  title: "단축키편",  icon: "🪄", active: true  },
    { num: 4,  title: "준비 중",   icon: "🔒", active: false },
    { num: 5,  title: "준비 중",   icon: "🔒", active: false },
    { num: 6,  title: "준비 중",   icon: "🔒", active: false },
    { num: 7,  title: "준비 중",   icon: "🔒", active: false },
    { num: 8,  title: "준비 중",   icon: "🔒", active: false },
    { num: 9,  title: "준비 중",   icon: "🔒", active: false },
    { num: 10, title: "준비 중",   icon: "🔒", active: false },
];

// 단원별 제목
function getCurrentUnitTitle(unitNum) {
    const u = UNITS.find(x => x.num === unitNum);
    return u ? `송양초등학교 디지털수업 : ${u.title}` : "송양초등학교 디지털수업";
}

// 1단원 마우스편: 기존 5개 스텝 (위에서 정의)
const LESSONS_UNIT1 = LESSONS;

// 2단원 키보드편 스텝들
const LESSONS_UNIT2 = [
    {
        id: "u2_lesson1",
        num: "스텝 1",
        title: "미로 탈출",
        desc: "방향키로 캐릭터를 움직여 집까지 가요! 🏠",
        icon: "🧭",
        game: "gameMaze",
        goalScore: 500,
    },
    {
        id: "u2_lesson2",
        num: "스텝 2",
        title: "캥거루 점프",
        desc: "스페이스바로 점프! 장애물 피하고 과일 먹기 🦘",
        icon: "🦘",
        game: "gameJump",
        goalScore: 3000,
    },
    {
        id: "u2_lesson3",
        num: "스텝 3",
        title: "양궁 챌린지",
        desc: "방향키로 조준! 스페이스바로 화살을 쏴서 단어를 맞춰요 🏹",
        icon: "🏹",
        game: "gameArchery",
        goalScore: 5000,
    },
    {
        id: "u2_lesson4",
        num: "스텝 4",
        title: "딜리트 마스터",
        desc: "DELETE 키로 화면을 막 지워요! 🗑️",
        icon: "⌫",
        game: "gameDelete",
        goalScore: 10000,
    },
    {
        id: "u2_lesson5",
        num: "스텝 5",
        title: "한글 자음 모음",
        desc: "하늘에서 떨어지는 한글을 타이핑! ㄱ ㅏ 가",
        icon: "ㄱ",
        game: "gameHangul",
        goalScore: 5000,
    },
    {
        id: "u2_lesson6",
        num: "스텝 6",
        title: "타자 마스터",
        desc: "한글 단어를 보고 따라 입력해요! ⌨️",
        icon: "⌨️",
        game: "gameType",
        goalScore: 10000,
    },
];

// 3단원 단축키편 스텝들 (레벨 30 도달 가능하도록 점수 풍부)
const LESSONS_UNIT3 = [
    {
        id: "u3_lesson1",
        num: "스텝 1",
        title: "폴더 이름 변경 마법",
        desc: "폴더 우클릭 → 이름 바꾸기 → 새 이름 입력 📁",
        icon: "📁",
        game: "gameRename",
        goalScore: 5000,
    },
    {
        id: "u3_lesson2",
        num: "스텝 2",
        title: "복사 붙여넣기 마법",
        desc: "Ctrl+C로 복사, Ctrl+V로 붙여넣기! 📋",
        icon: "📋",
        game: "gameCopy",
        goalScore: 15000,
    },
    {
        id: "u3_lesson3",
        num: "스텝 3",
        title: "되돌리기 부활 마법",
        desc: "DELETE로 지우고, Ctrl+Z로 되살리기! ⏪",
        icon: "⏪",
        game: "gameDeleteUndo",
        goalScore: 30000,
    },
    {
        id: "u3_lesson4",
        num: "스텝 4",
        title: "전체 선택 폭주 마법",
        desc: "Ctrl+A로 전부 선택! DELETE로 한 방에 지워요! ⬛",
        icon: "⬛",
        game: "gameSelectAll",
        goalScore: 60000,
    },
    {
        id: "u3_lesson5",
        num: "스텝 5",
        title: "송양초 BBQ 보너스!",
        desc: "고기 완벽 굽기! 타이밍 맞춰 키 누르기 🥩🔥",
        icon: "🥩",
        game: "gameBbq",
        goalScore: 100000,
    },
];

const LESSONS_BY_UNIT = {
    1: LESSONS_UNIT1,
    2: LESSONS_UNIT2,
    3: LESSONS_UNIT3,
};

function getLessonsForUnit(unitNum) {
    return LESSONS_BY_UNIT[unitNum] || LESSONS_UNIT1;
}

// ============================================================
// 테스트 모드: 잠금 무시하고 모든 단원 클릭 가능
// (실서비스 시 false로 변경)
// ============================================================
const BYPASS_LESSON_LOCKS = false;

// ============================================================
// 2단원: 마우스 마스터 — 다양한 마우스 액션 타겟
// ============================================================

const MOUSE_TARGETS = {
    balloon:  { emoji: "🎈", action: "click",    label: "한 번 클릭!", hint: "👆",   points: 400 },
    box:      { emoji: "📦", action: "dblclick", label: "더블클릭!",   hint: "👆👆", points: 700 },
};

const MOUSE_GAME_CONFIG = {
    roundDuration: 15000,
    spawnIntervalMs: 300,     // 900 → 300 (3배 자주 생성)
    targetLifetime: 4500,
    rounds: [
        { types: ["balloon"],         label: "🎈 풍선을 한 번 클릭!" },
        { types: ["box"],             label: "📦 상자를 더블클릭!" },
        { types: ["balloon", "box"],  label: "🎈📦 클릭과 더블클릭 섞어서!" },
    ],
    wrongPenalty: 30,
};

// ============================================================
// 3단원: 택배 마스터 — 빈 트럭에 물건 드래그로 싣기
// ============================================================

// 트럭에 실을 물건 종류
const TRUCK_ITEMS = ["📦", "📚", "🎁", "🎒", "🧸", "🪀", "⚽", "🍎", "🥕", "🧃"];

const TRUCK_GAME_CONFIG = {
    roundDuration: 20000,
    wrongPenalty: 0,
    rounds: [
        { capacity: 3, perItem: 700,  fullBonus: 1500, label: "🚚 작은 트럭! 물건 3개!" },
        { capacity: 5, perItem: 900,  fullBonus: 2000, label: "🚛 중간 트럭! 물건 5개!" },
        { capacity: 7, perItem: 1100, fullBonus: 2500, label: "🚚 큰 트럭! 물건 7개! 🔥" },
    ],
};

// ============================================================
// 4단원: 윈도우 친구되기 — 아이콘 찾기
// ============================================================

const DESKTOP_APPS = {
    youtube:    { emoji: "📺", name: "유튜브",   keywords: ["영상", "동영상", "유튜브"] },
    music:      { emoji: "🎵", name: "음악",     keywords: ["노래", "음악", "듣고"] },
    paint:      { emoji: "🎨", name: "그림판",   keywords: ["그림", "그리고", "색칠"] },
    notes:      { emoji: "📝", name: "메모장",   keywords: ["글", "메모", "적고", "쓰고"] },
    internet:   { emoji: "🌐", name: "인터넷",   keywords: ["검색", "찾고", "웹"] },
    camera:     { emoji: "📷", name: "카메라",   keywords: ["사진", "찍고"] },
    chat:       { emoji: "💬", name: "채팅",     keywords: ["대화", "친구", "메시지"] },
    game:       { emoji: "🎮", name: "게임",     keywords: ["게임", "놀고"] },
    calc:       { emoji: "🧮", name: "계산기",   keywords: ["계산", "더하기", "곱하기"] },
    folder:     { emoji: "📁", name: "내 파일",  keywords: ["파일", "폴더", "저장"] },
    mail:       { emoji: "📧", name: "이메일",   keywords: ["편지", "메일"] },
    settings:   { emoji: "⚙️", name: "설정",     keywords: ["설정", "바꾸고"] },
};

// 라운드별 과제 (질문 + 정답 앱 키)
const WINDOWS_QUESTS = [
    { q: "노래를 듣고 싶어! 🎶", answer: "music" },
    { q: "그림을 그리고 싶어! 🖌️", answer: "paint" },
    { q: "유튜브 영상을 보고 싶어!", answer: "youtube" },
    { q: "글을 적어두고 싶어!", answer: "notes" },
    { q: "사진을 찍어볼까?", answer: "camera" },
    { q: "5 + 3 은 얼마일까? 계산해 보자!", answer: "calc" },
    { q: "친구한테 메시지 보내자!", answer: "chat" },
    { q: "재미있는 게임 한 판! 🎲", answer: "game" },
    { q: "검색해서 알아보고 싶어!", answer: "internet" },
    { q: "저장해 둔 파일을 찾자!", answer: "folder" },
    { q: "선생님께 편지를 보내자!", answer: "mail" },
    { q: "글자 크기를 바꾸고 싶어!", answer: "settings" },
    { q: "다시 노래! 신나게!", answer: "music" },
    { q: "다시 그림 그리기!", answer: "paint" },
    { q: "다시 유튜브 보자!", answer: "youtube" },
];

const WINDOWS_GAME_CONFIG = {
    totalTime: 90000,
    correctPoints: 200,
    streakBonus: 50,
    wrongPenalty: 50,
    iconsPerRound: 8,
};

// ============================================================
// 4단원: 포트리스 챌린지 — 마우스 길게 눌러 파워 충전 → 발사
// ============================================================

const CANNON_TARGETS = ["🎈", "🎯", "👻", "⭐", "🍎", "🎁", "🪀", "🛸"];

// ============================================================
// 2단원 스텝 1: 미로 탈출 — 방향키로 이동
// ============================================================

// 미로 게임 (2단계, 각 15초)
const MAZE_GAME_CONFIG = {
    cellSize: 54,                  // 44 → 54 (더 크게)
    moveCooldownMs: 100,
    completionBonus: 500,
    timeLimitMs: 15000,             // 단계당 15초
    timeoutPenaltyRatio: 0.5,       // 시간 초과 시 점수 절반
    // 보물상자 결과 — 최대 +10,000점까지만
    treasureOutcomes: [
        { weight: 5,  type: "add", value: 10000, label: "+10000 🎆", color: "rainbow" },
        { weight: 10, type: "add", value: 5000,  label: "+5000 💎",  color: "diamond" },
        { weight: 15, type: "add", value: 2000,  label: "+2000 🌟",  color: "gold" },
        { weight: 20, type: "add", value: 1000,  label: "+1000 ✨",  color: "good" },
        { weight: 20, type: "add", value: 500,   label: "+500",      color: "good" },
        { weight: 10, type: "add", value: 200,   label: "+200",      color: "okay" },
        { weight: 8,  type: "add", value: 0,     label: "0점 😶",   color: "neutral" },
        { weight: 7,  type: "add", value: -200,  label: "-200 💔",  color: "bad" },
        { weight: 5,  type: "add", value: -500,  label: "-500 💀",  color: "worst" },
    ],
    stages: [
        {
            label: "1단계 — 기본 미로",
            width: 15, height: 11,
            walls: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
                [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
                [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
                [1,0,0,0,1,0,0,0,0,0,1,0,1,0,1],
                [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
                [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
                [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            ],
            start: { x: 1, y: 1 },
            goal:  { x: 13, y: 9 },
            items: [
                { type: "fruit",    x: 5,  y: 3, emoji: "🍎", value: 50  },
                { type: "fruit",    x: 11, y: 3, emoji: "🍌", value: 30  },
                { type: "fruit",    x: 3,  y: 5, emoji: "🍇", value: 100 },
                { type: "fruit",    x: 1,  y: 5, emoji: "🍊", value: 70  },
                { type: "fruit",    x: 5,  y: 7, emoji: "🥝", value: 80  },
                { type: "treasure", x: 8,  y: 5, emoji: "📦" },
                { type: "treasure", x: 8,  y: 9, emoji: "📦" },
            ],
        },
        {
            label: "2단계 — 복잡한 미로",
            width: 15, height: 11,
            walls: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
                [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1],
                [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
                [1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
                [1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
                [1,0,1,1,1,0,1,1,0,1,1,0,1,0,1],
                [1,0,0,0,0,0,1,0,0,1,0,0,0,0,1],
                [1,1,1,1,1,0,1,1,0,1,0,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            ],
            start: { x: 1, y: 1 },
            goal:  { x: 13, y: 9 },
            items: [
                { type: "fruit",    x: 9,  y: 3, emoji: "🍇", value: 100 },
                { type: "fruit",    x: 7,  y: 7, emoji: "🍓", value: 150 },
                { type: "treasure", x: 6,  y: 5, emoji: "📦" },
                { type: "treasure", x: 3,  y: 9, emoji: "📦" },
                { type: "fruit",    x: 1,  y: 7, emoji: "🍎", value: 50  },
                { type: "fruit",    x: 13, y: 5, emoji: "🍊", value: 70  },
                { type: "fruit",    x: 11, y: 7, emoji: "🍑", value: 120 },
            ],
        },
    ],
};

// ============================================================
// 2단원 스텝 2: 캥거루 점프 (스페이스바 타이밍)
// ============================================================

const JUMP_GAME_CONFIG = {
    stages: [
        { duration: 30000, scrollSpeed: 320, spawnIntervalMs: 1400, label: "1단계 — 조심조심" },
        { duration: 30000, scrollSpeed: 520, spawnIntervalMs: 1000, label: "2단계 — 빠르게!" },
    ],
    gravity: 2400,
    holdGravity: 700,          // 스페이스 누르고 있을 때 (가벼운 중력)
    maxHoldMs: 380,             // 최대 누름 시간
    initialJumpVelocity: -800,  // 시작 점프 속도
    groundRatio: 0.74,          // 바닥 26%
    playerXRatio: 0.18,
    fruits: [
        { emoji: "🍎", value: 80,  height: "ground" },    // 50 → 80
        { emoji: "🍌", value: 50,  height: "ground" },    // 30 → 50
        { emoji: "🍇", value: 130, height: "mid" },        // 80 → 130
        { emoji: "🍊", value: 110, height: "mid" },        // 70 → 110
        { emoji: "🍓", value: 180, height: "high" },       // 120 → 180
        { emoji: "🍑", value: 220, height: "high" },       // 150 → 220
    ],
    obstacles: ["🌵", "🪨", "🌲", "🚧"],
    bonusFruit: {
        emoji: "🎁",
        baseValue: 200,           // 100 → 200 (2배)
        multipliers: [10],        // 보너스 = baseValue × multiplier → +2000
        weights:      [100],
    },
    bonusChance: 1 / 10,
    obstacleProbability: 0.45,
    obstaclePenalty: -200,
};

// ============================================================
// 2단원 스텝 3: 한글 자음 모음 (떨어지는 글자 타이핑)
// ============================================================

// 두벌식 키보드 기준 한글 자모 → 영문 키 매핑
const HANGUL_KEYS = {
    // 자음
    "ㄱ":"r","ㄴ":"s","ㄷ":"e","ㄹ":"f","ㅁ":"a","ㅂ":"q","ㅅ":"t",
    "ㅇ":"d","ㅈ":"w","ㅊ":"c","ㅋ":"z","ㅌ":"x","ㅍ":"v","ㅎ":"g",
    // 모음
    "ㅏ":"k","ㅑ":"i","ㅓ":"j","ㅕ":"u","ㅗ":"h","ㅛ":"y",
    "ㅜ":"n","ㅠ":"b","ㅡ":"m","ㅣ":"l",
    // 추가 자모 (받침/이중 모음)
    "ㄲ":"R","ㄸ":"E","ㅃ":"Q","ㅆ":"T","ㅉ":"W",
    "ㅐ":"o","ㅒ":"O","ㅔ":"p","ㅖ":"P",
};

const HANGUL_CONSONANTS = ["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅅ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const HANGUL_VOWELS     = ["ㅏ","ㅑ","ㅓ","ㅕ","ㅗ","ㅛ","ㅜ","ㅠ","ㅡ","ㅣ"];
// 받침 없는 한 글자들 (자음 + 모음 조합)
const HANGUL_SYLLABLES = [
    "가","나","다","라","마","바","사","아","자","차","카","타","파","하",
    "거","너","더","러","머","버","서","어","저","처","커","터","퍼","허",
    "고","노","도","로","모","보","소","오","조","초","코","토","포","호",
    "구","누","두","루","무","부","수","우","주","추","쿠","투","푸","후",
    "기","니","디","리","미","비","시","이","지","치","키","티","피","히",
];

// 한글 초성/중성 분해 (받침 무시 — 스텝 3는 받침 없음)
function decomposeSyllable(syl) {
    const code = syl.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return null;
    const choIdx = Math.floor(code / 588);
    const jungIdx = Math.floor((code - choIdx * 588) / 28);
    const CHO  = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
    return { cho: CHO[choIdx], jung: JUNG[jungIdx] };
}

function syllableToKeySequence(syl) {
    const parts = decomposeSyllable(syl);
    if (!parts) return null;
    const k1 = HANGUL_KEYS[parts.cho];
    const k2 = HANGUL_KEYS[parts.jung];
    if (!k1 || !k2) return null;
    return (k1 + k2).toLowerCase();
}

// ============================================================
// 2단원 스텝 4: 딜리트 마스터 (DELETE/BACKSPACE 키)
// ============================================================
const DELETE_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — 100개 도전!",
            duration: 10000,
            cols: 10,
            rows: 10,         // 100개
            pointPerDelete: 200,    // 100 → 200 (2배)
            clearBonus: 1000,       // 500 → 1000 (2배)
        },
        {
            label: "2단계 — 다시 100개!",
            duration: 10000,
            cols: 10,
            rows: 10,
            pointPerDelete: 240,    // 120 → 240 (2배)
            clearBonus: 1400,       // 700 → 1400 (2배)
        },
        {
            label: "3단계 — 마지막 100개!",
            duration: 10000,
            cols: 10,
            rows: 10,
            pointPerDelete: 300,    // 150 → 300 (2배)
            clearBonus: 2000,       // 1000 → 2000 (2배)
        },
    ],
};

const HANGUL_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — 자음",
            duration: 15000,
            chars: HANGUL_CONSONANTS,
            type: "jamo",
            pointsPerCorrect: 400,  // 200 → 400 (2배)
            fallSpeed: 200,
            spawnIntervalMs: 900,
        },
        {
            label: "2단계 — 모음",
            duration: 15000,
            chars: HANGUL_VOWELS,
            type: "jamo",
            pointsPerCorrect: 800,  // 400 → 800 (2배)
            fallSpeed: 230,
            spawnIntervalMs: 900,
        },
        {
            label: "3단계 — 글자 (자음+모음)",
            duration: 15000,
            chars: HANGUL_SYLLABLES,
            type: "syllable",
            pointsPerCorrect: 1600, // 800 → 1600 (2배)
            fallSpeed: 260,
            spawnIntervalMs: 1200,
        },
    ],
    bonusMultipliers: [10],
    bonusWeights:     [100],
    bonusChance: 1 / 12,
    wrongPenalty: 30,
};

const CANNON_GAME_CONFIG = {
    totalTime: 30000,
    gravity: 600,
    minPower: 0.15,
    minSpeed: 500,
    maxSpeed: 1300,
    maxChargeMs: 1500,
    targetSpawnIntervalMs: 300,   // 1200 → 300 (4배 자주)
    maxTargets: 24,                // 6 → 24 (4배 동시 등장)
    targetLifetimeMs: 14000,
    targetRadius: 50,
    hitPoints: 800,
    streakBonus: 200,
};

// ============================================================
// 2단원 스텝 3: 양궁 게임 (방향키 + 스페이스바 차지)
// ============================================================
// 학교·디지털 수업 테마 단어 (약 5배 늘림)
const ARCHERY_WORDS_EASY = [
    // 학교 물건
    "학교", "친구", "책상", "의자", "칠판", "분필",
    "연필", "가방", "신발", "안경", "시계", "노트",
    "공책", "필통", "물통", "수첩", "지우개", "운동화",
    "모자", "우산", "도시락", "교복", "교과서", "사물함",
    "자", "펜", "풀", "가위", "스카치테이프", "압정",
    "클립", "클립보드", "스테이플러", "색연필", "사인펜",
    "형광펜", "볼펜", "샤프", "샤프심", "지우개똥",
    "필기구", "공책표지", "스티커", "포스트잇", "메모지",
    // 학교 생활
    "수업", "숙제", "시험", "성적", "점수", "통과",
    "합격", "발표", "질문", "정답", "오답", "정정",
    "박수", "응원", "출석", "지각", "결석", "조퇴",
    "방학", "개학", "졸업", "입학", "전학", "진학",
    // 컴퓨터 기본
    "컴퓨터", "마우스", "키보드", "모니터", "노트북",
    "프린터", "스피커", "헤드셋", "USB", "와이파이",
    "이메일", "아이콘", "폴더", "파일", "버튼",
    "마우스패드", "이어폰", "헤드폰", "웹캠", "마이크",
    "본체", "전원", "켜기", "끄기", "재부팅",
    "바탕화면", "메뉴", "창", "탭", "스크롤",
    "복사", "붙여넣기", "잘라내기", "삭제", "저장",
    "검색", "주소창", "북마크", "다운로드", "업로드",
    // 색깔/모양 (재미용)
    "빨강", "파랑", "노랑", "초록", "보라", "주황",
    "검정", "하양", "회색", "분홍", "네모", "동그라미",
    "세모", "별모양", "하트", "물결", "줄무늬", "점박이",
    // 동물/곤충/식물
    "강아지", "고양이", "햄스터", "금붕어", "앵무새",
    "참새", "비둘기", "까치", "독수리", "부엉이",
    "다람쥐", "토끼", "사슴", "여우", "곰",
    "사자", "호랑이", "코끼리", "기린", "얼룩말",
    "원숭이", "판다", "코알라", "캥거루", "펭귄",
    "돌고래", "고래", "상어", "거북이", "게",
    "장수풍뎅이", "사슴벌레", "나비", "잠자리", "메뚜기",
    "개미", "벌", "무당벌레", "달팽이", "지렁이",
    "민들레", "장미", "튤립", "해바라기", "벚꽃",
    "단풍잎", "은행잎", "솔방울", "도토리", "밤송이",
    // 음식/간식
    "김밥", "떡볶이", "라면", "햄버거", "피자",
    "치킨", "샌드위치", "주먹밥", "유부초밥", "비빔밥",
    "된장찌개", "김치찌개", "갈비탕", "삼계탕", "잔치국수",
    "아이스크림", "과자", "초콜릿", "사탕", "쿠키",
    "케이크", "도넛", "젤리", "마시멜로", "푸딩",
];
const ARCHERY_WORDS_MID = [
    // 학교 장소
    "선생님", "학생들", "운동장", "도서관", "급식실",
    "체육관", "음악실", "미술실", "과학실", "보건실",
    "교무실", "방송실", "강당", "복도", "계단",
    "놀이터", "미끄럼틀", "철봉", "정글짐", "그네",
    "시소", "공원벤치", "운동기구", "축구장", "농구장",
    "수영장", "탁구장", "체스판", "보드게임", "장기판",
    "교실문", "창문가", "사물함앞", "복도끝", "계단참",
    // 학교 시간/활동
    "등굣길", "하굣길", "쉬는시간", "점심시간", "수업시간",
    "아침조회", "종례시간", "방과후", "동아리시간", "특별활동",
    "체육시간", "음악시간", "미술시간", "국어시간", "수학시간",
    "영어시간", "과학시간", "사회시간", "도덕시간", "창체시간",
    "수련회날", "체육대회", "현장학습", "수학여행", "졸업여행",
    // 디지털 수업 키워드
    "타자연습", "코딩수업", "마우스연습", "정보검색",
    "한글타자", "영어타자", "디지털교실", "스마트수업",
    "온라인학습", "화상수업", "검색엔진", "유튜브학습",
    "인공지능", "알고리즘", "프로그램", "소프트웨어",
    "하드웨어", "모바일", "태블릿", "스마트폰",
    "워드파일", "한글파일", "엑셀표", "파워포인트", "프레젠테이션",
    "발표자료", "사진편집", "동영상편집", "그림판", "메모장",
    "인터넷검색", "유튜브영상", "구글검색", "네이버검색", "이미지검색",
    "디지털기기", "스마트기기", "전자기기", "충전기", "배터리",
    "와이파이연결", "블루투스", "데이터통신", "인터넷연결", "네트워크",
    // 친구 활동
    "친구사이", "단짝친구", "짝꿍", "모둠활동", "조별과제",
    "협동학습", "토론수업", "발표수업", "탐구수업", "실험수업",
    "독서활동", "글쓰기", "받아쓰기", "맞춤법", "띄어쓰기",
    "이야기쓰기", "일기쓰기", "편지쓰기", "감상문", "독후감",
    "수학문제", "덧셈뺄셈", "곱셈나눗셈", "분수공부", "도형공부",
    "과학실험", "현미경관찰", "식물관찰", "곤충관찰", "별자리관찰",
    "사회조사", "지도그리기", "역사공부", "위인전기", "전통문화",
    "음악수업노래", "리코더연주", "단소불기", "장구치기", "북치기",
    "체육활동", "달리기시합", "줄넘기", "축구하기", "농구하기",
    "피구하기", "발야구", "이어달리기", "단체줄넘기", "운동회",
    // 미술/만들기
    "그림그리기", "색칠놀이", "물감놀이", "찰흙놀이", "종이접기",
    "오리기", "붙이기", "꾸미기", "포스터그리기", "만화그리기",
    // 안전/위생
    "손씻기", "양치질", "마스크쓰기", "안전교육", "교통안전",
    "횡단보도", "신호등", "안전벨트", "헬멧착용", "구급함",
    // 행사
    "운동회날", "학예회", "졸업식날", "입학식날", "어린이날",
    "어버이날", "스승의날", "한글날", "개교기념일", "생일파티",
];
const ARCHERY_WORDS_HARD = [
    // 송양초 시리즈
    "송양초등학교", "송양초최고", "송양화이팅", "송양수업최고",
    "송양초사랑", "송양초자랑", "송양초친구들", "송양초선생님",
    "송양초학생", "송양초가족", "송양초졸업생", "송양초신입생",
    "송양초등학교디지털수업", "송양초디지털최고", "디지털수업최고",
    "송양초등학교화이팅", "송양초등학교최고",
    "송양초등학교사랑해", "송양초등학교파이팅",
    // 디지털 시리즈
    "디지털수업", "디지털송양", "디지털교과서", "디지털리터러시",
    "디지털전환", "디지털시민", "디지털세상", "디지털원주민",
    "디지털네이티브", "디지털콘텐츠", "디지털플랫폼", "디지털시민의식",
    "디지털교육혁신", "디지털미래교실",
    // 정보·컴퓨터
    "정보교육", "정보활용교육", "정보처리", "정보보호",
    "정보보안", "정보검색능력", "정보활용능력", "정보윤리",
    "컴퓨터수업", "컴퓨터과학", "컴퓨터교실", "컴퓨터마스터",
    "컴퓨터천재", "컴퓨터활용능력", "컴퓨터그래픽", "컴퓨터프로그래밍",
    // 사이버 안전
    "사이버안전", "사이버에티켓", "사이버폭력예방", "온라인안전",
    "개인정보보호", "비밀번호관리", "악성댓글금지", "디지털인성교육",
    "인터넷예절", "온라인예절", "디지털시민교육",
    // 코딩
    "코딩공부", "코딩교실", "코딩챌린지", "프로그래밍",
    "스크래치코딩", "엔트리코딩", "파이썬코딩", "자바스크립트",
    "코딩대회", "코딩챔피언", "알고리즘공부", "알고리즘대회",
    // 타자/마우스
    "타자대회", "타자챔피언", "타자연습왕", "타자고수",
    "마우스마스터", "키보드마스터", "한컴타자연습", "한글자판",
    "영어자판", "두벌식자판", "독수리타법",
    // 최고/우수
    "최고의수업", "최고의친구들", "최고의선생님", "최고의학교",
    "최고의교실", "최고의급식", "최고의운동회", "최고의졸업식",
    "최고의어린이날", "최고의친구",
    // 미래 교육
    "미래교육", "미래학교", "스마트교육", "스마트교실",
    "교육혁신", "인공지능교육", "메타버스교실", "온라인클래스",
    "화상교실", "이러닝플랫폼", "에듀테크",
    // 추가 챌린지
    "송양초등학교파이팅", "송양초등학교사랑해요", "송양초등학교만세",
    "디지털수업파이팅", "디지털수업사랑해요", "디지털수업만만세",
    "송양초디지털수업최고", "송양초디지털화이팅", "송양초정보교육최고",
    "송양초컴퓨터수업", "송양초타자연습", "송양초코딩교실",
    "송양초마우스마스터", "송양초키보드마스터",
    "송양초학생화이팅", "송양초선생님감사합니다",
    "초등학생화이팅", "송양친구들사랑해", "송양가족사랑해",
    "디지털리더십", "디지털크리에이터", "디지털디자이너",
    "디지털아티스트", "디지털과학자", "디지털엔지니어",
    "정보검색마스터", "검색엔진활용", "인터넷정보활용",
    "유튜브크리에이터", "콘텐츠제작자", "디지털스토리텔링",
];

const ARCHERY_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — 학교 물건",
            duration: 20000,
            words: ARCHERY_WORDS_EASY,
            spawnIntervalMs: 1200,
            wordSpeed: 300,
            maxOnScreen: 5,
            pointsPerHit: 1000,    // 500 → 1000 (2배)
        },
        {
            label: "2단계 — 디지털 수업",
            duration: 20000,
            words: ARCHERY_WORDS_MID,
            spawnIntervalMs: 1300,
            wordSpeed: 420,
            maxOnScreen: 5,
            pointsPerHit: 1600,    // 800 → 1600 (2배)
        },
        {
            label: "3단계 — 송양초 챌린지!",
            duration: 20000,
            words: ARCHERY_WORDS_HARD,
            spawnIntervalMs: 1500,
            wordSpeed: 510,
            maxOnScreen: 4,
            pointsPerHit: 2400,    // 1200 → 2400 (2배)
        },
    ],
    // 화살 물리
    gravity: 700,
    minSpeed: 600,
    maxSpeed: 1500,
    maxChargeMs: 1200,
    // 조준
    minAngleDeg: -75,
    maxAngleDeg: 30,
    aimSpeedDegPerSec: 80,
    // 보너스 배수 (가끔 황금 표적이 나옴)
    bonusChance: 1 / 7,
    bonusMultipliers: [10, 20],
    bonusWeights:     [70, 30],
    // 점수
    missPenalty: 20,
};

// ============================================================
// 4단원: 수학 덧셈 마스터 — 3단계 덧셈 문제
// ============================================================

const MATH_GAME_CONFIG = {
    stages: [
        { op: "+", digits: 1, problemCount: 3, pointsPerCorrect: 400,   label: "1자리 덧셈" },
        // 곱셈은 progressivePoints (문제마다 다른 점수): 1번 10k, 2번 40k(누적50k), 3번 50k(누적100k)
        { op: "×", digits: 1, problemCount: 3, pointsPerCorrect: 700, progressivePoints: [10000, 40000, 50000], label: "구구단 곱셈" },
        { op: "+", digits: 2, problemCount: 2, pointsPerCorrect: 10000, label: "2자리 덧셈" },
    ],
    wrongPenalty: 50,
};

// ============================================================
// 각 게임 튜토리얼 (첫 도전 시 자동 표시)
// ============================================================

// 한글 음절 분해 (받침까지) — 타자게임용
function decomposeSyllableFull(syl) {
    const code = syl.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return null;
    const choIdx = Math.floor(code / 588);
    const jungIdx = Math.floor((code - choIdx * 588) / 28);
    const jongIdx = code % 28;
    const CHO  = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
    const JONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    return { cho: CHO[choIdx], jung: JUNG[jungIdx], jong: JONG[jongIdx] };
}

// 복합 모음/자음 → 키 조합 (없으면 빈 문자열)
const HANGUL_COMPOUND_KEYS = {
    "ㅘ":"hk","ㅙ":"ho","ㅚ":"hl","ㅝ":"nj","ㅞ":"np","ㅟ":"nl","ㅢ":"ml",
    "ㄳ":"rt","ㄵ":"sw","ㄶ":"sg","ㄺ":"fr","ㄻ":"fa","ㄼ":"fq",
    "ㄽ":"ft","ㄾ":"fx","ㄿ":"fv","ㅀ":"fg","ㅄ":"qt",
};

// 복합 자모를 단일 자모 두 개로 분해 (표시용)
const HANGUL_COMPOUND_PARTS = {
    "ㅘ":["ㅗ","ㅏ"], "ㅙ":["ㅗ","ㅐ"], "ㅚ":["ㅗ","ㅣ"],
    "ㅝ":["ㅜ","ㅓ"], "ㅞ":["ㅜ","ㅔ"], "ㅟ":["ㅜ","ㅣ"], "ㅢ":["ㅡ","ㅣ"],
    "ㄳ":["ㄱ","ㅅ"], "ㄵ":["ㄴ","ㅈ"], "ㄶ":["ㄴ","ㅎ"],
    "ㄺ":["ㄹ","ㄱ"], "ㄻ":["ㄹ","ㅁ"], "ㄼ":["ㄹ","ㅂ"],
    "ㄽ":["ㄹ","ㅅ"], "ㄾ":["ㄹ","ㅌ"], "ㄿ":["ㄹ","ㅍ"], "ㅀ":["ㄹ","ㅎ"],
    "ㅄ":["ㅂ","ㅅ"],
};

function jamoToKey(j) {
    if (!j) return "";
    if (HANGUL_KEYS[j]) return HANGUL_KEYS[j].toLowerCase();
    if (HANGUL_COMPOUND_KEYS[j]) return HANGUL_COMPOUND_KEYS[j];
    return "";
}

// 한글/영문 혼합 문자열 → 영문 키 시퀀스
function textToKeySequence(text) {
    let out = "";
    for (const ch of text) {
        if (ch === " ") { out += " "; continue; }
        const parts = decomposeSyllableFull(ch);
        if (parts) {
            out += jamoToKey(parts.cho);
            out += jamoToKey(parts.jung);
            if (parts.jong) out += jamoToKey(parts.jong);
        } else {
            out += ch.toLowerCase();
        }
    }
    return out;
}

// 한글/영문 혼합 문자열 → "키별 자모" 배열 (textToKeySequence와 길이 동일)
// 표시용: "내가 누른 키"를 한글로 보여주기 위함
function textToJamoArray(text) {
    const out = [];
    function pushJamo(j) {
        if (!j) return;
        const compound = HANGUL_COMPOUND_PARTS[j];
        if (compound) {
            // 복합 자모: 키 두 개에 대응 → 각각 단일 자모로 분해해서 표시
            out.push(compound[0], compound[1]);
        } else {
            out.push(j);
        }
    }
    for (const ch of text) {
        if (ch === " ") { out.push(" "); continue; }
        const parts = decomposeSyllableFull(ch);
        if (parts) {
            pushJamo(parts.cho);
            pushJamo(parts.jung);
            if (parts.jong) pushJamo(parts.jong);
        } else {
            out.push(ch);
        }
    }
    return out;
}

// ============================================================
// 2단원 스텝 6: 타자 마스터 (한글 단어 입력)
// ============================================================
const TYPE_WORDS_EASY = [
    "사과", "토끼", "학교", "친구", "별빛",
    "공원", "산책", "강물", "비빔밥", "딸기",
    "수박", "포도", "참외", "고양이", "강아지",
];
const TYPE_WORDS_HARD = [
    "컴퓨터", "키보드", "마우스", "모니터", "선생님",
    "운동장", "도서관", "급식실", "체육관", "음악실",
    "송양초등학교", "디지털수업", "정보교육", "타자연습", "코딩공부",
];
const TYPE_PHRASE = "송양초등학교 디지털 수업 최고";

const TYPE_GAME_CONFIG = {
    stages: [
        {
            type: "words",
            label: "1단계 — 짧은 한글 단어",
            duration: 25000,
            words: TYPE_WORDS_EASY,
            pointsPerWord: 1000,        // 500 → 1000 (2배)
        },
        {
            type: "words",
            label: "2단계 — 긴 한글 단어",
            duration: 25000,
            words: TYPE_WORDS_HARD,
            pointsPerWord: 1600,        // 800 → 1600 (2배)
        },
        {
            type: "phrase",
            label: "3단계 — 송양초 수업 챌린지!",
            phrase: TYPE_PHRASE,
            baseScore: 10000,           // 5000 → 10000 (2배)
            speedBonusPerSec: 600,      // 300 → 600 (2배)
            slowestTimeSec: 60,
        },
    ],
    wrongPenalty: 20,
};

// ============================================================
// 3단원 단축키편 — 게임 설정들
// ============================================================

// 스텝 1: 폴더 이름 변경 마법 (2단계, 2글자 한정)
const RENAME_NAMES_2CHAR = [
    "사진", "음악", "문서", "게임", "숙제", "일기", "학교", "친구",
    "가족", "사랑", "우정", "신발", "가방", "모자", "시계", "안경",
    "노트", "공책", "필통", "수첩", "그림", "글씨", "공원", "산책",
    "여행", "추억", "기록", "행복", "보물",
];
const RENAME_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — 폴더 1개 바꾸기",
            folderCount: 1,
            duration: 10000,
            pointsPerCorrect: 1500,
            wrongPenalty: 100,
            names: RENAME_NAMES_2CHAR,
        },
        {
            label: "2단계 — 폴더 여러 개 바꾸기",
            folderCount: 5,
            duration: 30000,
            pointsPerCorrect: 2000,
            wrongPenalty: 100,
            names: RENAME_NAMES_2CHAR,
        },
    ],
};

// 스텝 2: Ctrl+C / Ctrl+V 복사 마법 (2단계, 다중 선택 + 휴지통)
const COPY_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — 파일 1개 복사",
            fileCount: 1,
            duration: 10000,
            pointsPerCopy: 2000,
            wrongPenalty: 100,
            timeBonusPerSec: 500,    // 빨리 끝낼수록 보너스
        },
        {
            label: "2단계 — 여러 개 한꺼번에! (드래그 선택)",
            fileCount: 8,
            duration: 30000,
            pointsPerCopy: 2500,
            wrongPenalty: 100,
            timeBonusPerSec: 1000,
        },
    ],
    fileNames: ["숙제", "일기", "사진", "음악", "동영상", "그림", "독서록",
                 "친구", "타자", "공책", "노트", "수첩", "메모"],
};

// 스텝 3: DELETE + Ctrl+Z 부활 마법 (10셀, Ctrl+Z 순차 부활)
const DELETE_UNDO_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — DELETE & Ctrl+Z 부활",
            duration: 25000,
            cols: 5,
            rows: 2,            // 5×2 = 10셀
            pointPerDelete: 600,
            undoPerCell: 400,    // 부활 한 칸당 점수
            clearBonus: 3000,
            undoStaggerMs: 180,  // 한 칸씩 등장하는 간격
        },
        {
            label: "2단계 — 반복 폭주!",
            duration: 35000,
            cols: 5,
            rows: 2,
            pointPerDelete: 800,
            undoPerCell: 500,
            clearBonus: 4000,
            undoStaggerMs: 150,
        },
        {
            label: "3단계 — 최종 챌린지!",
            duration: 40000,
            cols: 5,
            rows: 2,
            pointPerDelete: 1000,
            undoPerCell: 600,
            clearBonus: 5000,
            undoStaggerMs: 120,
        },
    ],
};

// 스텝 4: Ctrl+A 전체 선택 마법
const SELECT_ALL_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — 폴더 50개",
            folderCount: 50,
            duration: 25000,
            pointPerSingleDelete: 100,
            selectAllMultiplier: 5,   // Ctrl+A → DELETE 시 ×5
            comboBonus: 5000,
        },
        {
            label: "2단계 — 폴더 80개",
            folderCount: 80,
            duration: 30000,
            pointPerSingleDelete: 120,
            selectAllMultiplier: 5,
            comboBonus: 8000,
        },
        {
            label: "3단계 — 폴더 100개 폭주!",
            folderCount: 100,
            duration: 35000,
            pointPerSingleDelete: 150,
            selectAllMultiplier: 5,
            comboBonus: 12000,
        },
    ],
};

// 스텝 5: 송양초 BBQ 보너스 (드래그 앤 드롭 — 트레이→화로→접시)
const BBQ_GAME_CONFIG = {
    stages: [
        {
            label: "1단계 — 캠핑 시작!",
            duration: 45000,
            trayCount: 6,              // 한 단계에 진열되는 고기 수
            grillSlots: 3,             // 화로 자리 개수
            cookTimeMs: 5000,           // 생 → 완벽 까지 (개별 고기)
            perfectWindowMs: 2200,
            burnAfterMs: 8500,
            timeBonusPerSec: 300,
        },
        {
            label: "2단계 — 친구들 도착!",
            duration: 50000,
            trayCount: 10,
            grillSlots: 3,
            cookTimeMs: 4200,
            perfectWindowMs: 1800,
            burnAfterMs: 7000,
            timeBonusPerSec: 500,
        },
        {
            label: "3단계 — 회식 폭주!",
            duration: 60000,
            trayCount: 14,
            grillSlots: 3,
            cookTimeMs: 3500,
            perfectWindowMs: 1500,
            burnAfterMs: 5800,
            timeBonusPerSec: 800,
        },
    ],
    points: {
        raw: 300,             // 너무 일찍 빼면
        cooking: 1500,        // 덜 익었지만 먹을만
        perfect: 5000,        // 완벽!
        overcook: 800,        // 좀 탄듯
        burnt: -800,          // 완전 탐
    },
    comboBonus: 1000,
    goldenChance: 1 / 6,
    goldenMultiplier: 5,
    meatTypes: [
        { emoji: "🥩", name: "소고기" },
        { emoji: "🍖", name: "닭다리" },
        { emoji: "🥓", name: "삼겹살" },
        { emoji: "🍗", name: "치킨" },
    ],
};

const TUTORIALS = {
    game1: {
        title: "1단원 — 컴퓨터의 기초",
        icon: "💻",
        steps: [
            { illu: "👀  →  🖥️", text: "위에 제시어가 나타나요. (예: \"컴퓨터의 눈\")" },
            { illu: "🖥️ ⬇️ 🖥️ ⬇️", text: "정답 단어가 위에서 떨어져요." },
            { illu: "🖱️ 👆 ✨", text: "마우스로 단어를 클릭하면 점수 획득!" },
            { illu: "🔥 →→→", text: "라운드가 진행될수록 점점 빨라져요!" },
        ],
    },
    game2: {
        title: "2단원 — 마우스 마스터",
        icon: "🖱️",
        steps: [
            { illu: "🎈  👆", text: "풍선은 한 번 클릭!" },
            { illu: "📦  👆👆", text: "상자는 빠르게 두 번 클릭 (더블클릭)!" },
            { illu: "🎈 + 📦", text: "3라운드는 풍선과 상자가 섞여 나와요." },
            { illu: "❌ → -30", text: "빈 곳을 잘못 누르면 점수가 깎여요." },
        ],
    },
    game3: {
        title: "3단원 — 택배 마스터",
        icon: "🚚",
        steps: [
            { illu: "🚚 [□][□][□]", text: "빈 트럭이 도착해요. 칸을 채워야 해요!" },
            { illu: "📦 🤏 🖱️", text: "물건을 마우스로 꾹 누르고 드래그하세요." },
            { illu: "🤏  →  🚚", text: "트럭 위로 끌어다 놓으면 적재 완료!" },
            { illu: "🚚💨 +보너스", text: "모든 칸을 채우면 트럭 출발 + 보너스 점수!" },
        ],
    },
    game4: {
        title: "5단원 — 포트리스 챌린지",
        icon: "🎯",
        steps: [
            { illu: "🖱️  →  🔫", text: "마우스 방향으로 대포가 조준돼요." },
            { illu: "👆 꾸~욱  🔋", text: "마우스를 꾸욱 길게 누르면 파워가 차올라요." },
            { illu: "💣 →→ 🎯", text: "마우스를 떼면 포탄 발사! 목표물 명중!" },
            { illu: "🔥 콤보!", text: "연속으로 맞추면 콤보 보너스가 늘어나요." },
        ],
    },
    game5: {
        title: "4단원 — 수학 마스터",
        icon: "🔢",
        steps: [
            { illu: "3 + 5 = ❓", text: "문제가 나타나요. 답을 계산해 보세요." },
            { illu: "[1][2][3]\n[4][5][6]", text: "아래 숫자 버튼을 눌러 답을 만들어요." },
            { illu: "✓ 확인", text: "확인 버튼을 누르면 정답 체크!" },
            { illu: "1단계 → 2단계 → 3단계", text: "덧셈 → 곱셈 → 큰 덧셈으로 진행돼요." },
        ],
    },
    game6: {
        title: "6단원 — 글자 그리기",
        icon: "✍️",
        steps: [
            { illu: "송 양 초 ?", text: "회색 글자들이 화면에 나타나요." },
            { illu: "🖱️ 꾸욱  ✏️", text: "마우스를 꾹 누르고 글자 위를 천천히 색칠해요." },
            { illu: "송 ✓", text: "글자가 충분히 채워지면 ✓ 완성!" },
            { illu: "송 양 초 화 이 팅", text: "모든 글자를 완성하면 졸업 시험 통과! 🎓" },
        ],
    },
    // 2단원 게임 튜토리얼들 (간단 버전)
    gameMaze: {
        title: "스텝 1 — 미로 탈출",
        icon: "🧭",
        steps: [
            { illu: "← ↑ ↓ →", text: "방향키로 캐릭터를 움직여요" },
            { illu: "🍎 📦", text: "과일·보물상자 먹으면 점수!" },
            { illu: "🏠  ⏰15초", text: "15초 안에 집까지! 늦으면 점수 절반 😱" },
        ],
    },
    gameJump: {
        title: "스텝 2 — 캥거루 점프",
        icon: "🦘",
        steps: [
            { illu: "SPACE 톡", text: "짧게 누르면 낮은 점프" },
            { illu: "SPACE 꾸~욱", text: "오래 누르면 높은 점프" },
            { illu: "🌵 피하기, 🍎 먹기, 🎁 ×보너스", text: "장애물 피하고 과일 모으기!" },
        ],
    },
    gameArchery: {
        title: "스텝 3 — 양궁 챌린지",
        icon: "🏹",
        steps: [
            { illu: "↑ ↓", text: "방향키 위/아래로 조준 각도 조절" },
            { illu: "SPACE 꾸~욱", text: "스페이스바를 꾸욱! 길게 누를수록 파워 UP" },
            { illu: "SPACE 떼면 → 🎯", text: "스페이스바를 떼면 화살 발사! 빠르게 지나가는 단어 명중!" },
            { illu: "🌟 ×20 황금표적", text: "가끔 황금 표적이 나와요. 명중하면 점수 ×10~×20 배수!" },
        ],
    },
    gameHangul: {
        title: "스텝 5 — 한글 자음 모음",
        icon: "ㄱ",
        steps: [
            { illu: "ㄱ ↓ ↓", text: "한글이 하늘에서 떨어져요" },
            { illu: "R → ㄱ", text: "글자 아래 영문 키를 누르세요" },
            { illu: "R + K → 가", text: "3단계는 두 키 연속으로! (자음 + 모음)" },
        ],
    },
    gameDelete: {
        title: "스텝 4 — 딜리트 마스터",
        icon: "🗑️",
        steps: [
            { illu: "▦ 10×10 = 100", text: "100개 DELETE 버튼이 바둑판처럼 나와요" },
            { illu: "⌫ → 1·2·3...", text: "DELETE/BACKSPACE 키로 1번부터 순서대로 지워요" },
            { illu: "⏰ 10초 × 3단계", text: "단계당 10초! 100개 다 지우면 보너스!" },
        ],
    },
    gameType: {
        title: "스텝 6 — 타자 마스터",
        icon: "⌨️",
        steps: [
            { illu: "사과", text: "화면 가운데 한글 단어가 나와요" },
            { illu: "키 입력 → 사 ✓", text: "한 글자씩 입력하면 위에서 초록색으로 완성!" },
            { illu: "⚡ 송양초~", text: "마지막 단계는 송양초 챌린지! 빨리 칠수록 점수 UP!" },
        ],
    },
    // 3단원 단축키편 튜토리얼들
    gameRename: {
        title: "스텝 1 — 폴더 이름 변경",
        icon: "📁",
        steps: [
            { illu: "📁 클릭", text: "폴더를 클릭해서 선택해요" },
            { illu: "🖱️ 우클릭", text: "마우스 오른쪽 클릭 → '이름 바꾸기' 선택" },
            { illu: "입력 → Enter", text: "힌트에 적힌 이름을 입력하고 Enter!" },
        ],
    },
    gameCopy: {
        title: "스텝 2 — 복사 붙여넣기",
        icon: "📋",
        steps: [
            { illu: "📄 클릭 → Ctrl+C", text: "왼쪽 파일을 클릭한 뒤 Ctrl+C 로 복사" },
            { illu: "🖱️ 드래그", text: "2단계는 마우스 드래그로 여러 개 한꺼번에!" },
            { illu: "📁 클릭 → Ctrl+V", text: "오른쪽 폴더 클릭 → Ctrl+V → 원본은 🗑️ 휴지통으로!" },
            { illu: "⚡ 빨리 = 보너스", text: "다 끝내면 남은 시간 × 보너스 점수!" },
        ],
    },
    gameDeleteUndo: {
        title: "스텝 3 — 되돌리기 부활",
        icon: "⏪",
        steps: [
            { illu: "⌫ 100개 지워!", text: "DELETE/BACKSPACE 로 한 개씩 지우기" },
            { illu: "Ctrl+Z ⏪", text: "Ctrl+Z 누르면 한꺼번에 모두 되살아나요!" },
            { illu: "지우기 → 살리기 반복", text: "반복할수록 점수가 쌓여요. 마무리는 다 지운 상태로!" },
        ],
    },
    gameSelectAll: {
        title: "스텝 4 — 전체 선택 폭주",
        icon: "⬛",
        steps: [
            { illu: "📁📁📁 50개+", text: "엄청 많은 폴더가 나와요" },
            { illu: "1개 클릭 → DELETE", text: "한 개씩 지울 수도 있지만... 너무 느려요!" },
            { illu: "💡 Ctrl+A → DELETE", text: "Ctrl+A 로 전부 선택해서 한 방에! 점수 ×5 보너스!" },
        ],
    },
    gameBbq: {
        title: "스텝 5 — 송양초 BBQ 보너스",
        icon: "🥩",
        steps: [
            { illu: "🥩 → 🔥", text: "왼쪽 트레이의 고기를 화로 위로 드래그!" },
            { illu: "🔥 지글지글~", text: "고기가 생→익는중→완벽 으로 변해요" },
            { illu: "🥓 → 🍽️", text: "완벽한 순간 화로에서 접시로 드래그! +5,000점" },
        ],
    },
};

// ============================================================
// 6단원: 글자 그리기 (송양초 화이팅) — 마우스로 트레이싱
// ============================================================

const TRACE_GAME_CONFIG = {
    word: "송양초 화이팅",
    completionThreshold: 0.22,        // 캔버스의 22% 이상 채우면 완료
    pointsPerChar: 1500,               // 글자 하나 완성 시 점수 (6글자 × 1500 = 9000)
    allCompleteBonus: 1000,            // 전체 완성 시 보너스 (총 10000)
    strokeColor: "#ff8a5b",
    strokeWidth: 24,
    charWidth: 110,
    charHeight: 140,
};

