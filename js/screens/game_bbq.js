/* ============================================================
   3단원 스텝 5: 송양초 BBQ 보너스 — 캠핑장 단일 화로
   - 화면 하단 중앙에 하나의 화로
   - 고기 한 마리씩 등장
   - 생→익는중→완벽(황금)→탐
   - SPACE 키로 완벽 타이밍에 서빙
   - 캠핑 분위기 (밤하늘, 별, 텐트) + 지글지글 사운드
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

    let currentMeat = null;    // { startedAt, state, meatType, isGolden, served }
    let perfectCombo = 0;
    let totalServed = 0;
    let spawnTimer = null;

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
            el("span", { text: "🏕️" }),
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

    // 캠핑 배경 (별, 달, 텐트, 나무)
    const sky = el("div", { class: "bbq-sky" },
        el("div", { class: "bbq-moon", text: "🌙" }),
        el("div", { class: "bbq-stars" },
            el("span", { class: "bbq-star s1", text: "✨" }),
            el("span", { class: "bbq-star s2", text: "⭐" }),
            el("span", { class: "bbq-star s3", text: "✨" }),
            el("span", { class: "bbq-star s4", text: "💫" }),
            el("span", { class: "bbq-star s5", text: "⭐" }),
            el("span", { class: "bbq-star s6", text: "✨" }),
        ),
    );
    screen.appendChild(sky);

    const camp = el("div", { class: "bbq-camp" },
        el("div", { class: "bbq-tent bbq-tent--left", text: "⛺" }),
        el("div", { class: "bbq-tree bbq-tree--left", text: "🌲" }),
        el("div", { class: "bbq-tree bbq-tree--right", text: "🌲" }),
        el("div", { class: "bbq-tent bbq-tent--right", text: "🏕️" }),
    );
    screen.appendChild(camp);

    // 화로 + 게이지 + 고기 자리
    const grill = el("div", { class: "bbq-grill" },
        el("div", { class: "bbq-grill__flames" },
            el("span", { class: "bbq-flame f1", text: "🔥" }),
            el("span", { class: "bbq-flame f2", text: "🔥" }),
            el("span", { class: "bbq-flame f3", text: "🔥" }),
        ),
    );
    const meatEl = el("div", { class: "bbq-grill__meat", text: "" });
    grill.appendChild(meatEl);
    const gauge = el("div", { class: "bbq-grill__gauge" },
        el("div", { class: "bbq-grill__gauge-fill" }),
        el("div", { class: "bbq-grill__gauge-perfect" }),
    );
    grill.appendChild(gauge);
    const grillBase = el("div", { class: "bbq-grill__base", text: "▰▰▰▰▰▰▰▰▰" });
    grill.appendChild(grillBase);
    screen.appendChild(grill);

    const gaugeFillEl = gauge.querySelector(".bbq-grill__gauge-fill");
    const perfectZoneEl = gauge.querySelector(".bbq-grill__gauge-perfect");

    const cards = makeShortcutCards([
        { combo: "SPACE", label: "서빙", icon: "🥢", active: true },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 지글지글~ 고기가 황금색일 때 SPACE! 너무 늦으면 타요 🔥" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        comboEl.textContent = perfectCombo;
        comboEl.style.color = perfectCombo >= 3 ? "#d63031" : "var(--text-dark)";
    }

    function renderPerfectZone() {
        const stage = cfg.stages[stageIndex];
        const totalMs = stage.burnAfterMs;
        const startPct = (stage.cookTimeMs / totalMs) * 100;
        const widthPct = (stage.perfectWindowMs / totalMs) * 100;
        perfectZoneEl.style.left = `${startPct}%`;
        perfectZoneEl.style.width = `${widthPct}%`;
    }

    function spawnMeat() {
        if (!inStage || finished) return;
        if (currentMeat) return;
        const meatType = cfg.meatTypes[Math.floor(Math.random() * cfg.meatTypes.length)];
        const isGolden = Math.random() < cfg.goldenChance;
        currentMeat = {
            startedAt: performance.now(),
            state: "raw",
            meatType,
            isGolden,
            served: false,
            burnt: false,
        };
        meatEl.textContent = isGolden ? "🥩" : meatType.emoji;
        meatEl.className = "bbq-grill__meat bbq-grill__meat--raw" + (isGolden ? " bbq-grill__meat--golden" : "");
        gaugeFillEl.style.width = "0%";
        // 지글지글 사운드 시작
        Audio.sizzleStart && Audio.sizzleStart(0.15);
    }

    function serveMeat() {
        if (!inStage || finished) return;
        if (!currentMeat || currentMeat.served || currentMeat.burnt) return;
        const stage = cfg.stages[stageIndex];
        const elapsed = performance.now() - currentMeat.startedAt;
        let gain = 0;
        let label = "";
        let cls = "good";
        let isPerfect = false;

        if (elapsed < stage.cookTimeMs * 0.5) {
            gain = cfg.points.raw;
            label = `🩸 생고기 +${gain}`;
            cls = "bad";
            perfectCombo = 0;
        } else if (elapsed < stage.cookTimeMs) {
            gain = cfg.points.cooking;
            label = `덜 익음 +${gain}`;
            cls = "good";
            perfectCombo = 0;
        } else if (elapsed < stage.cookTimeMs + stage.perfectWindowMs) {
            isPerfect = true;
            perfectCombo++;
            const comboMult = 1 + (perfectCombo - 1) * 0.5;
            gain = Math.floor(cfg.points.perfect * comboMult);
            if (currentMeat.isGolden) gain *= cfg.goldenMultiplier;
            gain += cfg.comboBonus * (perfectCombo - 1);
            label = currentMeat.isGolden ? `🌟 황금 완벽! +${gain.toLocaleString()}` : `🎉 완벽! +${gain.toLocaleString()}`;
            cls = "rainbow";
            Audio.perfectBell && Audio.perfectBell();
        } else {
            gain = cfg.points.cooking;
            label = `좀 익음 +${gain}`;
            cls = "good";
            perfectCombo = 0;
        }

        currentMeat.served = true;
        score += gain;
        totalServed++;
        updateScoreDisplay();

        const r = grill.getBoundingClientRect();
        showScoreFloat(r.left + r.width / 2, r.top - 10, label, cls);
        if (isPerfect) {
            emitParticles(r.left + r.width / 2, r.top + r.height / 2,
                currentMeat.isGolden ? 24 : 14, ["✨","⭐","🌟","💫","🎉","🎊"]);
            Audio.bigCorrect(currentMeat.isGolden ? 8 : 6);
        } else {
            Audio.correct();
        }

        // 지글지글 멈추고 곧 다음 고기
        Audio.sizzleStop && Audio.sizzleStop();
        clearGrill();
        scheduleNextSpawn();
    }

    function burnMeat() {
        if (!currentMeat || currentMeat.served || currentMeat.burnt) return;
        currentMeat.burnt = true;
        meatEl.textContent = "🌶️";
        meatEl.className = "bbq-grill__meat bbq-grill__meat--burnt";
        score = Math.max(0, score + cfg.points.burnt);
        perfectCombo = 0;
        updateScoreDisplay();
        const r = grill.getBoundingClientRect();
        showScoreFloat(r.left + r.width / 2, r.top - 10, `🔥 탔어 ${cfg.points.burnt}`, "bad");
        Audio.burnt && Audio.burnt();
        Audio.sizzleStop && Audio.sizzleStop();
        // 연기 이펙트
        spawnSmoke();
        // 잠시 후 정리
        setTimeout(() => {
            clearGrill();
            scheduleNextSpawn();
        }, 900);
    }

    function spawnSmoke() {
        const r = grill.getBoundingClientRect();
        for (let i = 0; i < 5; i++) {
            const puff = el("div", { class: "bbq-smoke", text: "💨" });
            puff.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * 40}px`;
            puff.style.top = `${r.top + 10}px`;
            puff.style.animationDelay = `${i * 0.1}s`;
            document.body.appendChild(puff);
            setTimeout(() => puff.remove(), 1500);
        }
    }

    function clearGrill() {
        currentMeat = null;
        meatEl.textContent = "";
        meatEl.className = "bbq-grill__meat";
        gaugeFillEl.style.width = "0%";
    }

    function scheduleNextSpawn() {
        if (spawnTimer) clearTimeout(spawnTimer);
        const stage = cfg.stages[stageIndex];
        spawnTimer = setTimeout(() => {
            if (inStage && !finished) spawnMeat();
        }, stage.spawnDelayMs);
    }

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
            if (currentMeat && !currentMeat.served && !currentMeat.burnt) {
                const elapsed = now - currentMeat.startedAt;
                const ratio = Math.min(1, elapsed / stage.burnAfterMs);
                gaugeFillEl.style.width = `${ratio * 100}%`;

                if (elapsed >= stage.burnAfterMs) {
                    burnMeat();
                } else {
                    // 상태 변화
                    let newState = currentMeat.state;
                    if (elapsed < stage.cookTimeMs * 0.5) newState = "raw";
                    else if (elapsed < stage.cookTimeMs) newState = "cooking";
                    else if (elapsed < stage.cookTimeMs + stage.perfectWindowMs) newState = "perfect";
                    else newState = "overcook";
                    if (newState !== currentMeat.state) {
                        currentMeat.state = newState;
                        meatEl.className = "bbq-grill__meat bbq-grill__meat--" + newState
                            + (currentMeat.isGolden ? " bbq-grill__meat--golden" : "");
                        if (newState === "perfect") meatEl.textContent = "🥓";
                    }
                }
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
        perfectCombo = 0;
        clearGrill();
        renderPerfectZone();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            spawnMeat();
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
        Audio.sizzleStop && Audio.sizzleStop();
        if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
        clearGrill();
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
        if (spawnTimer) clearTimeout(spawnTimer);
        Audio.sizzleStop && Audio.sizzleStop();
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
        if (e.code === "Space" || e.key === " ") {
            e.preventDefault();
            cards.flash("SPACE");
            serveMeat();
        }
    }
    document.addEventListener("keydown", keyHandler);

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "지글지글~ 완벽한 순간에 SPACE!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameBbq")) {
        showTutorial("gameBbq", startGame);
    } else {
        startGame();
    }
};
