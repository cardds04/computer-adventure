/* ============================================================
   3단원 스텝 5: 송양초 BBQ 보너스 게임
   3~4개 그릴, 고기가 생→익는중→완벽→탐. 키 1·2·3·4로 완벽 타이밍 잡기
   ============================================================ */

SCREEN_RENDERERS.gameBbq = function (root, params) {
    const screen = el("div", { class: "screen game game--bbq game--unit3" });
    const cfg = BBQ_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;

    let spots = [];        // [{ el, meatEl, gaugeEl, state, meat }]
    let perfectCombo = 0;
    let totalServed = 0;

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
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
            el("span", { text: "🥩" }),
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

    // 그릴 영역
    const grillArea = el("div", { class: "bbq-area" });
    const grillRow = el("div", { class: "bbq-row" });
    grillArea.appendChild(grillRow);
    screen.appendChild(grillArea);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 고기가 황금색(🥓)일 때 자리 숫자키(1·2·3·4) 누르세요! 너무 늦으면 탐!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        comboEl.textContent = perfectCombo;
        comboEl.style.color = perfectCombo >= 3 ? "#d63031" : "var(--text-dark)";
    }

    // ----- 그릴 자리 만들기 -----
    function buildGrill() {
        grillRow.innerHTML = "";
        spots = [];
        const stage = cfg.stages[stageIndex];
        for (let i = 0; i < stage.grillSpots; i++) {
            const spot = el("div", { class: "bbq-spot" });
            const flame = el("div", { class: "bbq-spot__flame", text: "🔥" });
            const meatEl = el("div", { class: "bbq-spot__meat", text: "" });
            const gauge = el("div", { class: "bbq-spot__gauge" },
                el("div", { class: "bbq-spot__gauge-fill" }),
                el("div", { class: "bbq-spot__gauge-perfect" }),
            );
            const keyHint = el("div", { class: "bbq-spot__key", text: `${i + 1}` });
            spot.appendChild(flame);
            spot.appendChild(meatEl);
            spot.appendChild(gauge);
            spot.appendChild(keyHint);
            grillRow.appendChild(spot);
            spots.push({
                el: spot,
                meatEl,
                gaugeEl: gauge.querySelector(".bbq-spot__gauge-fill"),
                perfectZoneEl: gauge.querySelector(".bbq-spot__gauge-perfect"),
                state: "empty",
                meat: null,
                startedAt: 0,
                isGolden: false,
            });
        }
        renderPerfectZone();
    }

    function renderPerfectZone() {
        // 완벽 윈도우의 위치 표시: cookTimeMs ~ cookTimeMs+perfectWindowMs
        const stage = cfg.stages[stageIndex];
        const totalMs = stage.burnAfterMs;
        const startPct = (stage.cookTimeMs / totalMs) * 100;
        const widthPct = (stage.perfectWindowMs / totalMs) * 100;
        spots.forEach(s => {
            s.perfectZoneEl.style.left = `${startPct}%`;
            s.perfectZoneEl.style.width = `${widthPct}%`;
        });
    }

    // ----- 고기 스폰 -----
    function spawnMeat(spot) {
        if (spot.state !== "empty") return;
        const stage = cfg.stages[stageIndex];
        const meatType = cfg.meatTypes[Math.floor(Math.random() * cfg.meatTypes.length)];
        const isGolden = Math.random() < cfg.goldenChance;
        spot.meat = meatType;
        spot.isGolden = isGolden;
        spot.state = "raw";
        spot.startedAt = performance.now();
        spot.meatEl.textContent = isGolden ? "🥩" : meatType.emoji;
        spot.meatEl.className = "bbq-spot__meat bbq-spot__meat--raw" + (isGolden ? " bbq-spot__meat--golden" : "");
        spot.el.classList.add("bbq-spot--has-meat");
        spot.gaugeEl.style.width = "0%";
    }

    // ----- 키 누름 = 고기 제출 -----
    function serveMeat(spotIdx) {
        if (!inStage || finished) return;
        const spot = spots[spotIdx];
        if (!spot || spot.state === "empty" || spot.state === "burnt") return;

        const stage = cfg.stages[stageIndex];
        const elapsed = performance.now() - spot.startedAt;
        let gain = 0;
        let isPerfect = false;
        let label = "";
        let cls = "good";

        if (elapsed < stage.cookTimeMs * 0.5) {
            gain = cfg.points.raw;
            label = `생고기 +${gain}`;
            cls = "bad";
            perfectCombo = 0;
        } else if (elapsed < stage.cookTimeMs) {
            gain = cfg.points.cooking;
            label = `+${gain}`;
            cls = "good";
            perfectCombo = 0;
        } else if (elapsed < stage.cookTimeMs + stage.perfectWindowMs) {
            // 완벽!
            isPerfect = true;
            perfectCombo++;
            const comboMult = 1 + (perfectCombo - 1) * 0.5;
            gain = Math.floor(cfg.points.perfect * comboMult);
            if (spot.isGolden) gain *= cfg.goldenMultiplier;
            gain += cfg.comboBonus * (perfectCombo - 1);
            label = spot.isGolden ? `🌟 황금 완벽! +${gain.toLocaleString()}` : `🎉 완벽! +${gain.toLocaleString()}`;
            cls = "rainbow";
        } else {
            // 너무 늦었지만 아직 안 탐 → 약한 점수
            gain = cfg.points.cooking;
            label = `좀 익음 +${gain}`;
            cls = "good";
            perfectCombo = 0;
        }

        score += gain;
        totalServed++;
        updateScoreDisplay();

        const r = spot.el.getBoundingClientRect();
        showScoreFloat(r.left + r.width / 2, r.top + 20, label, cls);
        if (isPerfect) {
            emitParticles(r.left + r.width / 2, r.top + r.height / 2,
                spot.isGolden ? 20 : 12, ["✨","⭐","🌟","💫","🎉","🎊"]);
            Audio.bigCorrect(spot.isGolden ? 8 : 6);
        } else {
            Audio.correct();
        }

        // 자리 비우기
        clearSpot(spot);
    }

    function clearSpot(spot) {
        spot.state = "empty";
        spot.meat = null;
        spot.isGolden = false;
        spot.meatEl.textContent = "";
        spot.meatEl.className = "bbq-spot__meat";
        spot.el.classList.remove("bbq-spot--has-meat");
        spot.gaugeEl.style.width = "0%";
    }

    function burnMeat(spot) {
        spot.state = "burnt";
        spot.meatEl.textContent = "🌶️";
        spot.meatEl.className = "bbq-spot__meat bbq-spot__meat--burnt";
        score = Math.max(0, score + cfg.points.burnt);
        perfectCombo = 0;
        updateScoreDisplay();
        const r = spot.el.getBoundingClientRect();
        showScoreFloat(r.left + r.width / 2, r.top + 20, `🔥 탔어 ${cfg.points.burnt}`, "bad");
        Audio.wrong();
        // 잠시 후 정리
        setTimeout(() => clearSpot(spot), 800);
    }

    // ----- 루프 -----
    let lastSpawnAt = 0;
    function tick() {
        if (finished) { rafId = requestAnimationFrame(tick); return; }
        const now = performance.now();
        if (inStage) {
            const stage = cfg.stages[stageIndex];
            const remain = Math.max(0, (stageEndsAt - now) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) {
                endStage();
                rafId = requestAnimationFrame(tick);
                return;
            }

            // 빈 자리에 고기 스폰
            if (now - lastSpawnAt > stage.spawnIntervalMs) {
                const emptySpots = spots.filter(s => s.state === "empty");
                if (emptySpots.length > 0) {
                    const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
                    spawnMeat(spot);
                    lastSpawnAt = now;
                }
            }

            // 각 자리 상태 업데이트
            spots.forEach(spot => {
                if (spot.state === "empty" || spot.state === "burnt") return;
                const elapsed = now - spot.startedAt;
                const ratio = Math.min(1, elapsed / stage.burnAfterMs);
                spot.gaugeEl.style.width = `${ratio * 100}%`;

                if (elapsed >= stage.burnAfterMs) {
                    burnMeat(spot);
                    return;
                }
                // 상태 변화
                let newState = spot.state;
                if (elapsed < stage.cookTimeMs * 0.5) newState = "raw";
                else if (elapsed < stage.cookTimeMs) newState = "cooking";
                else if (elapsed < stage.cookTimeMs + stage.perfectWindowMs) newState = "perfect";
                else newState = "overcook";
                if (newState !== spot.state) {
                    spot.state = newState;
                    spot.meatEl.className = "bbq-spot__meat bbq-spot__meat--" + newState
                        + (spot.isGolden ? " bbq-spot__meat--golden" : "");
                    if (newState === "perfect") {
                        spot.meatEl.textContent = spot.isGolden ? "🥓" : "🥓";
                    }
                }
            });
        }
        rafId = requestAnimationFrame(tick);
    }

    // ----- 스테이지 -----
    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        perfectCombo = 0;
        buildGrill();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            lastSpawnAt = performance.now() - stage.spawnIntervalMs;
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
        spots.forEach(clearSpot);
        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 1000);
        } else {
            setTimeout(() => startStage(stageIndex), 1300);
        }
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
            bestCombo: totalServed,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    function keyHandler(e) {
        if (!inStage || finished) return;
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
            const idx = num - 1;
            if (idx < spots.length) {
                e.preventDefault();
                serveMeat(idx);
            }
        }
    }
    document.addEventListener("keydown", keyHandler);

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "고기 완벽 굽기! 숫자키 1·2·3·4 로 타이밍 잡기!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameBbq")) {
        showTutorial("gameBbq", startGame);
    } else {
        startGame();
    }
};
