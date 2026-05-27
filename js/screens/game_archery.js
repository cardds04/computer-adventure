/* ============================================================
   2단원 스텝 3: 양궁 챌린지
   ↑↓: 조준 각도 조절
   SPACE 길게 누르기 → 파워 차지, 떼면 화살 발사
   단어 표적을 화살로 맞춰서 점수 획득. 3단계.
   ============================================================ */

SCREEN_RENDERERS.gameArchery = function (root, params) {
    const screen = el("div", { class: "screen game game--archery" });
    const cfg = ARCHERY_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let lastTickAt = 0;
    let spawnTimer = null;

    let targets = [];      // { el, text, x, y, width, height, vx }
    let arrows = [];       // { el, x, y, vx, vy }
    let aimAngle = -20;    // degrees, negative = up
    let isCharging = false;
    let chargeStart = 0;
    let chargePower = 0;   // 0 ~ 1
    let aimKey = null;     // "up" or "down" or null

    // ----- HUD -----
    const goalScore = LESSONS_UNIT2.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "20.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "🏹" }),
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

    // ----- 플레이 영역 -----
    const playArea = el("div", { class: "archery-area" });
    screen.appendChild(playArea);

    // 궁수
    const archer = el("div", { class: "archer" },
        el("div", { class: "archer__body", text: "🧝" }),
        el("div", { class: "archer__bow" }),
    );
    playArea.appendChild(archer);
    const bowEl = archer.querySelector(".archer__bow");

    // 조준선
    const aimLine = el("div", { class: "archery-aim-line" });
    playArea.appendChild(aimLine);

    // 파워 게이지
    const powerGauge = el("div", { class: "power-gauge power-gauge--archery" },
        el("div", { class: "power-gauge__label", text: "POWER" }),
        el("div", { class: "power-gauge__bar" },
            el("div", { class: "power-gauge__fill" }),
        ),
    );
    const powerFill = powerGauge.querySelector(".power-gauge__fill");
    screen.appendChild(powerGauge);

    // (도움말은 하단 .game-bottom-help 로 통일)

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    // ----- 궁수 위치 -----
    function getArcherCenter() {
        const r = archer.getBoundingClientRect();
        const pr = playArea.getBoundingClientRect();
        return {
            x: r.left + r.width / 2 - pr.left,
            y: r.top + r.height / 2 - pr.top,
        };
    }

    // ----- 조준선/활 회전 -----
    function updateAim() {
        const c = getArcherCenter();
        const rad = aimAngle * Math.PI / 180;
        const len = 140;
        const ex = c.x + Math.cos(rad) * len;
        const ey = c.y + Math.sin(rad) * len;
        aimLine.style.left = `${c.x}px`;
        aimLine.style.top = `${c.y}px`;
        aimLine.style.width = `${len}px`;
        aimLine.style.transform = `rotate(${aimAngle}deg)`;
        bowEl.style.transform = `translate(-50%, -50%) rotate(${aimAngle}deg)`;
    }

    // ----- 단어 표적 스폰 -----
    function weightedPick(values, weights) {
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < values.length; i++) {
            r -= weights[i];
            if (r <= 0) return values[i];
        }
        return values[values.length - 1];
    }

    function spawnTarget() {
        if (!inStage || finished) return;
        const stage = cfg.stages[stageIndex];
        if (targets.length >= stage.maxOnScreen) return;

        const word = stage.words[Math.floor(Math.random() * stage.words.length)];
        const areaH = playArea.clientHeight;
        const minY = 60;
        const maxY = areaH - 80;
        const y = minY + Math.random() * (maxY - minY);

        // 보너스 표적 (황금 + 배수)
        const isBonus = Math.random() < cfg.bonusChance;
        const multiplier = isBonus
            ? weightedPick(cfg.bonusMultipliers, cfg.bonusWeights)
            : 1;

        const tEl = el("div", {
            class: "archery-target" + (isBonus ? " archery-target--bonus" : ""),
        });
        const labelEl = el("span", { class: "archery-target__label", text: word });
        tEl.appendChild(labelEl);
        if (isBonus) {
            const badge = el("span", { class: "archery-target__bonus", text: `×${multiplier}` });
            tEl.appendChild(badge);
        }
        tEl.style.top = `${y}px`;
        tEl.style.right = `-20px`;
        playArea.appendChild(tEl);

        // 측정을 위해 한 프레임 뒤 width 계산
        requestAnimationFrame(() => {
            const w = tEl.offsetWidth;
            const h = tEl.offsetHeight;
            const startX = playArea.clientWidth + 10;
            tEl.style.right = "";
            tEl.style.left = `${startX}px`;
            targets.push({
                el: tEl,
                text: word,
                x: startX,
                y,
                width: w,
                height: h,
                vx: -stage.wordSpeed,
                isBonus,
                multiplier,
            });
        });
    }

    // ----- 화살 발사 -----
    function shoot(power) {
        const c = getArcherCenter();
        const rad = aimAngle * Math.PI / 180;
        // 활 끝에서 발사
        const startX = c.x + Math.cos(rad) * 30;
        const startY = c.y + Math.sin(rad) * 30;
        const speed = cfg.minSpeed + power * (cfg.maxSpeed - cfg.minSpeed);
        const vx = Math.cos(rad) * speed;
        const vy = Math.sin(rad) * speed;

        const arrowEl = el("div", { class: "archery-arrow", text: "➤" });
        arrowEl.style.left = `${startX}px`;
        arrowEl.style.top = `${startY}px`;
        arrowEl.style.transform = `translate(-50%, -50%) rotate(${aimAngle}deg)`;
        playArea.appendChild(arrowEl);

        arrows.push({ el: arrowEl, x: startX, y: startY, vx, vy });
        Audio.tickGo && Audio.tickGo();
    }

    // ----- 충돌 검사 (화살 점 vs 표적 박스) -----
    function checkArrowHit(arrow) {
        for (const t of targets) {
            if (arrow.x >= t.x - 4 && arrow.x <= t.x + t.width + 4 &&
                arrow.y >= t.y - 4 && arrow.y <= t.y + t.height + 4) {
                return t;
            }
        }
        return null;
    }

    function hitTarget(target, arrow) {
        const stage = cfg.stages[stageIndex];
        const base = stage.pointsPerHit;
        const gain = target.isBonus ? base * target.multiplier : base;
        score += gain;
        updateScoreDisplay();

        // 시각 효과
        const tRect = target.el.getBoundingClientRect();
        const cx = tRect.left + tRect.width / 2;
        const cy = tRect.top + tRect.height / 2;
        const pf = el("div", {
            class: "points-float" + (target.isBonus ? " points-float--bonus" : ""),
            text: target.isBonus ? `🎉 +${gain.toLocaleString()}!` : `+${gain}`,
            style: { left: `${cx}px`, top: `${cy}px` },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1200);
        emitParticles(cx, cy, target.isBonus ? 20 : 10,
            target.isBonus ? ["✨","⭐","🎯","💫","🎉","🎊","🌟"] : ["✨","⭐","🎯","💫"]);

        if (target.isBonus) Audio.bigCorrect(8);
        else Audio.bigCorrect(4);

        target.el.classList.add("archery-target--hit");
        setTimeout(() => target.el.remove(), 400);
        targets = targets.filter(x => x !== target);

        arrow.el.remove();
        arrows = arrows.filter(a => a !== arrow);
    }

    // ----- 메인 루프 -----
    function tick(t) {
        const dt = Math.min(50, t - (lastTickAt || t)) / 1000;
        lastTickAt = t;

        if (inStage) {
            const remain = Math.max(0, (stageEndsAt - t) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) endStage();
        }

        // 조준 각도 갱신 (키를 누르고 있는 동안)
        if (aimKey === "up") {
            aimAngle = Math.max(cfg.minAngleDeg, aimAngle - cfg.aimSpeedDegPerSec * dt);
        } else if (aimKey === "down") {
            aimAngle = Math.min(cfg.maxAngleDeg, aimAngle + cfg.aimSpeedDegPerSec * dt);
        }
        updateAim();

        // 차지 갱신
        if (isCharging) {
            const elapsed = performance.now() - chargeStart;
            chargePower = Math.min(1, elapsed / cfg.maxChargeMs);
            powerFill.style.width = `${chargePower * 100}%`;
        }

        // 표적 이동
        const areaW = playArea.clientWidth;
        targets = targets.filter(t => {
            t.x += t.vx * dt;
            t.el.style.left = `${t.x}px`;
            if (t.x + t.width < 0) {
                t.el.remove();
                return false;
            }
            return true;
        });

        // 화살 이동 + 충돌
        const gravity = cfg.gravity;
        const areaH = playArea.clientHeight;
        arrows = arrows.filter(a => {
            a.vy += gravity * dt;
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            a.el.style.left = `${a.x}px`;
            a.el.style.top = `${a.y}px`;
            const angDeg = Math.atan2(a.vy, a.vx) * 180 / Math.PI;
            a.el.style.transform = `translate(-50%, -50%) rotate(${angDeg}deg)`;

            // 화면 이탈
            if (a.x > areaW + 40 || a.x < -40 || a.y > areaH + 40) {
                a.el.remove();
                // 미스 페널티
                if (inStage) {
                    score = Math.max(0, score - cfg.missPenalty);
                    updateScoreDisplay();
                }
                return false;
            }
            // 충돌 검사
            const hit = checkArrowHit(a);
            if (hit) {
                hitTarget(hit, a);
                return false;
            }
            return true;
        });

        rafId = requestAnimationFrame(tick);
    }

    // ----- 키 핸들러 -----
    function onKeyDown(e) {
        if (!inStage || finished) return;
        if (e.key === "ArrowUp") {
            aimKey = "up";
            e.preventDefault();
        } else if (e.key === "ArrowDown") {
            aimKey = "down";
            e.preventDefault();
        } else if (e.code === "Space" || e.key === " ") {
            if (!isCharging && !e.repeat) {
                isCharging = true;
                chargeStart = performance.now();
                chargePower = 0;
                powerFill.style.width = "0%";
                powerGauge.classList.add("power-gauge--active");
            }
            e.preventDefault();
        }
    }

    function onKeyUp(e) {
        if (e.key === "ArrowUp" && aimKey === "up") aimKey = null;
        else if (e.key === "ArrowDown" && aimKey === "down") aimKey = null;
        else if ((e.code === "Space" || e.key === " ") && isCharging) {
            isCharging = false;
            powerGauge.classList.remove("power-gauge--active");
            const power = Math.max(0.15, chargePower);
            if (inStage && !finished) shoot(power);
            chargePower = 0;
            powerFill.style.width = "0%";
            e.preventDefault();
        }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // ----- 스테이지 -----
    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();

        // 이전 표적 정리
        targets.forEach(t => t.el.remove());
        targets = [];
        arrows.forEach(a => a.el.remove());
        arrows = [];

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            spawnTarget();
            spawnTimer = setInterval(spawnTarget, stage.spawnIntervalMs);
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
        if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
        targets.forEach(t => {
            t.el.style.transition = "opacity 0.4s";
            t.el.style.opacity = "0";
            setTimeout(() => t.el.remove(), 400);
        });
        targets = [];

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
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
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

    // ----- 좌상단 캐릭터 + 하단 안내 -----
    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);
    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 ↑↓ 조준 · SPACE 길게 = 파워 충전 · 떼면 발사! 🌟 황금 표적 명중하면 점수 ×10~×20!" });
    screen.appendChild(bottomHelp);

    // ----- 시작 -----
    root.appendChild(screen);
    updateScoreDisplay();
    updateAim();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "방향키와 스페이스바로 과녁을 맞추세요!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameArchery")) {
        showTutorial("gameArchery", startGame);
    } else {
        startGame();
    }
};
