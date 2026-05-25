/* ============================================================
   2단원: 마우스 마스터
   풍선(클릭), 상자(더블클릭), 별(드래그) — 라운드마다 다른 조합
   ============================================================ */

SCREEN_RENDERERS.game2 = function (root, params) {
    const screen = el("div", { class: "screen game" });
    const cfg = MOUSE_GAME_CONFIG;

    let roundIndex = 0;
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let combo = 0;
    let bestCombo = 0;
    let targets = [];                 // { el, type, action, isDragging, lifetimeTimer }
    let spawnTimer = null;
    let roundTimer = null;
    let roundEndsAt = 0;
    let inRound = false;
    let rafId = null;

    // ----- HUD -----
    const goalScore = (LESSONS.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const roundEl = el("span", { text: `1 / ${cfg.rounds.length}` });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);
    const timerEl = el("span", { class: "hud-chip__big", text: "15.0", style: { color: "var(--secondary-dark)" } });
    const exitBtn = el("button", {
        class: "btn btn--ghost",
        text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => { cleanup(); navigate("home"); } },
    });

    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" },
            el("span", { text: "🎯" }),
            el("span", { class: "stat-chip__label", text: "라운드" }),
            roundEl,
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

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + score);
    }

    // ----- 게임 영역 -----
    const playArea = el("div", {
        style: {
            position: "absolute",
            inset: "0",
            overflow: "hidden",
        },
    });
    screen.appendChild(playArea);

    // ----- 플레이어 캐릭터 -----
    const playerChar = el("div", {
        class: "player-character",
        text: getCurrentEmoji(),
    });
    screen.appendChild(playerChar);

    let promptBanner = null;
    let comboBadge = null;

    function showPrompt(text) {
        if (promptBanner) promptBanner.remove();
        promptBanner = el("div", { class: "prompt-banner" },
            el("span", { text }),
        );
        screen.appendChild(promptBanner);
    }

    function showCombo() {
        if (combo < 2) {
            if (comboBadge) { comboBadge.remove(); comboBadge = null; }
            return;
        }
        if (comboBadge) comboBadge.remove();
        comboBadge = el("div", { class: "combo-badge", text: `🔥 ${combo} 콤보!` });
        screen.appendChild(comboBadge);
    }

    function addScore(gain, x, y) {
        score += gain;
        updateScoreDisplay();
        const pf = el("div", {
            class: "points-float",
            text: `+${gain}`,
            style: { left: `${x}px`, top: `${y}px` },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1100);
        emitParticles(x, y, 6, ["✨", "⭐", "🌟", "💫"]);
    }

    function showMiss(x, y) {
        const mf = el("div", {
            class: "miss-float",
            text: "❌",
            style: { left: `${x}px`, top: `${y}px` },
        });
        fxLayer.appendChild(mf);
        setTimeout(() => mf.remove(), 900);
    }

    function spawnTarget(round) {
        if (!inRound) return;
        const type = round.types[Math.floor(Math.random() * round.types.length)];
        const info = MOUSE_TARGETS[type];

        const areaWidth = screen.clientWidth;
        const areaHeight = screen.clientHeight - 200;  // hud + basket 공간 확보

        const x = 80 + Math.random() * (areaWidth - 160);
        const y = 140 + Math.random() * (areaHeight - 200);

        const wrapper = el("div", {
            style: {
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                userSelect: "none",
                touchAction: "none",
                animation: "target-in 0.3s ease-out",
            },
        });
        const emojiEl = el("div", {
            style: { fontSize: "64px", lineHeight: "1", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" },
            text: info.emoji,
        });
        const hintEl = el("div", {
            style: {
                fontSize: "13px",
                color: "white",
                background: "rgba(0,0,0,0.55)",
                padding: "3px 10px",
                borderRadius: "999px",
                whiteSpace: "nowrap",
            },
            text: `${info.hint} ${info.label}`,
        });
        wrapper.appendChild(emojiEl);
        wrapper.appendChild(hintEl);

        const target = {
            el: wrapper,
            type,
            action: info.action,
            points: info.points,
            x, y,
            handled: false,
            isDragging: false,
            lifetimeTimer: null,
        };

        bindTargetEvents(target);
        targets.push(target);
        playArea.appendChild(wrapper);

        // 일정 시간 후 자동 사라짐
        target.lifetimeTimer = setTimeout(() => {
            if (target.handled) return;
            target.handled = true;
            wrapper.style.transition = "opacity 0.3s, transform 0.3s";
            wrapper.style.opacity = "0";
            wrapper.style.transform += " scale(0.6)";
            setTimeout(() => wrapper.remove(), 300);
            targets = targets.filter(t => t !== target);
            // 정답 액션을 놓침 → 콤보 끊김
            combo = 0;
            showCombo();
        }, cfg.targetLifetime);
    }

    function bindTargetEvents(target) {
        const wrapper = target.el;

        if (target.action === "click") {
            wrapper.addEventListener("click", (ev) => handleHit(target, ev));
        } else if (target.action === "dblclick") {
            // 단일 클릭은 무시 (더블클릭만 정답으로 인정)
            wrapper.addEventListener("click", () => {});
            wrapper.addEventListener("dblclick", (ev) => handleHit(target, ev));
        }
    }

    function handleHit(target, ev) {
        if (target.handled) return;
        target.handled = true;
        clearTimeout(target.lifetimeTimer);

        const x = ev.clientX || target.x;
        const y = ev.clientY || target.y;

        target.el.style.animation = "word-correct 0.45s forwards";
        setTimeout(() => target.el.remove(), 450);
        targets = targets.filter(t => t !== target);

        combo++;
        bestCombo = Math.max(bestCombo, combo);
        const comboBonus = Math.min(combo - 1, 10) * 30;
        const gain = target.points + comboBonus;
        addScore(gain, x, y);
        showCombo();

        if (combo >= 3) Audio.bigCorrect(Math.min(combo, 8));
        else Audio.correct();
    }

    // 빈 공간 클릭 = 오답
    playArea.addEventListener("click", (ev) => {
        if (!inRound) return;
        // 타겟 위 클릭은 별도 핸들러로 처리됨, 이건 빈 공간
        if (ev.target !== playArea) return;
        score = Math.max(0, score - cfg.wrongPenalty);
        updateScoreDisplay();
        combo = 0;
        showCombo();
        Audio.wrong();
        showMiss(ev.clientX, ev.clientY);
    });

    function startRound() {
        const round = cfg.rounds[roundIndex];
        roundEl.textContent = `${roundIndex + 1} / ${cfg.rounds.length}`;
        showPrompt(round.label);
        Audio.roundStart();

        setTimeout(() => {
            inRound = true;
            roundEndsAt = performance.now() + cfg.roundDuration;
            spawnTarget(round);
            spawnTimer = setInterval(() => spawnTarget(round), cfg.spawnIntervalMs);
            roundTimer = setTimeout(endRound, cfg.roundDuration);
        }, 800);
    }

    function endRound() {
        if (!inRound) return;
        inRound = false;
        clearInterval(spawnTimer);
        clearTimeout(roundTimer);
        spawnTimer = null;
        roundTimer = null;

        // 남은 타겟 정리
        targets.forEach(t => {
            clearTimeout(t.lifetimeTimer);
            t.el.style.transition = "opacity 0.3s, transform 0.3s";
            t.el.style.opacity = "0";
            t.el.style.transform += " scale(0.6)";
            setTimeout(() => t.el.remove(), 320);
        });
        targets = [];

        if (promptBanner) {
            promptBanner.style.opacity = "0";
            setTimeout(() => promptBanner && promptBanner.remove(), 320);
        }
        if (comboBadge) {
            comboBadge.style.opacity = "0";
            setTimeout(() => comboBadge && comboBadge.remove(), 320);
            comboBadge = null;
        }
        combo = 0;

        roundIndex++;
        if (roundIndex >= cfg.rounds.length) {
            setTimeout(finishGame, 800);
        } else {
            setTimeout(startRound, 1100);
        }
    }

    function tick(t) {
        if (inRound) {
            const remain = Math.max(0, (roundEndsAt - t) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 1 ? "#d63031" : "var(--secondary-dark)";
        }
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        if (spawnTimer) clearInterval(spawnTimer);
        if (roundTimer) clearTimeout(roundTimer);
        targets.forEach(t => clearTimeout(t.lifetimeTimer));
        rafId = spawnTimer = roundTimer = null;
        inRound = false;
    }

    function finishGame() {
        cleanup();
        Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score, bestCombo,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    function runCountdown(numbers, idx, cb) {
        if (idx >= numbers.length) { cb(); return; }
        const cd = el("div", { class: "countdown", text: numbers[idx] });
        screen.appendChild(cd);
        if (idx < numbers.length - 1) Audio.tick();
        else Audio.tickGo();
        setTimeout(() => { cd.remove(); runCountdown(numbers, idx + 1, cb); }, 800);
    }

    root.appendChild(screen);
    showCarryOverBanner(startingScore);
    updateScoreDisplay();
    runCountdown(["3", "2", "1", "출발!"], 0, () => {
        startRound();
        rafId = requestAnimationFrame(tick);
    });
};
