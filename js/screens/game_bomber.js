/* ============================================================
   4단원 스텝 4: 별 폭격기 (클릭 콤보 게임)
   - 화면을 가로지르는 별/보석/폭탄
   - 빠르게 클릭 → 콤보 ↑ → 점수 ×배수
   - 폭탄(💣) 클릭 = 페널티 + 콤보 끊김
   - 3단계 진행 (점점 빨라짐)
   ============================================================ */

SCREEN_RENDERERS.gameBomber = function (root, params) {
    const screen = el("div", { class: "screen game game--bomber game--unit4" });
    const cfg = BOMBER_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let lastTickAt = 0;
    let spawnTimer = null;

    let items = [];      // { el, x, y, vx, vy, type, alive }
    let combo = 0;
    let lastHitAt = 0;
    let maxCombo = 0;

    // HUD
    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
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
            el("span", { text: "🎯" }),
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

    // 플레이 영역
    const playArea = el("div", { class: "bomber-area" });
    screen.appendChild(playArea);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 별·보석을 빠르게 클릭! 연속 클릭 = 콤보 ×배수! 💣 폭탄은 절대 NO!" });
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

    function spawnItem() {
        if (!inStage || finished) return;
        const stage = cfg.stages[stageIndex];
        const type = weightedPick(cfg.itemTypes);

        const areaH = playArea.clientHeight;
        const areaW = playArea.clientWidth;
        // 좌측에서 우측으로 또는 우측에서 좌측으로 (랜덤)
        const fromLeft = Math.random() < 0.5;
        const startX = fromLeft ? -60 : areaW + 60;
        const y = 40 + Math.random() * (areaH - 100);
        const vx = (fromLeft ? 1 : -1) * stage.itemSpeed;
        // 약간의 상하 곡선
        const vy = (Math.random() - 0.5) * 30;

        const itemEl = el("div", { class: "bomber-item bomber-item--" + type.kind, text: type.emoji });
        itemEl.style.left = `${startX}px`;
        itemEl.style.top = `${y}px`;
        playArea.appendChild(itemEl);

        const item = { el: itemEl, x: startX, y, vx, vy, type, alive: true };
        itemEl.addEventListener("pointerdown", (e) => {
            if (!inStage || finished || !item.alive) return;
            e.preventDefault();
            e.stopPropagation();
            hitItem(item);
        });
        items.push(item);
    }

    function hitItem(item) {
        item.alive = false;
        const now = performance.now();
        const stage = cfg.stages[stageIndex];

        // 폭탄: 콤보 끊김 + 페널티
        if (item.type.kind === "bomb") {
            combo = 0;
            score = Math.max(0, score + item.type.points);
            updateScoreDisplay();
            const r = item.el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            showScoreFloat(cx, cy, `💥 ${item.type.points}`, "bad");
            emitParticles(cx, cy, 18, ["💥","🔥","💢"]);
            Audio.wrong();
            item.el.classList.add("bomber-item--exploded");
            setTimeout(() => item.el.remove(), 400);
            return;
        }

        // 콤보 체크
        if (now - lastHitAt <= stage.comboWindowMs) {
            combo++;
        } else {
            combo = 1;
        }
        lastHitAt = now;
        if (combo > maxCombo) maxCombo = combo;

        const multIdx = Math.min(combo - 1, cfg.comboMultipliers.length - 1);
        const mult = cfg.comboMultipliers[multIdx];
        const gain = Math.floor(item.type.points * mult);
        score += gain;
        updateScoreDisplay();

        const r = item.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const label = mult > 1 ? `+${gain.toLocaleString()} (×${mult})` : `+${gain.toLocaleString()}`;
        const cls = item.type.kind === "diamond" ? "rainbow" : (item.type.kind === "gold" ? "rainbow" : "good");
        showScoreFloat(cx, cy, label, cls);
        emitParticles(cx, cy,
            item.type.kind === "diamond" ? 22 : (item.type.kind === "gold" ? 14 : 6),
            ["✨","⭐","🌟","💫","🎉"]);

        if (combo >= 3) Audio.bigCorrect(Math.min(8, combo));
        else Audio.correct();

        item.el.classList.add("bomber-item--hit");
        setTimeout(() => item.el.remove(), 300);

        // 콤보 화면 효과
        if (combo >= 5) {
            playArea.classList.remove("bomber-area--combo");
            void playArea.offsetWidth;
            playArea.classList.add("bomber-area--combo");
        }
    }

    function tick(t) {
        const dt = Math.min(50, t - (lastTickAt || t)) / 1000;
        lastTickAt = t;

        if (inStage) {
            const remain = Math.max(0, (stageEndsAt - t) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) endStage();
        }

        // 콤보 시간 초과 시 0으로 리셋
        if (combo > 0 && performance.now() - lastHitAt > cfg.stages[stageIndex].comboWindowMs * 1.5) {
            combo = 0;
            updateScoreDisplay();
        }

        // 아이템 이동
        const areaW = playArea.clientWidth;
        const areaH = playArea.clientHeight;
        items = items.filter(item => {
            if (!item.alive) return false;
            item.x += item.vx * dt;
            item.y += item.vy * dt;
            item.el.style.left = `${item.x}px`;
            item.el.style.top = `${item.y}px`;
            // 화면 이탈
            if (item.x < -80 || item.x > areaW + 80 || item.y > areaH + 40) {
                item.el.remove();
                return false;
            }
            return true;
        });

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
        updateScoreDisplay();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            spawnItem();
            spawnTimer = setInterval(spawnItem, stage.spawnIntervalMs);
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
        if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
        items.forEach(i => i.el.remove());
        items = [];
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
        showIntroInstruction(screen, "⭐ 빠르게 클릭! 콤보 ×10!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameBomber")) {
        showTutorial("gameBomber", startGame);
    } else {
        startGame();
    }
};
