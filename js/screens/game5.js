/* ============================================================
   4단원: 수학 덧셈 마스터 (게임 ID: game5)
   1자리 → 2자리 → 3자리 덧셈, 각 단계 5문제. 숫자 키패드로 답 입력.
   ============================================================ */

SCREEN_RENDERERS.game5 = function (root, params) {
    const screen = el("div", { class: "screen game game--math" });
    const cfg = MATH_GAME_CONFIG;

    let stageIndex = 0;
    let problemIndexInStage = 0;
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let correctTotal = 0;
    let wrongInProblem = 0;
    let currentProblem = null;
    let currentAnswer = "";
    let bestStreak = 0;
    let streak = 0;
    let isLocked = false;          // 정답 처리 중 입력 잠금

    // ----- HUD -----
    const goalScore = (LESSONS.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    const stageEl = el("span", { text: "1 / 3" });
    const problemEl = el("span", { text: "0 / 5" });
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);
    const exitBtn = el("button", {
        class: "btn btn--ghost",
        text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => navigate("home") },
    });

    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" },
            el("span", { text: "📚" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "✏️" }),
            el("span", { class: "stat-chip__label", text: "문제" }),
            problemEl,
        ),
        lvlChip.chip,
        el("span", { class: "hud-chip" },
            el("span", { text: "⭐" }),
            scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }),
            el("span", { class: "hud-chip__goal", text: `${goalScore}` }),
        ),
    );
    screen.appendChild(hud);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + score);
    }

    // ----- 메인 카드 -----
    const card = el("div", { class: "math-card" });

    const stageLabel = el("div", { class: "math-stage-label", text: cfg.stages[0].label });
    card.appendChild(stageLabel);

    // 문제 식 (A + B = ?)
    const problemBox = el("div", { class: "math-problem" });
    card.appendChild(problemBox);

    // 답 입력란
    const answerDisplay = el("div", { class: "math-answer", text: "?" });
    card.appendChild(answerDisplay);

    // 액션 버튼
    const actionRow = el("div", { class: "math-actions" });
    const backspaceBtn = el("button", {
        class: "btn btn--ghost math-action",
        html: "⌫ 한 칸 지움",
        on: { click: () => { if (!isLocked) backspace(); } },
    });
    const clearBtn = el("button", {
        class: "btn btn--ghost math-action",
        text: "전체 지우기",
        on: { click: () => { if (!isLocked) clearAnswer(); } },
    });
    const confirmBtn = el("button", {
        class: "btn math-action math-action--confirm",
        text: "✓ 확인",
        on: { click: () => { if (!isLocked) checkAnswer(); } },
    });
    actionRow.appendChild(backspaceBtn);
    actionRow.appendChild(clearBtn);
    actionRow.appendChild(confirmBtn);
    card.appendChild(actionRow);

    // 숫자 키패드
    const numpad = el("div", { class: "math-numpad" });
    const numLayout = ["1","2","3","4","5","6","7","8","9","","0",""];
    numLayout.forEach(n => {
        if (n === "") {
            numpad.appendChild(el("div"));   // 빈칸
            return;
        }
        const k = el("button", { class: "math-key", text: n });
        k.addEventListener("click", () => { if (!isLocked) addDigit(n); });
        numpad.appendChild(k);
    });
    card.appendChild(numpad);

    screen.appendChild(card);

    // ----- 플레이어 캐릭터 (수학 카드 우측) -----
    const playerChar = el("div", {
        class: "player-character player-character--side",
        text: getCurrentEmoji(),
    });
    screen.appendChild(playerChar);

    // 키보드 입력 (선택)
    const keyHandler = (ev) => {
        if (isLocked) return;
        if (/^[0-9]$/.test(ev.key)) { addDigit(ev.key); ev.preventDefault(); }
        else if (ev.key === "Backspace") { backspace(); ev.preventDefault(); }
        else if (ev.key === "Enter") { checkAnswer(); ev.preventDefault(); }
        else if (ev.key === "Escape") { clearAnswer(); ev.preventDefault(); }
    };
    document.addEventListener("keydown", keyHandler);

    // ----- 게임 로직 -----
    function generateProblem(stage) {
        const { op, digits } = stage;
        let a, b, answer;
        if (op === "×") {
            // 구구단: 2~9 × 2~9 (1단과 0은 제외 — 시시하지 않게)
            a = 2 + Math.floor(Math.random() * 8);
            b = 2 + Math.floor(Math.random() * 8);
            answer = a * b;
        } else {
            // 덧셈
            const max = Math.pow(10, digits) - 1;
            const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
            a = min + Math.floor(Math.random() * (max - min + 1));
            b = min + Math.floor(Math.random() * (max - min + 1));
            answer = a + b;
        }
        return { a, b, op, answer };
    }

    function nextProblem() {
        // 새 문제
        const stage = cfg.stages[stageIndex];
        problemIndexInStage++;

        if (problemIndexInStage > stage.problemCount) {
            // 단계 완료
            stageIndex++;
            problemIndexInStage = 0;
            if (stageIndex >= cfg.stages.length) {
                setTimeout(finishGame, 500);
                return;
            }
            // 다음 단계 시작 배너
            showStageBanner(cfg.stages[stageIndex].label);
            setTimeout(nextProblem, 1500);
            return;
        }

        currentProblem = generateProblem(stage);
        currentAnswer = "";
        wrongInProblem = 0;
        renderProblem();
        updateHUD();

        // 새 문제 등장 애니메이션
        problemBox.style.animation = "none";
        void problemBox.offsetWidth;
        problemBox.style.animation = "math-problem-in 0.4s cubic-bezier(0.2, 1.4, 0.4, 1)";
    }

    function showStageBanner(label) {
        const banner = el("div", { class: "math-stage-banner" }, el("span", { text: label }));
        screen.appendChild(banner);
        Audio.roundStart();
        setTimeout(() => {
            banner.style.transition = "opacity 0.5s, transform 0.5s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => banner.remove(), 520);
        }, 1100);
        stageLabel.textContent = label;
    }

    function renderProblem() {
        problemBox.innerHTML = "";
        problemBox.appendChild(el("span", { class: "math-num", text: currentProblem.a }));
        problemBox.appendChild(el("span", { class: "math-op",  text: currentProblem.op }));
        problemBox.appendChild(el("span", { class: "math-num", text: currentProblem.b }));
        problemBox.appendChild(el("span", { class: "math-op",  text: "=" }));
        problemBox.appendChild(el("span", { class: "math-num math-num--unknown", text: "?" }));

        answerDisplay.textContent = currentAnswer || "?";
        answerDisplay.classList.remove("correct", "wrong");
    }

    function updateHUD() {
        const stage = cfg.stages[stageIndex];
        stageEl.textContent = `${stageIndex + 1} / ${cfg.stages.length}`;
        problemEl.textContent = `${problemIndexInStage} / ${stage.problemCount}`;
    }

    function addDigit(d) {
        if (currentAnswer.length >= 5) return;   // 안전 한도
        if (currentAnswer === "0") currentAnswer = "";  // 0으로 시작 시 교체
        currentAnswer += String(d);
        answerDisplay.textContent = currentAnswer;
        answerDisplay.classList.remove("correct", "wrong");
        Audio.tick();
    }

    function backspace() {
        if (currentAnswer.length === 0) return;
        currentAnswer = currentAnswer.slice(0, -1);
        answerDisplay.textContent = currentAnswer || "?";
        Audio.tick();
    }

    function clearAnswer() {
        currentAnswer = "";
        answerDisplay.textContent = "?";
        answerDisplay.classList.remove("correct", "wrong");
    }

    function checkAnswer() {
        if (currentAnswer === "") return;
        isLocked = true;
        const userAns = parseInt(currentAnswer, 10);
        const correct = userAns === currentProblem.answer;
        const stage = cfg.stages[stageIndex];

        if (correct) {
            const streakBonus = Math.min(streak, 5) * 50;
            // progressivePoints 가 있으면 문제 번호별로 다른 점수 사용
            let basePoints = stage.pointsPerCorrect;
            if (Array.isArray(stage.progressivePoints) && stage.progressivePoints.length) {
                const idx = Math.min(problemIndexInStage - 1, stage.progressivePoints.length - 1);
                basePoints = stage.progressivePoints[idx];
            }
            const gain = basePoints + streakBonus;
            score += gain;
            correctTotal++;
            streak++;
            bestStreak = Math.max(bestStreak, streak);
            updateScoreDisplay();
            answerDisplay.classList.add("correct");

            // 정답 효과
            if (streak >= 3) Audio.bigCorrect(Math.min(streak, 8));
            else Audio.correct();

            const rect = answerDisplay.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const pf = el("div", {
                class: "points-float",
                text: `+${gain}!`,
                style: { left: `${cx}px`, top: `${cy}px`, fontSize: "36px" },
            });
            fxLayer.appendChild(pf);
            setTimeout(() => pf.remove(), 1100);
            emitParticles(cx, cy, 10, ["✨", "⭐", "🌟", "💫", "🎉"]);

            setTimeout(() => { isLocked = false; nextProblem(); }, 1100);
        } else {
            streak = 0;
            score = Math.max(0, score - cfg.wrongPenalty);
            updateScoreDisplay();
            answerDisplay.classList.add("wrong");
            Audio.wrong();

            // 틀려도 정답 보여주고 바로 다음 문제로 (재시도 없음)
            setTimeout(() => {
                answerDisplay.classList.remove("wrong");
                answerDisplay.textContent = currentProblem.answer;
                answerDisplay.classList.add("correct");
                setTimeout(() => { isLocked = false; nextProblem(); }, 900);
            }, 700);
        }
    }

    function finishGame() {
        document.removeEventListener("keydown", keyHandler);
        Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score,
            bestCombo: bestStreak,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    // ----- 시작 -----
    root.appendChild(screen);
    updateScoreDisplay();

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showStageBanner(cfg.stages[0].label);
        setTimeout(nextProblem, 1500);
    };

    if (!hasSeenTutorial("game5")) {
        showTutorial("game5", startGame);
    } else {
        startGame();
    }
};
