/* ============================================================
   4단원 스텝 5: 진짜? 가짜? OX 퀴즈
   가짜 정보 vs 진짜 정보를 O/X로 판별 (10문제, 답하면 쉬운 설명 표시)
   ============================================================ */

SCREEN_RENDERERS.gameOx = function (root, params) {
    const screen = el("div", { class: "screen game game--ox game--unit4" });
    const cfg = OX_GAME_CONFIG;
    const questions = cfg.questions;
    const TOTAL = questions.length;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let qIdx = 0;
    let correctCount = 0;
    let finished = false;
    let locked = false;

    const goalScore = (LESSONS_UNIT4.find(l => l.id === params.lessonId) || {}).goalScore || 0;

    // ----- HUD -----
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: `1 / ${TOTAL}` });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);
    const exitBtn = el("button", {
        class: "btn btn--ghost", text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => { cleanup(); navigate("home"); } },
    });
    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" },
            el("span", { text: "🕵️" }),
            el("span", { class: "stat-chip__label", text: "문제" }),
            stageEl,
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

    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);

    // ----- 문제 카드 -----
    const card = el("div", { class: "ox-card" });
    screen.appendChild(card);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 가짜 정보를 골라내는 ‘디지털 탐정’이 되어보자! 맞으면 O, 틀리면 X" });
    screen.appendChild(bottomHelp);

    root.appendChild(screen);

    function updateScore() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function loadQuestion() {
        const item = questions[qIdx];
        const n = qIdx + 1;
        stageEl.textContent = `${n} / ${TOTAL}`;
        locked = false;
        card.innerHTML = "";
        card.appendChild(el("div", { class: "ox-tag", text: `문제 ${n} · ${item.cat}` }));
        card.appendChild(el("div", { class: "ox-q", text: item.q }));

        const btns = el("div", { class: "ox-btns" });
        const oBtn = el("button", { class: "ox-btn ox-btn--o" },
            el("span", { class: "ox-btn__mark", text: "⭕" }),
            el("span", { class: "ox-btn__lbl", text: "맞아요 / 진짜" }),
        );
        const xBtn = el("button", { class: "ox-btn ox-btn--x" },
            el("span", { class: "ox-btn__mark", text: "❌" }),
            el("span", { class: "ox-btn__lbl", text: "아니에요 / 가짜" }),
        );
        oBtn.addEventListener("click", () => answer("O", oBtn, xBtn));
        xBtn.addEventListener("click", () => answer("X", xBtn, oBtn));
        btns.appendChild(oBtn);
        btns.appendChild(xBtn);
        card.appendChild(btns);
    }

    function answer(choice, picked, other) {
        if (finished || locked) return;
        locked = true;
        const item = questions[qIdx];
        const isCorrect = choice === item.answer;
        picked.classList.add(isCorrect ? "correct" : "wrong");
        other.classList.add("dim");
        // 정답 버튼도 강조(틀렸을 때 정답이 뭔지 보여줌)
        if (!isCorrect) {
            (item.answer === "O" ? card.querySelector(".ox-btn--o") : card.querySelector(".ox-btn--x")).classList.add("reveal");
        }

        if (isCorrect) {
            score += cfg.pointsPerCorrect;
            correctCount++;
            updateScore();
            Audio.bigCorrect && Audio.bigCorrect(5);
            const r = picked.getBoundingClientRect();
            emitParticles(r.left + r.width / 2, r.top + r.height / 2, 12, ["⭐", "✨", "🎉", "🕵️"]);
        } else {
            Audio.wrong && Audio.wrong();
        }

        // 설명 + 다음 버튼
        const result = el("div", { class: "ox-result " + (isCorrect ? "ox-result--ok" : "ox-result--no") },
            el("div", { class: "ox-result__head",
                text: isCorrect ? "⭕ 정답이에요!" : `❌ 아쉬워요! 정답은 ${item.answer} 예요` }),
            el("div", { class: "ox-result__explain", text: item.explain }),
        );
        const nextBtn = el("button", {
            class: "btn btn--big ox-next",
            text: qIdx >= TOTAL - 1 ? "결과 보기 🏁" : "다음 문제 ▶",
            on: { click: () => {
                if (qIdx >= TOTAL - 1) finishGame();
                else { qIdx++; loadQuestion(); }
            } },
        });
        result.appendChild(nextBtn);
        card.appendChild(result);
        requestAnimationFrame(() => result.classList.add("show"));
    }

    function cleanup() { finished = true; }

    function finishGame() {
        if (finished) return;
        finished = true;
        cleanup();
        Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score,
            bestCombo: correctCount,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    updateScore();
    const startGame = () => {
        showCarryOverBanner(startingScore);
        loadQuestion();
    };
    if (typeof hasSeenTutorial === "function" && !hasSeenTutorial("gameOx")) {
        showTutorial("gameOx", startGame);
    } else {
        startGame();
    }
};
