/* ============================================================
   4단원 스텝 5: 송양초 스페이스 슈터 (갤러그 스타일)
   - 비행기를 좌/우로 움직이며 위에서 내려오는 적 격추
   - 자동 발사
   - 콤보 시스템 + 다양한 적 (외계인/UFO/로봇/보스/해골)
   ============================================================ */

SCREEN_RENDERERS.gameShooter = function (root, params) {
    const screen = el("div", { class: "screen game game--shooter game--unit4" });
    const cfg = SHOOTER_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;

    // 도전 횟수에 따라 진행할 단계들 결정
    //  1번째 도전: [0,1,2] (1·2·3단계)
    //  2번째 도전: [3,4,5] (4·5·6단계)
    //  3번째 도전 이후: [6] (7단계만 무한)
    const attemptCount = state.shooterAttempts || 0;
    const stageIndices = getShooterStageIndices(attemptCount);
    let localStageIdx = 0;                       // 0..stageIndices.length-1
    let stageIndex = stageIndices[0];            // 실제 cfg.stages 인덱스
    const totalStagesThisRun = stageIndices.length;

    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let lastTickAt = 0;
    let spawnTimer = null;
    let lastFireAt = 0;
    let lastHitAt = 0;
    let combo = 0;
    let maxCombo = 0;

    let playerX = 0;
    let playerW = 64;
    let bullets = [];      // {el, x, y}
    let enemies = [];      // {el, x, y, type, hp, alive, speed}
    let keys = { left: false, right: false };

    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: `1 / ${totalStagesThisRun}` });
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
            el("span", { text: "🚀" }),
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

    // 스프라이트 헬퍼 — src가 있으면 SVG 이미지로, 없으면 이모지 텍스트로
    function applySprite(elm, src, emoji) {
        if (src) {
            elm.style.backgroundImage = `url("${src}")`;
            elm.classList.add("has-sprite");
        } else if (emoji) {
            elm.textContent = emoji;
        }
    }

    // 플레이 영역 (우주)
    const playArea = el("div", { class: "shooter-area" });
    if (cfg.bgSprite) {
        playArea.style.backgroundImage = `url("${cfg.bgSprite}")`;
        playArea.style.backgroundSize = "cover";
        playArea.style.backgroundPosition = "center";
    }
    screen.appendChild(playArea);

    // 플레이어 비행기
    const playerEl = el("div", { class: "shooter-player" });
    applySprite(playerEl, cfg.playerSprite, "🚀");
    playArea.appendChild(playerEl);

    // 도전 횟수에 따른 안내 문구
    const helpByAttempt =
        attemptCount === 0 ? "💡 ← → 이동 + SPACE 발사! 단계마다 무기 업그레이드 (단발→트리플→레이저)!"
        : attemptCount === 1 ? "🔥 두 번째 도전! 5웨이 산탄 → 듀얼 레이저 → 트리플 레이저! 적도 훨씬 많아요!"
        : "💀 송양초 궁극의 무기 모드! 5웨이 + 3가닥 레이저 동시 발사! 끝없는 적의 침공!";
    const bottomHelp = el("div", { class: "game-bottom-help", text: helpByAttempt });
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

    // ----- 키 입력 -----
    function onKeyDown(e) {
        if (!inStage || finished) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            keys.left = true;
            e.preventDefault();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            keys.right = true;
            e.preventDefault();
        } else if (e.code === "Space" || e.key === " ") {
            // 스페이스바 → 발사 (단계별 쿨다운)
            const stage = cfg.stages[stageIndex];
            const cd = stage.fireCooldownMs || cfg.fireIntervalMs;
            const now = performance.now();
            if (now - lastFireAt >= cd) {
                fireWeapon();
                lastFireAt = now;
            }
            e.preventDefault();
        }
    }
    function onKeyUp(e) {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    // ----- 마우스 이동 지원 -----
    playArea.addEventListener("pointermove", (e) => {
        if (!inStage || finished) return;
        const r = playArea.getBoundingClientRect();
        const x = e.clientX - r.left;
        playerX = Math.max(playerW / 2, Math.min(r.width - playerW / 2, x));
        updatePlayerEl();
    });

    function updatePlayerEl() {
        playerEl.style.left = `${playerX - playerW / 2}px`;
    }

    // ----- 무기 발사 -----
    function fireWeapon() {
        const stage = cfg.stages[stageIndex];
        const weapon = stage.weapon || "single";
        const bx = playerX;
        const by = playerEl.offsetTop;

        switch (weapon) {
            case "laser":
                fireLaser(bx);
                break;
            case "triple":
                spawnBullet(bx, by, 0);
                spawnBullet(bx, by, -0.45);
                spawnBullet(bx, by, 0.45);
                break;
            case "spread5":
                // 5웨이 산탄 — 정면 + 좌2 + 우2
                spawnBullet(bx, by, 0);
                spawnBullet(bx, by, -0.35);
                spawnBullet(bx, by, 0.35);
                spawnBullet(bx, by, -0.75);
                spawnBullet(bx, by, 0.75);
                Audio.bigCorrect && Audio.bigCorrect(4);
                break;
            case "doubleLaser":
                // 좌·우 동시 레이저 (중앙에서 약간 떨어진 두 가닥)
                fireLaser(bx - 50);
                fireLaser(bx + 50);
                break;
            case "tripleLaser":
                // 3가닥 레이저 + 트리플 미사일 보조
                fireLaser(bx - 70);
                fireLaser(bx);
                fireLaser(bx + 70);
                spawnBullet(bx, by, -0.5);
                spawnBullet(bx, by, 0.5);
                break;
            case "ultimate":
                // 송양초 궁극의 무기: 5웨이 산탄 + 3가닥 레이저 동시
                fireLaser(bx - 90);
                fireLaser(bx);
                fireLaser(bx + 90);
                spawnBullet(bx, by, 0);
                spawnBullet(bx, by, -0.35);
                spawnBullet(bx, by, 0.35);
                spawnBullet(bx, by, -0.75);
                spawnBullet(bx, by, 0.75);
                if (Audio.perfectBell) Audio.perfectBell();
                break;
            default:
                spawnBullet(bx, by, 0);
        }
        Audio.tick && Audio.tick();
    }

    function spawnBullet(x, y, vxFactor) {
        const bulletEl = el("div", { class: "shooter-bullet" });
        applySprite(bulletEl, cfg.bulletSprite, "✨");
        bulletEl.style.left = `${x - 8}px`;
        bulletEl.style.top = `${y}px`;
        playArea.appendChild(bulletEl);
        bullets.push({
            el: bulletEl,
            x, y,
            vx: vxFactor * cfg.bulletSpeed * 0.35,
        });
    }

    function fireLaser(x) {
        // 레이저 빔: 즉시 같은 X 라인의 모든 적에 데미지
        const beamEl = el("div", { class: "shooter-laser" });
        beamEl.style.left = `${x - 8}px`;
        beamEl.style.bottom = `${playerEl.offsetHeight + 16}px`;
        beamEl.style.height = `${playerEl.offsetTop - 4}px`;
        playArea.appendChild(beamEl);
        setTimeout(() => beamEl.remove(), 280);

        const half = cfg.laserHalfWidth || 36;
        const dmg = cfg.laserDamage || 2;
        enemies.forEach(e => {
            if (!e.alive) return;
            if (Math.abs((e.x) - x) <= half) {
                e.hp -= dmg;
                if (e.hp <= 0) {
                    explodeEnemy(e, e.type.kind === "skull");
                } else {
                    e.el.classList.remove("shooter-enemy--hurt");
                    void e.el.offsetWidth;
                    e.el.classList.add("shooter-enemy--hurt");
                }
            }
        });
        Audio.bigCorrect && Audio.bigCorrect(6);
    }

    // ----- 적 -----
    function spawnEnemy() {
        if (!inStage || finished) return;
        const stage = cfg.stages[stageIndex];
        const type = weightedPick(cfg.enemyTypes);
        const areaW = playArea.clientWidth;
        const x = 40 + Math.random() * (areaW - 80);
        const enemyEl = el("div", { class: "shooter-enemy shooter-enemy--" + type.kind });
        applySprite(enemyEl, type.sprite, type.emoji);
        enemyEl.style.left = `${x - 30}px`;
        enemyEl.style.top = `-60px`;
        playArea.appendChild(enemyEl);
        const speed = stage.enemySpeed * (type.speedMult || 1);
        enemies.push({ el: enemyEl, x, y: -60, type, hp: type.hp, alive: true, speed });
    }

    function explodeEnemy(enemy, isPenalty) {
        enemy.alive = false;
        enemy.el.classList.add("shooter-enemy--exploded");
        setTimeout(() => enemy.el.remove(), 400);
        const r = enemy.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;

        if (isPenalty) {
            combo = 0;
            score = Math.max(0, score + enemy.type.points);     // points is negative
            updateScoreDisplay();
            showScoreFloat(cx, cy, `💥 ${enemy.type.points.toLocaleString()}`, "bad");
            emitParticles(cx, cy, 18, ["💥","🔥","💢"]);
            Audio.wrong();
            return;
        }

        const now = performance.now();
        const stage = cfg.stages[stageIndex];
        if (now - lastHitAt <= stage.comboWindowMs) combo++;
        else combo = 1;
        lastHitAt = now;
        if (combo > maxCombo) maxCombo = combo;

        const multIdx = Math.min(combo - 1, cfg.comboMultipliers.length - 1);
        const mult = cfg.comboMultipliers[multIdx];
        const gain = Math.floor(enemy.type.points * mult);
        score += gain;
        updateScoreDisplay();

        const label = mult > 1 ? `+${gain.toLocaleString()} (×${mult})` : `+${gain.toLocaleString()}`;
        const cls = ["boss","bonus"].includes(enemy.type.kind) ? "rainbow" : "good";
        showScoreFloat(cx, cy, label, cls);
        const particleCount = enemy.type.kind === "boss" ? 30 : (enemy.type.kind === "bonus" ? 20 : 10);
        emitParticles(cx, cy, particleCount, ["✨","⭐","🌟","💫","🎉","💥"]);

        if (enemy.type.kind === "boss") Audio.levelUp && Audio.levelUp();
        else if (combo >= 3) Audio.bigCorrect(Math.min(8, combo));
        else Audio.correct();
    }

    // ----- 충돌 검사: 총알 점 vs 적 박스 -----
    function checkCollisions() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            for (const e of enemies) {
                if (!e.alive) continue;
                if (b.x >= e.x - 32 && b.x <= e.x + 32 &&
                    b.y >= e.y - 4 && b.y <= e.y + 56) {
                    // 명중!
                    e.hp--;
                    b.el.remove();
                    bullets.splice(i, 1);
                    if (e.hp <= 0) {
                        explodeEnemy(e, e.type.kind === "skull");
                    } else {
                        e.el.classList.remove("shooter-enemy--hurt");
                        void e.el.offsetWidth;
                        e.el.classList.add("shooter-enemy--hurt");
                    }
                    break;
                }
            }
        }
    }

    // ----- 메인 루프 -----
    function tick(t) {
        const dt = Math.min(50, t - (lastTickAt || t)) / 1000;
        lastTickAt = t;

        if (inStage) {
            const remain = Math.max(0, (stageEndsAt - t) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) { endStage(); rafId = requestAnimationFrame(tick); return; }

            // 플레이어 이동 (키보드)
            const areaW = playArea.clientWidth;
            if (keys.left) playerX = Math.max(playerW / 2, playerX - cfg.playerSpeed * dt);
            if (keys.right) playerX = Math.min(areaW - playerW / 2, playerX + cfg.playerSpeed * dt);
            updatePlayerEl();

            // 발사는 SPACE 키 입력에서 처리 (자동 발사 X)

            // 콤보 시간 초과 리셋
            if (combo > 0 && performance.now() - lastHitAt > cfg.stages[stageIndex].comboWindowMs * 1.4) {
                combo = 0;
                updateScoreDisplay();
            }

            // 총알 이동 (vx 있으면 사선)
            const areaWb = playArea.clientWidth;
            bullets = bullets.filter(b => {
                b.y -= cfg.bulletSpeed * dt;
                if (b.vx) b.x += b.vx * dt;
                b.el.style.top = `${b.y}px`;
                b.el.style.left = `${b.x - 8}px`;
                if (b.y < -20 || b.x < -20 || b.x > areaWb + 20) {
                    b.el.remove();
                    return false;
                }
                return true;
            });

            // 적 이동
            const areaH = playArea.clientHeight;
            enemies = enemies.filter(e => {
                if (!e.alive) return false;
                e.y += e.speed * dt;
                e.el.style.top = `${e.y}px`;
                if (e.y > areaH + 20) {
                    e.el.remove();
                    // 통과시 콤보만 리셋 (페널티 없음 — 너무 빡빡)
                    return false;
                }
                return true;
            });

            // 충돌
            checkCollisions();
        }

        rafId = requestAnimationFrame(tick);
    }

    function startStage(localIdx) {
        localStageIdx = localIdx;
        stageIndex = stageIndices[localIdx];
        const stage = cfg.stages[stageIndex];
        stageEl.textContent = `${localIdx + 1} / ${totalStagesThisRun}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        combo = 0;
        updateScoreDisplay();

        // 플레이어 중앙 배치
        requestAnimationFrame(() => {
            playerX = playArea.clientWidth / 2;
            updatePlayerEl();
        });

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            spawnEnemy();
            spawnTimer = setInterval(spawnEnemy, stage.spawnIntervalMs);
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
        enemies.forEach(e => e.el.remove());
        enemies = [];
        bullets.forEach(b => b.el.remove());
        bullets = [];
        const nextLocal = localStageIdx + 1;
        if (nextLocal >= totalStagesThisRun) {
            setTimeout(finishGame, 1000);
        } else {
            setTimeout(() => startStage(nextLocal), 1400);
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
        // 도전 횟수 증가 — 다음 도전부터 더 강한 무기 + 더 많은 적
        state.shooterAttempts = (state.shooterAttempts || 0) + 1;
        commit();
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
        showIntroInstruction(screen, "🚀 ← → 이동 + SPACE 발사!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameShooter")) {
        showTutorial("gameShooter", startGame);
    } else {
        startGame();
    }
};
