/* ============================================================
   2단원 스텝 4: 딜리트 마스터 (그리드 100개 순차 제거)
   바둑판식 10×10 = 100개 DELETE 버튼.
   DELETE/BACKSPACE 키 누를 때마다 1번부터 순서대로 차근차근 제거.
   단계당 10초, 3단계.
   ============================================================ */

SCREEN_RENDERERS.gameDelete = function (root, params) {
    const screen = el("div", { class: "screen game game--delete" });
    const cfg = DELETE_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let stageDeletes = 0;
    let totalDeletes = 0;
    let rafId = null;
    let buttons = [];   // 현재 단계의 버튼 엘리먼트들 (인덱스 0부터)
    let nextIdx = 0;    // 다음에 사라질 버튼 인덱스

    // ----- HUD -----
    const goalScore = LESSONS_UNIT2.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "10.0", style: { color: "var(--secondary-dark)" } });
    const deletesEl = el("span", { class: "hud-chip__big", text: "0" });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);
    const exitBtn = el("button", {
        class: "btn btn--ghost",
        text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => { cleanup(); navigate("home"); } },
    });

    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" },
            el("span", { text: "📋" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "🗑️" }),
            el("span", { class: "stat-chip__label", text: "삭제" }),
            deletesEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "⏱️" }),
            timerEl,
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

    // ----- 그리드 영역 -----
    const playArea = el("div", { class: "delete-grid-area" });
    const grid = el("div", { class: "delete-grid" });
    playArea.appendChild(grid);
    screen.appendChild(playArea);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    // ----- 그리드 만들기 -----
    function buildGrid() {
        grid.innerHTML = "";
        buttons = [];
        nextIdx = 0;
        stageDeletes = 0;
        const stage = cfg.stages[stageIndex];
        grid.style.gridTemplateColumns = `repeat(${stage.cols}, 1fr)`;
        const total = stage.cols * stage.rows;
        for (let i = 0; i < total; i++) {
            const btn = el("div", { class: "delete-cell" },
                el("div", { class: "delete-cell__num", text: `${i + 1}` }),
                el("div", { class: "delete-cell__label", text: "DELETE" }),
            );
            grid.appendChild(btn);
            buttons.push(btn);
        }
        // 첫 번째 버튼 하이라이트
        highlightNext();
    }

    function highlightNext() {
        if (nextIdx < buttons.length) {
            buttons[nextIdx].classList.add("delete-cell--next");
        }
    }

    // ----- DELETE 처리 -----
    function deleteOne() {
        if (!inStage || finished) return;
        if (nextIdx >= buttons.length) return;
        const stage = cfg.stages[stageIndex];

        const btn = buttons[nextIdx];
        btn.classList.remove("delete-cell--next");
        btn.classList.add("delete-cell--gone");
        // 약간 뒤에 시각적으로 제거 (애니메이션)
        setTimeout(() => { btn.style.visibility = "hidden"; }, 220);

        nextIdx++;
        stageDeletes++;
        totalDeletes++;
        score += stage.pointPerDelete;
        deletesEl.textContent = totalDeletes.toLocaleString();
        updateScoreDisplay();

        Audio.correct();

        if (nextIdx < buttons.length) {
            highlightNext();
        } else {
            // 단계 클리어 보너스
            score += stage.clearBonus;
            updateScoreDisplay();
            showClearBanner(stage.clearBonus);
            Audio.bigCorrect(8);
            // 단계 즉시 종료
            inStage = false;
            setTimeout(() => endStage(), 1000);
        }
    }

    function showClearBanner(bonus) {
        const banner = el("div", { class: "delete-clear-banner" },
            el("div", { class: "delete-clear-banner__title", text: "🎉 100개 클리어!" }),
            el("div", { class: "delete-clear-banner__sub", text: `보너스 +${bonus.toLocaleString()}점` }),
        );
        screen.appendChild(banner);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 24, ["✨", "⭐", "🌟", "💫", "🎉", "🎊"]);
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.7)";
            setTimeout(() => banner.remove(), 420);
        }, 900);
    }

    // ----- 스테이지 흐름 -----
    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        buildGrid();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
        }, 1100);
    }

    function showStageBanner(label) {
        const banner = el("div", { class: "math-stage-banner", text: label });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.5s, transform 0.5s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => banner.remove(), 520);
        }, 1000);
    }

    function endStage() {
        inStage = false;
        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 1000);
        } else {
            setTimeout(() => startStage(stageIndex), 1200);
        }
    }

    function tick() {
        if (finished) { rafId = requestAnimationFrame(tick); return; }
        if (inStage) {
            const remain = Math.max(0, (stageEndsAt - performance.now()) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 3 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) endStage();
        }
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        document.removeEventListener("keydown", keyHandler);
    }

    function finishGame() {
        if (finished) return;
        finished = true;
        cleanup();
        Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score,
            bestCombo: totalDeletes,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    function keyHandler(e) {
        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            deleteOne();
        }
    }
    document.addEventListener("keydown", keyHandler);

    // ----- 좌상단 캐릭터 + 하단 안내 -----
    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);
    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 DELETE 또는 BACKSPACE(⌫) 키를 누르면 1번부터 차근차근 사라져요! 10초 안에 최대한 많이!" });
    screen.appendChild(bottomHelp);

    // ----- 시작 -----
    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "DELETE키를 눌러서 빠르게 지우세요!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameDelete")) {
        showTutorial("gameDelete", startGame);
    } else {
        startGame();
    }
};
