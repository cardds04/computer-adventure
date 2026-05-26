/* ============================================================
   data.js — 캐릭터, 단원, 게임 콘텐츠 데이터
   ============================================================ */

// 단일 진화 캐릭터: 알 → 송양초마스터 (20단계)
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
            "🏆👑",   // L20: 송양초마스터
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
    "송양초마스터",    // L20
];

// 누적 점수가 얼마면 레벨 N이 되는지 (L1~L20, 후반은 점점 가팔라짐)
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
    1100000,   // L20: 송양초마스터 🏆
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

// 상위 단원 정보 (현재 활성 단원 + 향후 추가될 단원들)
const UNITS = [
    { num: 1,  title: "마우스편",  icon: "🖱️", active: true  },
    { num: 2,  title: "준비 중",   icon: "🔒", active: false },
    { num: 3,  title: "준비 중",   icon: "🔒", active: false },
    { num: 4,  title: "준비 중",   icon: "🔒", active: false },
    { num: 5,  title: "준비 중",   icon: "🔒", active: false },
    { num: 6,  title: "준비 중",   icon: "🔒", active: false },
    { num: 7,  title: "준비 중",   icon: "🔒", active: false },
    { num: 8,  title: "준비 중",   icon: "🔒", active: false },
    { num: 9,  title: "준비 중",   icon: "🔒", active: false },
    { num: 10, title: "준비 중",   icon: "🔒", active: false },
];
const CURRENT_UNIT_TITLE = "송양초등학교 디지털수업 : 마우스편";

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

