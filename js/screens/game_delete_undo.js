/* ============================================================
   3단원 스텝 3: DELETE + Ctrl+Z 부활 마법 (10셀, 순차 부활)
   - 5×2 = 10셀
   - DELETE 로 1번부터 하나씩 지움
   - 다 지운 뒤 Ctrl+Z → 한 개씩 차례로 부활 (애니메이션)
   - 부활 중에는 DELETE 비활성
   - 전부 부활하면 다시 DELETE 가능
   ============================================================ */

SCREEN_RENDERERS.gameDeleteUndo = function (root, params) {
    const screen = el("div", { class: "screen game game--delete game--unit3" });
    const cfg = DELETE_UNDO_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let totalDeletes = 0;
    let totalUndos = 0;
    let rafId = null;
    let buttons = [];
    let nextIdx = 0;
    let undoing = false;       // 부활 진행 중 (DELETE 막힘)
    let undoTimer = null;

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "25.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "⏪" }),
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

    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);

    const playArea = el("div", { class: "delete-grid-area" });
    const grid = el("div", { class: "delete-grid delete-grid--small" });
    playArea.appendChild(grid);
    screen.appendChild(playArea);

    const cards = makeShortcutCards([
        { combo: "DELETE", label: "지우기", icon: "⌫", active: true },
        { combo: "Ctrl+Z", label: "되살리기", icon: "⏪" },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 DELETE 10번 → Ctrl+Z → 차례로 부활 → 전부 살아나면 다시 지우기! 반복!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function buildGrid() {
        grid.innerHTML = "";
        buttons = [];
        nextIdx = 0;
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
        highlightNext();
    }

    function highlightNext() {
        if (nextIdx < buttons.length) {
            buttons[nextIdx].classList.add("delete-cell--next");
        }
    }

    function deleteOne() {
        if (!inStage || finished) return;
        if (nextIdx >= buttons.length) return;
        const stage = cfg.stages[stageIndex];

        const btn = buttons[nextIdx];
        btn.classList.remove("delete-cell--next");
        btn.classList.add("delete-cell--gone");
        setTimeout(() => { btn.style.visibility = "hidden"; }, 220);

        nextIdx++;
        totalDeletes++;
        score += stage.pointPerDelete;
        deletesEl.textContent = totalDeletes.toLocaleString();
        updateScoreDisplay();
        cards.flash("DELETE");
        Audio.correct();

        if (nextIdx < buttons.length) {
            highlightNext();
        } else {
            score += stage.clearBonus;
            updateScoreDisplay();
            showCycleBanner(`✨ 10개 다 지움! +${stage.clearBonus.toLocaleString()} | Ctrl+Z 로 부활!`);
            Audio.bigCorrect(6);
        }
    }

    function undoOne() {
        if (!inStage || finished) return;
        if (nextIdx === 0) return;          // 지운 게 없음
        const stage = cfg.stages[stageIndex];

        // 현재 next 표시 제거 (있다면)
        if (nextIdx < buttons.length) {
            buttons[nextIdx].classList.remove("delete-cell--next");
        }
        // 한 칸 부활 — 마지막에 지운 것부터 거꾸로
        nextIdx--;
        const btn = buttons[nextIdx];
        btn.style.visibility = "";
        btn.classList.remove("delete-cell--gone");
        btn.classList.add("delete-cell--reviving");
        btn.classList.add("delete-cell--next");   // 다시 next 표시
        setTimeout(() => btn.classList.remove("delete-cell--reviving"), 400);

        score += stage.undoPerCell;
        totalUndos++;
        updateScoreDisplay();
        cards.flash("Ctrl+Z");
        Audio.tick();
    }

    function showCycleBanner(text) {
        const banner = el("div", { class: "cycle-banner", text });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1200);
    }

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        buildGrid();
        undoing = false;
        cards.setActive("DELETE", true);
        cards.setActive("Ctrl+Z", false);

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
        if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
        undoing = false;
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
        if (undoTimer) clearTimeout(undoTimer);
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
            bestCombo: totalUndos,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    function keyHandler(e) {
        if (!inStage || finished) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            e.preventDefault();
            undoOne();
        } else if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            deleteOne();
        }
    }
    document.addEventListener("keydown", keyHandler);

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "DELETE 10번 → Ctrl+Z → 차례로 부활!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameDeleteUndo")) {
        showTutorial("gameDeleteUndo", startGame);
    } else {
        startGame();
    }
};
