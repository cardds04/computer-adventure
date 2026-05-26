/* ============================================================
   4단원: 포트리스 챌린지
   마우스 길게 누르면 파워 게이지 차오르고, 떼면 마우스 방향으로 포탄 발사.
   목표물 명중 시 점수 + 콤보 보너스. 90초 동안 누적.
   ============================================================ */

SCREEN_RENDERERS.game4 = function (root, params) {
    const screen = el("div", { class: "screen game" });
    const cfg = CANNON_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let hits = 0;
    let shots = 0;
    let streak = 0;
    let bestStreak = 0;
    let gameEndsAt = 0;
    let lastTickAt = 0;
    let rafId = null;
    let gameOverFlag = false;
    let targetSpawnTimer = null;

    let targets = [];        // { el, x, y, vx, vy, alive, emoji, deathTimer }
    let projectiles = [];    // { el, x, y, vx, vy }

    let aimAngle = -Math.PI / 4;
    let isCharging = false;
    let chargeStart = 0;
    let chargePower = 0;
    let lastFireAt = 0;

    let cannonX = 0, cannonY = 0;

    // ----- HUD -----
    const goalScore = (LESSONS.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const streakEl = el("span", { text: "0" });
    const timerEl = el("span", { class: "hud-chip__big", text: "30.0", style: { color: "var(--secondary-dark)" } });
    const accEl = el("span", { text: "0" });
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
            el("span", { class: "stat-chip__label", text: "명중" }),
            accEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "🔥" }),
            streakEl,
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
        style: { position: "absolute", inset: "0", overflow: "hidden" },
    });
    screen.appendChild(playArea);

    // ----- 플레이어 캐릭터 (좌측 하단, 대포와 겹치지 않도록) -----
    const playerChar = el("div", {
        class: "player-character player-character--corner",
        text: getCurrentEmoji(),
    });
    screen.appendChild(playerChar);

    // ----- 안내 배너 -----
    const banner = el("div", {
        class: "prompt-banner",
        style: { fontSize: "20px", top: "90px" },
        html: `<span class="prompt-banner__hint">꾸욱~ 길게 누를수록 멀리 날아가요</span><span>🎯 마우스로 조준 → 꾸욱 → 떼면 발사!</span>`,
    });
    screen.appendChild(banner);
    setTimeout(() => {
        banner.style.transition = "opacity 0.6s, transform 0.6s";
        banner.style.opacity = "0";
        banner.style.transform = "translateX(-50%) translateY(-20px)";
        setTimeout(() => banner.remove(), 700);
    }, 4500);

    // ----- 대포 -----
    const cannonGroup = el("div", { class: "cannon" });
    cannonGroup.innerHTML = `
        <svg viewBox="0 0 100 110" class="cannon-svg">
            <!-- 그림자 -->
            <ellipse cx="50" cy="100" rx="36" ry="6" fill="rgba(0,0,0,0.3)" />
            <!-- 받침대 -->
            <rect x="18" y="70" width="64" height="22" rx="6" fill="#5d4e37" stroke="#3d3424" stroke-width="2" />
            <!-- 바퀴 -->
            <circle cx="30" cy="92" r="11" fill="#2d2d2d" />
            <circle cx="30" cy="92" r="6"  fill="#666" />
            <circle cx="70" cy="92" r="11" fill="#2d2d2d" />
            <circle cx="70" cy="92" r="6"  fill="#666" />
            <!-- 포신 (회전) -->
            <g class="cannon-barrel">
                <rect x="44" y="12" width="12" height="52" rx="3" fill="#3d3d3d" stroke="#1d1d1d" stroke-width="2" />
                <rect x="40" y="8"  width="20" height="14" rx="3" fill="#5d5d5d" stroke="#1d1d1d" stroke-width="2" />
                <circle cx="50" cy="14" r="3" fill="#222" />
            </g>
        </svg>
    `;
    screen.appendChild(cannonGroup);

    // ----- 파워 게이지 -----
    const powerGauge = el("div", { class: "power-gauge" },
        el("div", { class: "power-gauge__label", text: "POWER" }),
        el("div", { class: "power-gauge__bar" },
            el("div", { class: "power-gauge__fill" }),
        ),
    );
    const powerFill = powerGauge.querySelector(".power-gauge__fill");
    screen.appendChild(powerGauge);

    // ----- 조준선 (가상) -----
    const aimLine = el("div", { class: "aim-line" });
    screen.appendChild(aimLine);

    function positionCannon() {
        cannonX = screen.clientWidth / 2;
        cannonY = screen.clientHeight - 70;
    }

    function updateBarrel() {
        const barrel = cannonGroup.querySelector(".cannon-barrel");
        // SVG 기준: 0deg = 위쪽(-Y), 시계방향
        // aimAngle: 0 = 오른쪽(+X), -PI/2 = 위쪽
        const deg = aimAngle * 180 / Math.PI + 90;
        barrel.style.transformOrigin = "50px 70px";
        barrel.style.transform = `rotate(${deg}deg)`;

        // 조준선 업데이트
        const len = 120;
        const tipX = cannonX + Math.cos(aimAngle) * 30;
        const tipY = cannonY + Math.sin(aimAngle) * 30;
        const endX = tipX + Math.cos(aimAngle) * len;
        const endY = tipY + Math.sin(aimAngle) * len;
        aimLine.style.left = `${tipX}px`;
        aimLine.style.top  = `${tipY}px`;
        aimLine.style.width = `${len}px`;
        aimLine.style.transform = `rotate(${aimAngle * 180 / Math.PI}deg)`;
    }

    function setAimFromPoint(px, py) {
        if (gameOverFlag) return;
        const dx = px - cannonX;
        const dy = py - cannonY;
        let angle = Math.atan2(dy, dx);
        // 위쪽 반원만 (-PI ~ 0)
        if (angle > 0) {
            angle = (angle > Math.PI / 2) ? -Math.PI : 0;
        }
        aimAngle = angle;
        updateBarrel();
    }

    function startCharge() {
        if (gameOverFlag) return;
        isCharging = true;
        chargeStart = performance.now();
    }

    function releaseCharge() {
        if (!isCharging) return;
        isCharging = false;
        const elapsed = performance.now() - chargeStart;
        const rawPower = Math.min(1, elapsed / cfg.maxChargeMs);
        const power = Math.max(cfg.minPower, rawPower);
        powerFill.style.height = "0%";
        powerGauge.classList.remove("charging");
        fire(aimAngle, power);
    }

    function fire(angle, power) {
        if (performance.now() - lastFireAt < 250) return;  // 연사 방지
        lastFireAt = performance.now();
        shots++;
        accEl.textContent = `${hits}/${shots}`;

        const speed = cfg.minSpeed + (cfg.maxSpeed - cfg.minSpeed) * power;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        // 포구 위치 (포신 끝)
        const muzzleX = cannonX + Math.cos(angle) * 50;
        const muzzleY = cannonY + Math.sin(angle) * 50;

        const projEl = el("div", { class: "projectile", text: "💣" });
        projEl.style.left = `${muzzleX}px`;
        projEl.style.top  = `${muzzleY}px`;
        playArea.appendChild(projEl);

        projectiles.push({ el: projEl, x: muzzleX, y: muzzleY, vx, vy });

        // 발사 효과음 & 반동
        Audio.glide(180 + power * 100, 80, 0.18, "sawtooth", 0.5);
        cannonGroup.style.transition = "transform 0.08s";
        cannonGroup.style.transform = `translateX(-50%) translateY(${4 + power * 3}px)`;
        setTimeout(() => {
            cannonGroup.style.transform = "translateX(-50%) translateY(0)";
        }, 90);

        // 발사 머즐 플래시
        const flash = el("div", {
            class: "muzzle-flash",
            style: { left: `${muzzleX}px`, top: `${muzzleY}px` },
            text: "💥",
        });
        playArea.appendChild(flash);
        setTimeout(() => flash.remove(), 250);
    }

    function spawnTarget() {
        if (gameOverFlag) return;
        if (targets.filter(t => t.alive).length >= cfg.maxTargets) return;

        const emoji = CANNON_TARGETS[Math.floor(Math.random() * CANNON_TARGETS.length)];
        // 보너스 빈도 증가 (1/30 → 1/10, 고배수도 더 자주)
        let bonusMultiplier = 0;
        if (Math.random() < 1/10) {                  // 10% 보너스
            const r = Math.random();
            if (r < 0.05)      bonusMultiplier = 500;   // 5%  ← 신규 전설
            else if (r < 0.20) bonusMultiplier = 100;   // 15%
            else if (r < 0.45) bonusMultiplier = 50;    // 25%
            else if (r < 0.70) bonusMultiplier = 30;    // 25%
            else                bonusMultiplier = 10;   // 30%
        }
        const isBonus = bonusMultiplier > 0;
        const bonusClass = isBonus ? ` cannon-target--bonus cannon-target--bonus${bonusMultiplier}` : "";

        const w = screen.clientWidth;
        const h = screen.clientHeight;

        const x = 120 + Math.random() * (w - 240);
        const y = 140 + Math.random() * (h * 0.5 - 60);

        const tEl = el("div", {
            class: "cannon-target" + bonusClass,
            html: `${emoji}${isBonus ? `<span class="cannon-target-bonus-badge">×${bonusMultiplier}</span>` : ''}`,
        });
        tEl.style.left = `${x}px`;
        tEl.style.top  = `${y}px`;
        playArea.appendChild(tEl);

        const tObj = {
            el: tEl,
            x, y,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 30,
            alive: true,
            emoji,
            isBonus,
            bonusMultiplier,
            deathTimer: null,
        };
        targets.push(tObj);

        tObj.deathTimer = setTimeout(() => {
            if (!tObj.alive) return;
            tObj.alive = false;
            tEl.style.transition = "opacity 0.5s, transform 0.5s";
            tEl.style.opacity = "0";
            tEl.style.transform += " scale(0.5)";
            setTimeout(() => tEl.remove(), 520);
            targets = targets.filter(t => t !== tObj);
        }, cfg.targetLifetimeMs);
    }

    function onHit(target, hitX, hitY) {
        if (!target.alive) return;
        target.alive = false;
        clearTimeout(target.deathTimer);

        hits++;
        streak++;
        bestStreak = Math.max(bestStreak, streak);
        const streakBonus = Math.min(streak - 1, 8) * cfg.streakBonus;
        const baseGain = cfg.hitPoints + streakBonus;
        const multiplier = target.bonusMultiplier || 1;
        const gain = baseGain * multiplier;
        score += gain;

        updateScoreDisplay();
        streakEl.textContent = streak;
        accEl.textContent = `${hits}/${shots}`;

        // 명중 효과
        target.el.style.transition = "transform 0.35s, opacity 0.35s";
        target.el.style.transform += " scale(1.6)";
        target.el.style.opacity = "0";
        setTimeout(() => target.el.remove(), 360);
        targets = targets.filter(t => t !== target);

        const pf = el("div", {
            class: "points-float" + (target.isBonus ? " points-float--bonus" : ""),
            text: target.isBonus ? `🎉 +${gain}!` : `+${gain}!`,
            style: { left: `${hitX}px`, top: `${hitY}px`, fontSize: "32px" },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1100);

        emitParticles(hitX, hitY, target.isBonus ? 20 : 12, ["💥", "✨", "⭐", "🌟", "🎉", "🎊"]);

        if (target.isBonus) Audio.bigCorrect(8);
        else if (streak >= 3) Audio.bigCorrect(Math.min(streak, 8));
        else Audio.correct();
    }

    function tick(t) {
        if (gameOverFlag) return;
        const dt = Math.min(0.05, (t - (lastTickAt || t)) / 1000);
        lastTickAt = t;

        // 충전 게이지
        if (isCharging) {
            chargePower = Math.min(1, (performance.now() - chargeStart) / cfg.maxChargeMs);
            powerFill.style.height = `${chargePower * 100}%`;
            powerGauge.classList.add("charging");
            // 색상 변화
            if (chargePower < 0.4)      powerFill.style.background = "var(--secondary)";
            else if (chargePower < 0.8) powerFill.style.background = "var(--accent)";
            else                          powerFill.style.background = "var(--primary)";
        }

        // 포탄 업데이트
        projectiles = projectiles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += cfg.gravity * dt;
            p.el.style.left = `${p.x}px`;
            p.el.style.top  = `${p.y}px`;

            // 화면 밖
            if (p.y > screen.clientHeight + 50 || p.x < -80 || p.x > screen.clientWidth + 80) {
                p.el.remove();
                streak = 0;
                streakEl.textContent = streak;
                return false;
            }

            // 명중 판정
            for (const tg of targets) {
                if (!tg.alive) continue;
                const dx = p.x - tg.x;
                const dy = p.y - tg.y;
                if (dx * dx + dy * dy < cfg.targetRadius * cfg.targetRadius) {
                    onHit(tg, p.x, p.y);
                    p.el.remove();
                    return false;
                }
            }
            return true;
        });

        // 타겟 드리프트
        const wMax = screen.clientWidth - 80;
        const hMax = screen.clientHeight * 0.65;
        targets.forEach(tg => {
            if (!tg.alive) return;
            tg.x += tg.vx * dt;
            tg.y += tg.vy * dt;
            if (tg.x < 80)     { tg.x = 80; tg.vx = Math.abs(tg.vx); }
            if (tg.x > wMax)   { tg.x = wMax; tg.vx = -Math.abs(tg.vx); }
            if (tg.y < 140)    { tg.y = 140; tg.vy = Math.abs(tg.vy); }
            if (tg.y > hMax)   { tg.y = hMax; tg.vy = -Math.abs(tg.vy); }
            tg.el.style.left = `${tg.x}px`;
            tg.el.style.top  = `${tg.y}px`;
        });

        // 타이머
        const remain = Math.max(0, (gameEndsAt - t) / 1000);
        timerEl.textContent = remain.toFixed(1);
        timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";

        if (remain <= 0) {
            finishGame();
            return;
        }

        rafId = requestAnimationFrame(tick);
    }

    // ----- 입력 -----
    function onPointerMove(ev) { setAimFromPoint(ev.clientX, ev.clientY); }
    function onPointerDown(ev) {
        // HUD/버튼 영역 위는 무시
        if (ev.target.closest(".hud-chip, .btn")) return;
        setAimFromPoint(ev.clientX, ev.clientY);
        startCharge();
    }
    function onPointerUp(ev) {
        if (!isCharging) return;
        releaseCharge();
    }

    screen.addEventListener("pointermove", onPointerMove);
    screen.addEventListener("pointerdown", onPointerDown);
    screen.addEventListener("pointerup", onPointerUp);
    screen.addEventListener("pointercancel", onPointerUp);
    // 화면 밖에서 떼면
    window.addEventListener("pointerup", onPointerUp);

    function cleanup() {
        gameOverFlag = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (targetSpawnTimer) clearInterval(targetSpawnTimer);
        targets.forEach(t => clearTimeout(t.deathTimer));
        window.removeEventListener("pointerup", onPointerUp);
        rafId = null;
    }

    function finishGame() {
        if (gameOverFlag) return;
        cleanup();
        Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score,
            bestCombo: bestStreak,
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

    // 일시정지/재개
    let _pausedAt = null;
    const pauseHandler = {
        pause() {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            if (targetSpawnTimer) { clearInterval(targetSpawnTimer); targetSpawnTimer = null; }
            // 타겟 자동 소멸 타이머도 정지
            targets.forEach(t => {
                if (t.deathTimer) { clearTimeout(t.deathTimer); t.deathTimer = null; }
            });
            _pausedAt = performance.now();
        },
        resume() {
            if (_pausedAt === null) return;
            const pauseDuration = performance.now() - _pausedAt;
            _pausedAt = null;
            // 전체 게임 종료 시각 연장
            gameEndsAt += pauseDuration;
            // 타겟 자동 소멸 타이머 재설정 (간단히 풀 lifetime 재시작)
            targets.forEach(t => {
                if (t.alive && !t.deathTimer) {
                    t.deathTimer = setTimeout(() => {
                        if (!t.alive) return;
                        t.alive = false;
                        t.el.style.transition = "opacity 0.5s, transform 0.5s";
                        t.el.style.opacity = "0";
                        t.el.style.transform += " scale(0.5)";
                        setTimeout(() => t.el.remove(), 520);
                        targets = targets.filter(x => x !== t);
                    }, cfg.targetLifetimeMs);
                }
            });
            // 스폰 재시작
            targetSpawnTimer = setInterval(spawnTarget, cfg.targetSpawnIntervalMs);
            lastTickAt = 0;
            rafId = requestAnimationFrame(tick);
        },
    };

    root.appendChild(screen);
    updateScoreDisplay();

    const startGame = () => {
        showCarryOverBanner(startingScore);
        requestAnimationFrame(() => {
            positionCannon();
            updateBarrel();
            runCountdown(["3", "2", "1", "발사!"], 0, () => {
                Audio.roundStart();
                gameEndsAt = performance.now() + cfg.totalTime;
                for (let i = 0; i < 16; i++) setTimeout(spawnTarget, i * 100);
                targetSpawnTimer = setInterval(spawnTarget, cfg.targetSpawnIntervalMs);
                rafId = requestAnimationFrame(tick);
            });
        });
    };

    if (!hasSeenTutorial("game4")) {
        showTutorial("game4", startGame);
    } else {
        startGame();
    }
};
