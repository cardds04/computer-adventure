/* ============================================================
   2단원 스텝 2: 캥거루 점프
   캐릭터가 자동으로 달리고 스페이스바로 점프해서 장애물 회피 + 과일 수집.
   2단계로 구성, 2단계가 더 빠름.
   ============================================================ */

SCREEN_RENDERERS.gameJump = function (root, params) {
    const screen = el("div", { class: "screen game game--jump" });
    const cfg = JUMP_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let playerYOffset = 0;     // 바닥 기준 위쪽 픽셀 (양수)
    let velocityY = 0;
    let isGrounded = true;
    let lastTickAt = 0;
    let spawnTimer = null;
    let rafId = null;
    let objects = [];          // { el, x, y, type, value, multiplier, heightLevel }
    let isJumpKeyHeld = false;
    let jumpStartTime = 0;

    // ----- HUD -----
    const goalScore = LESSONS_UNIT2.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
    const timerEl = el("span", { class: "hud-chip__big", text: "30.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "🏃" }),
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

    // ----- 안내 배너 -----
    const helpBanner = el("div", {
        class: "prompt-banner",
        style: { top: "90px", fontSize: "20px" },
        html: `<span class="prompt-banner__hint">SPACE 키를 눌러 점프!</span><span>🦘 장애물 피하고 과일 먹기</span>`,
    });
    screen.appendChild(helpBanner);
    setTimeout(() => {
        helpBanner.style.transition = "opacity 0.5s, transform 0.5s";
        helpBanner.style.opacity = "0";
        helpBanner.style.transform = "translateX(-50%) translateY(-20px)";
        setTimeout(() => helpBanner.remove(), 520);
    }, 3500);

    // ----- 게임 영역 -----
    const playArea = el("div", { class: "jump-play-area" });
    screen.appendChild(playArea);

    // 하늘 (구름)
    for (let i = 0; i < 3; i++) {
        const cloud = el("div", {
            class: "jump-cloud",
            text: "☁️",
            style: {
                left: `${i * 30 + Math.random() * 20}%`,
                top: `${10 + Math.random() * 25}%`,
                fontSize: `${30 + Math.random() * 20}px`,
                animationDelay: `${i * -8}s`,
            },
        });
        playArea.appendChild(cloud);
    }

    // 바닥
    const ground = el("div", { class: "jump-ground" });
    playArea.appendChild(ground);

    // 플레이어 (캥거루)
    const playerEl = el("div", { class: "jump-player", text: "🦘" });
    playArea.appendChild(playerEl);

    // ----- 점수 표시 갱신 -----
    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function showFloat(x, y, text, kind) {
        const cls = "jump-float jump-float--" + (kind || "good");
        const f = el("div", { class: cls, text });
        f.style.left = `${x}px`;
        f.style.top = `${y}px`;
        playArea.appendChild(f);
        setTimeout(() => f.remove(), 1100);
    }

    // ----- 가중치 추첨 헬퍼 -----
    function weightedPick(values, weights) {
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < values.length; i++) {
            r -= weights[i];
            if (r <= 0) return values[i];
        }
        return values[values.length - 1];
    }

    // ----- 오브젝트 스폰 -----
    function spawnObject(stage) {
        if (!inStage || finished) return;

        const areaW = playArea.clientWidth;
        const areaH = playArea.clientHeight;
        const groundY = areaH * cfg.groundRatio;

        const isBonus = Math.random() < cfg.bonusChance;
        let type, emoji, value = 0, multiplier = 0, heightLevel;
        if (isBonus) {
            type = "bonus";
            emoji = cfg.bonusFruit.emoji;
            multiplier = weightedPick(cfg.bonusFruit.multipliers, cfg.bonusFruit.weights);
            heightLevel = ["mid", "high"][Math.floor(Math.random() * 2)];
        } else if (Math.random() < cfg.obstacleProbability) {
            type = "obstacle";
            emoji = cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
            heightLevel = "ground";
        } else {
            type = "fruit";
            const f = cfg.fruits[Math.floor(Math.random() * cfg.fruits.length)];
            emoji = f.emoji;
            value = f.value;
            heightLevel = f.height;
        }

        let y = groundY - 40;
        if (heightLevel === "mid")  y = groundY - 120;
        if (heightLevel === "high") y = groundY - 200;

        const objEl = el("div", {
            class: `jump-obj jump-obj--${type}`,
        });
        const emojiSpan = el("span", { class: "jump-obj__emoji", text: emoji });
        objEl.appendChild(emojiSpan);

        if (type === "fruit") {
            objEl.appendChild(el("div", { class: "jump-obj__value", text: `+${value}` }));
        } else if (type === "bonus") {
            objEl.appendChild(el("div", { class: "jump-obj__multi", text: `×${multiplier}` }));
        }

        objEl.style.left = `${areaW + 30}px`;
        objEl.style.top = `${y}px`;
        playArea.appendChild(objEl);

        objects.push({
            el: objEl,
            x: areaW + 30,
            y,
            type, value, multiplier,
            heightLevel,
            hit: false,
        });
    }

    // ----- 점프 (스페이스 누르는 시간만큼 높이 증가) -----
    function jumpStart() {
        if (!inStage || finished || !isGrounded) return;
        velocityY = cfg.initialJumpVelocity;
        isGrounded = false;
        isJumpKeyHeld = true;
        jumpStartTime = performance.now();
        Audio.tickGo();
        playerEl.classList.add("jumping");
        setTimeout(() => playerEl.classList.remove("jumping"), 300);
    }

    function jumpRelease() {
        isJumpKeyHeld = false;
    }

    // ----- 충돌 처리 -----
    function handleHit(obj) {
        if (obj.hit) return;
        obj.hit = true;

        const rect = obj.el.getBoundingClientRect();
        const paRect = playArea.getBoundingClientRect();
        const fx = rect.left + rect.width / 2 - paRect.left;
        const fy = rect.top - paRect.top;

        if (obj.type === "fruit") {
            score += obj.value;
            updateScoreDisplay();
            Audio.correct();
            showFloat(fx, fy, `+${obj.value}`, "good");
            emitParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 6, ["✨", "⭐"]);
        } else if (obj.type === "bonus") {
            // 보너스 = 기준값 × 배수 (일반 과일 점수의 배수)
            const base = cfg.bonusFruit.baseValue || 100;
            const gain = base * obj.multiplier;
            score = Math.max(0, score + gain);
            updateScoreDisplay();
            Audio.bigCorrect(8);
            showFloat(fx, fy, `🎉 +${gain} (×${obj.multiplier})`, "rainbow");
            emitParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 16, ["✨", "⭐", "🌟", "💫", "🎉"]);
        } else if (obj.type === "obstacle") {
            score = Math.max(0, score + cfg.obstaclePenalty);
            updateScoreDisplay();
            Audio.wrong();
            showFloat(fx, fy, "💥 -200", "bad");
            playerEl.classList.add("hurt");
            setTimeout(() => playerEl.classList.remove("hurt"), 500);
        }

        obj.el.classList.add("jump-obj--hit");
        setTimeout(() => obj.el.remove(), 400);
    }

    // ----- 메인 루프 -----
    function tick(t) {
        const dt = Math.min(50, t - (lastTickAt || t)) / 1000;
        lastTickAt = t;

        if (inStage) {
            const remain = (stageEndsAt - t) / 1000;
            timerEl.textContent = Math.max(0, remain).toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) {
                endStage();
            }
        }

        // 플레이어 물리 (가변 점프 — 스페이스 누름 시간에 따라 높이 다름)
        if (!isGrounded) {
            // 누르는 동안 + 아직 올라가는 중 + 최대 누름시간 안 지남 → 가벼운 중력
            const holdElapsed = performance.now() - jumpStartTime;
            const useHoldGravity = isJumpKeyHeld && velocityY < 0 && holdElapsed < cfg.maxHoldMs;
            const g = useHoldGravity ? cfg.holdGravity : cfg.gravity;
            velocityY += g * dt;
            playerYOffset -= velocityY * dt;
            if (playerYOffset <= 0) {
                playerYOffset = 0;
                velocityY = 0;
                isGrounded = true;
                isJumpKeyHeld = false;
            }
            // 픽셀 단위 절대 위치
            const areaH = playArea.clientHeight;
            const bottomPct = (1 - cfg.groundRatio) * 100;
            playerEl.style.bottom = `calc(${bottomPct}% + ${playerYOffset}px)`;
        }

        // 오브젝트 이동 + 충돌
        if (inStage) {
            const stage = cfg.stages[stageIndex];
            const areaW = playArea.clientWidth;
            const areaH = playArea.clientHeight;
            const groundY = areaH * cfg.groundRatio;
            const playerCenterX = areaW * cfg.playerXRatio;
            const playerCenterY = groundY - playerYOffset - 30;

            objects = objects.filter(obj => {
                if (obj.hit) return false;
                obj.x -= stage.scrollSpeed * dt;
                obj.el.style.left = `${obj.x}px`;

                if (obj.x < -120) {
                    obj.el.remove();
                    return false;
                }

                // 충돌 검사 — 캥거루는 키가 크므로 hitbox를 세로로 넓게
                // (살짝 떠 있는 과일은 점프 없이도 닿음)
                const dx = (obj.x + 30) - playerCenterX;
                const dy = (obj.y + 30) - playerCenterY;
                if (Math.abs(dx) < 50 && Math.abs(dy) < 80) {
                    handleHit(obj);
                    return false;
                }
                return true;
            });
        }

        rafId = requestAnimationFrame(tick);
    }

    // ----- 스테이지 흐름 -----
    function startStage() {
        const stage = cfg.stages[stageIndex];
        stageEl.textContent = `${stageIndex + 1} / ${cfg.stages.length}`;
        showStageBanner(stage.label);
        Audio.roundStart();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            spawnObject(stage);
            spawnTimer = setInterval(() => spawnObject(stage), stage.spawnIntervalMs);
        }, 1200);
    }

    function showStageBanner(label) {
        const banner = el("div", { class: "math-stage-banner", text: label });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.5s, transform 0.5s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => banner.remove(), 520);
        }, 1100);
    }

    function endStage() {
        inStage = false;
        clearInterval(spawnTimer);
        spawnTimer = null;
        objects.forEach(obj => {
            obj.el.style.transition = "opacity 0.4s";
            obj.el.style.opacity = "0";
            setTimeout(() => obj.el.remove(), 400);
        });
        objects = [];

        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 800);
        } else {
            setTimeout(startStage, 1500);
        }
    }

    function cleanup() {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (spawnTimer) clearInterval(spawnTimer);
        document.removeEventListener("keydown", keyDownHandler);
        document.removeEventListener("keyup", keyUpHandler);
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
            bestCombo: 0,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    // ----- 입력 (keydown/keyup으로 가변 점프) -----
    function keyDownHandler(e) {
        if (e.key === " " || e.code === "Space") {
            e.preventDefault();
            if (!e.repeat) jumpStart();
        }
    }
    function keyUpHandler(e) {
        if (e.key === " " || e.code === "Space") {
            e.preventDefault();
            jumpRelease();
        }
    }
    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("keyup", keyUpHandler);

    // 터치 지원 (모바일) — 누르고 있는 시간에 비례
    playArea.addEventListener("pointerdown", (e) => { jumpStart(); });
    playArea.addEventListener("pointerup",   (e) => { jumpRelease(); });
    playArea.addEventListener("pointercancel", (e) => { jumpRelease(); });

    function runCountdown(numbers, idx, cb) {
        if (idx >= numbers.length) { cb(); return; }
        const cd = el("div", { class: "countdown", text: numbers[idx] });
        screen.appendChild(cd);
        if (idx < numbers.length - 1) Audio.tick();
        else Audio.tickGo();
        setTimeout(() => { cd.remove(); runCountdown(numbers, idx + 1, cb); }, 800);
    }

    // ----- 좌상단 캐릭터 + 하단 안내 -----
    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);
    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 SPACE 짧게 = 낮은 점프 / 길게 누르면 더 높이! 장애물(🌵) 피하고 과일(🍎) 먹어요." });
    screen.appendChild(bottomHelp);

    // ----- 시작 -----
    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "스페이스바를 눌러서 점수를 획득하세요!");
        runCountdown(["3", "2", "1", "출발!"], 0, () => {
            startStage();
        });
    };
    if (!hasSeenTutorial("gameJump")) {
        showTutorial("gameJump", startGame);
    } else {
        startGame();
    }
};
