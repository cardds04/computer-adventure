/* ============================================================
   2단원 스텝 1: 미로 탈출 (2단계)
   각 단계 15초 제한. 시간 초과 시 점수 절반!
   ============================================================ */

SCREEN_RENDERERS.gameMaze = function (root, params) {
    const screen = el("div", { class: "screen game game--maze" });
    const cfg = MAZE_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let playerX = 0, playerY = 0;
    let lastMoveAt = 0;
    let finished = false;
    let itemsCollected = 0;
    let totalItems = 0;
    let stageDeadline = 0;
    let stageTimer = null;
    let rafId = null;
    let inStage = false;
    let dynamicCellSize = cfg.cellSize;

    let mazeContainer = null;
    let playerEl = null;
    let itemStates = [];

    // ----- HUD -----
    const goalScore = LESSONS_UNIT2.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
    const timerEl = el("span", { class: "hud-chip__big", text: "15.0", style: { color: "var(--secondary-dark)" } });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);
    const itemsCountEl = el("span", { text: "0 / 0" });
    const exitBtn = el("button", {
        class: "btn btn--ghost",
        text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => { cleanup(); navigate("home"); } },
    });

    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" },
            el("span", { text: "🧭" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "⏱️" }),
            timerEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "🎁" }),
            itemsCountEl,
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
        lvlChip.update(state.points + (score - startingScore));
    }

    // ----- 미로 만들기 -----
    function buildStage(stageIdx) {
        // 기존 미로 제거
        if (mazeContainer) mazeContainer.remove();

        const stage = cfg.stages[stageIdx];
        itemStates = stage.items.map(it => ({ ...it, taken: false, el: null }));
        totalItems = itemStates.length;
        itemsCollected = 0;
        itemsCountEl.textContent = `0 / ${totalItems}`;

        playerX = stage.start.x;
        playerY = stage.start.y;

        // 셀 크기 동적 계산
        const maxW = Math.floor((window.innerWidth - 40) / stage.width);
        const maxH = Math.floor((window.innerHeight - 180) / stage.height);
        dynamicCellSize = Math.min(cfg.cellSize, maxW, maxH);

        mazeContainer = el("div", { class: "maze-container" });
        mazeContainer.style.width = `${stage.width * dynamicCellSize}px`;
        mazeContainer.style.height = `${stage.height * dynamicCellSize}px`;

        // 벽/길 렌더링
        for (let y = 0; y < stage.height; y++) {
            for (let x = 0; x < stage.width; x++) {
                const isWall = stage.walls[y][x] === 1;
                const cell = el("div", {
                    class: `maze-cell ${isWall ? "maze-cell--wall" : "maze-cell--path"}`,
                    style: {
                        left: `${x * dynamicCellSize}px`,
                        top: `${y * dynamicCellSize}px`,
                        width: `${dynamicCellSize}px`,
                        height: `${dynamicCellSize}px`,
                    },
                });
                mazeContainer.appendChild(cell);
            }
        }

        // 골 (집)
        const goalEl = el("div", {
            class: "maze-goal",
            text: "🏠",
            style: {
                left: `${stage.goal.x * dynamicCellSize}px`,
                top: `${stage.goal.y * dynamicCellSize}px`,
                width: `${dynamicCellSize}px`,
                height: `${dynamicCellSize}px`,
                fontSize: `${dynamicCellSize * 0.7}px`,
            },
        });
        mazeContainer.appendChild(goalEl);

        // 아이템
        itemStates.forEach(item => {
            const itemEl = el("div", {
                class: `maze-item maze-item--${item.type}`,
                style: {
                    left: `${item.x * dynamicCellSize}px`,
                    top: `${item.y * dynamicCellSize}px`,
                    width: `${dynamicCellSize}px`,
                    height: `${dynamicCellSize}px`,
                    fontSize: `${dynamicCellSize * 0.55}px`,
                },
            });
            itemEl.appendChild(el("span", { class: "maze-item__emoji", text: item.emoji }));
            if (item.type === "fruit") {
                itemEl.appendChild(el("div", { class: "maze-item__value", text: `+${item.value}` }));
            } else {
                itemEl.appendChild(el("div", { class: "maze-item__value", text: "?" }));
            }
            mazeContainer.appendChild(itemEl);
            item.el = itemEl;
        });

        // 플레이어
        playerEl = el("div", {
            class: "maze-player",
            text: getCurrentEmoji(),
            style: {
                left: `${playerX * dynamicCellSize}px`,
                top: `${playerY * dynamicCellSize}px`,
                width: `${dynamicCellSize}px`,
                height: `${dynamicCellSize}px`,
                fontSize: `${dynamicCellSize * 0.65}px`,
            },
        });
        mazeContainer.appendChild(playerEl);

        screen.appendChild(mazeContainer);
    }

    // ----- 이동 -----
    function tryMove(dx, dy) {
        if (finished || !inStage) return;
        const now = performance.now();
        if (now - lastMoveAt < cfg.moveCooldownMs) return;

        const stage = cfg.stages[stageIndex];
        const nx = playerX + dx;
        const ny = playerY + dy;
        if (nx < 0 || nx >= stage.width || ny < 0 || ny >= stage.height) return;
        if (stage.walls[ny][nx] === 1) return;

        playerX = nx;
        playerY = ny;
        lastMoveAt = now;
        playerEl.style.left = `${playerX * dynamicCellSize}px`;
        playerEl.style.top  = `${playerY * dynamicCellSize}px`;
        Audio.tick();

        // 아이템 충돌
        const it = itemStates.find(i => !i.taken && i.x === playerX && i.y === playerY);
        if (it) collectItem(it);

        // 골 도착
        if (playerX === stage.goal.x && playerY === stage.goal.y) {
            stageReached();
        }
    }

    function collectItem(item) {
        item.taken = true;
        itemsCollected++;
        itemsCountEl.textContent = `${itemsCollected} / ${totalItems}`;

        const px = item.x * dynamicCellSize + dynamicCellSize / 2;
        const py = item.y * dynamicCellSize;

        if (item.type === "fruit") {
            score += item.value;
            updateScoreDisplay();
            Audio.correct();
            showMazeFloat(`+${item.value}`, px, py, "fruit");
        } else if (item.type === "treasure") {
            const outcome = rollTreasure();
            applyTreasure(item, outcome, px, py);
        }

        item.el.classList.add("maze-item--collected");
        setTimeout(() => item.el.remove(), 460);
    }

    function rollTreasure() {
        const totalW = cfg.treasureOutcomes.reduce((s, o) => s + o.weight, 0);
        let r = Math.random() * totalW;
        for (const o of cfg.treasureOutcomes) {
            r -= o.weight;
            if (r <= 0) return o;
        }
        return cfg.treasureOutcomes[cfg.treasureOutcomes.length - 1];
    }

    function applyTreasure(item, outcome, px, py) {
        let gain = 0;
        if (outcome.type === "multiply") {
            const ns = Math.max(0, Math.floor(score * outcome.factor));
            gain = ns - score;
            score = ns;
        } else if (outcome.type === "add") {
            gain = outcome.value;
            score = Math.max(0, score + gain);
        }
        updateScoreDisplay();
        showMazeFloat(outcome.label, px, py, outcome.color);

        if (gain >= 500) {
            Audio.bigCorrect(8);
            const rect = mazeContainer.getBoundingClientRect();
            emitParticles(px + rect.left, py + rect.top, 14, ["✨", "⭐", "🌟", "💫", "🎉"]);
        } else if (gain > 0) Audio.correct();
        else if (gain === 0) Audio.tick();
        else Audio.wrong();
    }

    function showMazeFloat(text, x, y, color) {
        if (!mazeContainer) return;
        const cls = "maze-float maze-float--" + (color || "neutral");
        const f = el("div", { class: cls, text });
        f.style.left = `${x}px`;
        f.style.top  = `${y}px`;
        mazeContainer.appendChild(f);
        setTimeout(() => f.remove(), 1300);
    }

    // ----- 스테이지 흐름 -----
    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        buildStage(idx);
        showStageBanner(stage.label);

        // 카운트다운 후 시작
        setTimeout(() => {
            inStage = true;
            stageDeadline = performance.now() + cfg.timeLimitMs;
            stageTimer = setTimeout(() => {
                if (inStage) stageTimeOut();
            }, cfg.timeLimitMs);
        }, 1100);
    }

    function stageTimeOut() {
        if (!inStage) return;
        inStage = false;
        clearTimeout(stageTimer);
        const before = score;
        score = Math.floor(score * cfg.timeoutPenaltyRatio);
        updateScoreDisplay();
        Audio.wrong();

        const banner = el("div", { class: "maze-banner maze-banner--bad" },
            el("div", { class: "maze-banner__title", text: "⏰ 시간 초과!" }),
            el("div", { class: "maze-banner__sub", text: `점수 절반! ${before.toLocaleString()} → ${score.toLocaleString()}` }),
        );
        screen.appendChild(banner);
        setTimeout(() => banner.remove(), 1800);

        nextStageOrFinish(2000);
    }

    function stageReached() {
        if (!inStage) return;
        inStage = false;
        clearTimeout(stageTimer);
        score += cfg.completionBonus;
        updateScoreDisplay();
        Audio.bigCorrect(8);

        const banner = el("div", { class: "maze-banner maze-banner--good" },
            el("div", { class: "maze-banner__title", text: "🏠 도착!" }),
            el("div", { class: "maze-banner__sub", text: `+${cfg.completionBonus}점 보너스!` }),
        );
        screen.appendChild(banner);
        setTimeout(() => banner.remove(), 1800);

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 16, ["✨", "⭐", "🌟", "💫", "🎉", "🎊"]);

        nextStageOrFinish(2000);
    }

    function nextStageOrFinish(delay) {
        if (stageIndex + 1 < cfg.stages.length) {
            setTimeout(() => startStage(stageIndex + 1), delay);
        } else {
            setTimeout(finishGame, delay);
        }
    }

    function showStageBanner(label) {
        const banner = el("div", { class: "math-stage-banner", text: label });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.5s, transform 0.5s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => banner.remove(), 520);
        }, 950);
    }

    // ----- HUD 타이머 갱신 루프 -----
    function tick() {
        if (finished) return;
        if (inStage) {
            const remain = Math.max(0, (stageDeadline - performance.now()) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 3 ? "#d63031" : "var(--secondary-dark)";
        }
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        finished = true;
        if (stageTimer) clearTimeout(stageTimer);
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
            bestCombo: itemsCollected,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    function keyHandler(e) {
        if (finished) return;
        let handled = true;
        if (e.key === "ArrowLeft")       tryMove(-1, 0);
        else if (e.key === "ArrowRight") tryMove(1, 0);
        else if (e.key === "ArrowUp")    tryMove(0, -1);
        else if (e.key === "ArrowDown")  tryMove(0, 1);
        else handled = false;
        if (handled) e.preventDefault();
    }
    document.addEventListener("keydown", keyHandler);

    // ----- 좌상단 캐릭터 + 하단 안내 -----
    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);
    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 ← ↑ ↓ → 방향키로 미로를 통과! 과일·보물상자 먹으면 점수 UP. 시간 안에 집(🏠)에 도착하기!" });
    screen.appendChild(bottomHelp);

    // ----- 시작 -----
    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "방향키를 이용해 미로를 통과하세요!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameMaze")) {
        showTutorial("gameMaze", startGame);
    } else {
        startGame();
    }
};
