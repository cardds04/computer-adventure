/* ============================================================
   4단원 스텝 1: 인터넷 켜기
   가짜 바탕화면에 여러 아이콘. 브라우저(🌐 등)만 더블클릭 → 정답.
   다른 앱 더블클릭 → 페널티.
   ============================================================ */

SCREEN_RENDERERS.gameInternet = function (root, params) {
    const screen = el("div", { class: "screen game game--internet game--unit4" });
    const cfg = INTERNET_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let correctClicks = 0;

    // HUD
    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
    const timerEl = el("span", { class: "hud-chip__big", text: "10.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "🌐" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
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

    // 미션 안내
    const mission = el("div", { class: "internet-mission", text: "🌐 인터넷을 열어주세요!" });
    screen.appendChild(mission);

    // 가짜 바탕화면
    const desktop = el("div", { class: "fake-desktop internet-desktop" });
    screen.appendChild(desktop);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 브라우저 아이콘(🌐 🦊 🐳)을 더블클릭하면 인터넷이 켜져요!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function buildStage() {
        desktop.innerHTML = "";
        correctClicks = 0;
        const stage = cfg.stages[stageIndex];

        // 브라우저 1개 + 나머지 distractor
        const browser = cfg.browserApps[Math.floor(Math.random() * cfg.browserApps.length)];
        const distractors = shuffle(cfg.distractorApps).slice(0, stage.iconCount - 1);
        const items = shuffle([browser, ...distractors]);

        items.forEach(item => {
            const isBrowser = cfg.browserApps.includes(item);
            const iconEl = el("div", { class: "fd-icon" + (isBrowser ? " desktop-icon--browser" : "") },
                el("div", { class: "fd-icon__emoji", text: item.emoji }),
                el("div", { class: "fd-icon__label", text: item.name }),
            );
            // 더블클릭 = 정답 시도
            iconEl.addEventListener("dblclick", () => {
                if (!inStage || finished) return;
                if (isBrowser) {
                    handleCorrect(iconEl);
                } else {
                    handleWrong(iconEl);
                }
            });
            // 단일 클릭은 선택만
            iconEl.addEventListener("click", () => {
                if (!inStage || finished) return;
                desktop.querySelectorAll(".fd-icon--selected").forEach(el => el.classList.remove("fd-icon--selected"));
                iconEl.classList.add("fd-icon--selected");
            });
            desktop.appendChild(iconEl);
        });
    }

    function handleCorrect(iconEl) {
        const stage = cfg.stages[stageIndex];
        score += stage.pointsPerCorrect;
        correctClicks++;
        updateScoreDisplay();
        iconEl.classList.add("fd-icon--correct-fixed");
        Audio.bigCorrect(4);

        const r = iconEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        showScoreFloat(cx, cy, `+${stage.pointsPerCorrect}`, "good");
        emitParticles(cx, cy, 12, ["✨","⭐","🌟","🌐"]);

        // 가짜 브라우저 잠깐 등장
        showFakeBrowserPopup();

        setTimeout(() => {
            if (inStage && !finished) buildStage();   // 새 배치로 다음 라운드
        }, 1100);
    }

    function handleWrong(iconEl) {
        const stage = cfg.stages[stageIndex];
        score = Math.max(0, score - stage.wrongPenalty);
        updateScoreDisplay();
        iconEl.classList.add("fd-icon--wrong");
        setTimeout(() => iconEl.classList.remove("fd-icon--wrong"), 500);
        Audio.wrong();
        const r = iconEl.getBoundingClientRect();
        showScoreFloat(r.left + r.width / 2, r.top, `❌ -${stage.wrongPenalty}`, "bad");
    }

    function showFakeBrowserPopup() {
        const popup = el("div", { class: "fake-browser-popup" },
            el("div", { class: "fake-browser-popup__bar" },
                el("span", { text: "🌐" }),
                el("span", { text: "  새 탭" }),
                el("span", { style: { marginLeft: "auto" }, text: "─ ☐ ✕" }),
            ),
            el("div", { class: "fake-browser-popup__body", text: "✨ 인터넷이 켜졌어요!" }),
        );
        screen.appendChild(popup);
        setTimeout(() => popup.remove(), 900);
    }

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        buildStage();

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
        if (!inStage) return;
        inStage = false;
        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 1000);
        } else {
            setTimeout(() => startStage(stageIndex), 1400);
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
            bestCombo: correctClicks,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "🌐 브라우저 아이콘을 더블클릭!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameInternet")) {
        showTutorial("gameInternet", startGame);
    } else {
        startGame();
    }
};
