/* ============================================================
   4단원 스텝 5: 두더지 잡기 챔피언
   - 3×3 → 4×3 → 4×4 그리드 구멍
   - 두더지가 무작위로 튀어나옴 (일반/황금/다이아/왕관/폭탄)
   - 클릭하면 점수 + 콤보
   - 폭탄 클릭 = 페널티 + 콤보 끊김
   ============================================================ */

SCREEN_RENDERERS.gameMole = function (root, params) {
    const screen = el("div", { class: "screen game game--mole game--unit4" });
    const cfg = MOLE_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let spawnTimer = null;
    let combo = 0;
    let maxCombo = 0;

    let holes = [];        // {el, moleEl, mole, popTimer}

    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "30.0", style: { color: "var(--secondary-dark)" } });
    const comboEl = el("span", { class: "hud-chip__big", text: "0" });
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
            el("span", { text: "🔨" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "🔥" }),
            el("span", { class: "stat-chip__label", text: "콤보" }),
            comboEl,
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

    const grid = el("div", { class: "mole-grid" });
    screen.appendChild(grid);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 구멍에서 튀어나오는 두더지 클릭! 황금·다이아·👑왕관은 점수 폭증! 💣 폭탄 금지!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        comboEl.textContent = combo;
        comboEl.style.color = combo >= 5 ? "#d63031" : "var(--text-dark)";
    }

    function weightedPick(types) {
        const total = types.reduce((s, t) => s + t.weight, 0);
        let r = Math.random() * total;
        for (const t of types) {
            r -= t.weight;
            if (r <= 0) return t;
        }
        return types[types.length - 1];
    }

    function buildGrid() {
        grid.innerHTML = "";
        holes = [];
        const stage = cfg.stages[stageIndex];
        grid.style.gridTemplateColumns = `repeat(${stage.cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${stage.rows}, 1fr)`;
        const total = stage.cols * stage.rows;
        for (let i = 0; i < total; i++) {
            const holeEl = el("div", { class: "mole-hole" });
            const dirt = el("div", { class: "mole-hole__dirt" });
            const moleEl = el("div", { class: "mole-hole__mole" });
            holeEl.appendChild(dirt);
            holeEl.appendChild(moleEl);
            grid.appendChild(holeEl);
            const obj = { el: holeEl, moleEl, mole: null, popTimer: null };
            // 클릭으로 두더지 잡기
            moleEl.addEventListener("pointerdown", (e) => {
                if (!inStage || finished || !obj.mole) return;
                e.preventDefault();
                hitMole(obj);
            });
            holes.push(obj);
        }
    }

    function popMole() {
        if (!inStage || finished) return;
        // 비어있는 구멍 찾기
        const empties = holes.filter(h => !h.mole);
        if (empties.length === 0) return;
        const hole = empties[Math.floor(Math.random() * empties.length)];
        const type = weightedPick(cfg.moleTypes);
        const stage = cfg.stages[stageIndex];

        hole.mole = { type, poppedAt: performance.now() };
        hole.moleEl.textContent = type.emoji;
        hole.moleEl.className = "mole-hole__mole mole-hole__mole--" + type.kind + " mole-hole__mole--popped";

        hole.popTimer = setTimeout(() => {
            if (hole.mole) {
                // 놓침 → 그냥 사라짐 (페널티 없음)
                if (hole.mole.type.kind !== "bomb") {
                    // 좋은 두더지를 놓치면 콤보만 살짝 끊킴 (아니면 너무 빡빡)
                }
                clearHole(hole);
            }
        }, stage.popUpDurationMs);
    }

    function clearHole(hole) {
        if (hole.popTimer) { clearTimeout(hole.popTimer); hole.popTimer = null; }
        hole.mole = null;
        hole.moleEl.textContent = "";
        hole.moleEl.className = "mole-hole__mole";
    }

    function hitMole(hole) {
        const type = hole.mole.type;
        // 폭탄
        if (type.kind === "bomb") {
            combo = 0;
            score = Math.max(0, score + type.points);
            updateScoreDisplay();
            const r = hole.moleEl.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            showScoreFloat(cx, cy, `💥 ${type.points.toLocaleString()}`, "bad");
            emitParticles(cx, cy, 22, ["💥","🔥","💢"]);
            Audio.wrong();
            hole.moleEl.classList.add("mole-hole__mole--exploded");
            setTimeout(() => clearHole(hole), 500);
            return;
        }

        // 일반/황금/다이아/왕관 → 점수 + 콤보
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        const multIdx = Math.min(combo - 1, cfg.comboMultipliers.length - 1);
        const mult = cfg.comboMultipliers[multIdx];
        const gain = Math.floor(type.points * mult);
        score += gain;
        updateScoreDisplay();

        const r = hole.moleEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const label = mult > 1 ? `+${gain.toLocaleString()} (×${mult})` : `+${gain.toLocaleString()}`;
        const cls = ["crown","diamond"].includes(type.kind) ? "rainbow" :
                    (type.kind === "golden" ? "rainbow" : "good");
        showScoreFloat(cx, cy, label, cls);
        emitParticles(cx, cy,
            type.kind === "crown" ? 28 : (type.kind === "diamond" ? 20 : (type.kind === "golden" ? 14 : 8)),
            ["✨","⭐","🌟","💫","🎉"]);

        if (type.kind === "crown") Audio.levelUp && Audio.levelUp();
        else if (combo >= 3) Audio.bigCorrect(Math.min(8, combo));
        else Audio.correct();

        hole.moleEl.classList.add("mole-hole__mole--hit");
        setTimeout(() => clearHole(hole), 350);
    }

    let lastSpawnAt = 0;
    function tick(t) {
        if (inStage) {
            const stage = cfg.stages[stageIndex];
            const remain = Math.max(0, (stageEndsAt - t) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) { endStage(); rafId = requestAnimationFrame(tick); return; }

            // 동시에 popped 두더지 수 체크
            const active = holes.filter(h => h.mole).length;
            if (active < stage.simultaneous && t - lastSpawnAt > stage.popUpIntervalMs) {
                popMole();
                lastSpawnAt = t;
            }
        }
        rafId = requestAnimationFrame(tick);
    }

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        combo = 0;
        buildGrid();
        updateScoreDisplay();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            lastSpawnAt = performance.now() - stage.popUpIntervalMs;
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
        if (!inStage) return;
        inStage = false;
        holes.forEach(clearHole);
        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 1000);
        } else {
            setTimeout(() => startStage(stageIndex), 1400);
        }
    }

    function cleanup() {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (spawnTimer) clearInterval(spawnTimer);
        holes.forEach(h => { if (h.popTimer) clearTimeout(h.popTimer); });
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
            bestCombo: maxCombo,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "🔨 두더지를 잡아라! 콤보 ×10!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameMole")) {
        showTutorial("gameMole", startGame);
    } else {
        startGame();
    }
};
