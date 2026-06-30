/* ============================================================
   7단원 스텝 2: 방화벽 디펜스 (벽돌깨기 + 보스 + 아이템)
   방화벽 패들로 공을 튕겨 가운데 '왕(OVERSEER 보스)'을 부수면 승리!
   벽돌을 깨면 가끔 아이템(멀티볼·스피드·와이드·목숨)이 떨어진다.
   ============================================================ */

SCREEN_RENDERERS.gameSecFirewall = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-firewall" });

    const STORY = [
        { img: "assets/security/firewall_story1.jpeg", text: "초기 바이러스는 모두 처치했어! 그런데… 거대한 대장 바이러스 ‘OVERSEER’가 깨어났다! 😱" },
        { img: "assets/security/firewall_story2.jpeg", text: "괴물이 도시로 뛰쳐나왔어! 사람들이 비명을 지르며 도망친다… 🏃💨" },
        { img: "assets/security/firewall_story3.jpeg", text: "지구방위대가 거대한 방벽 뒤에서 맞서 싸운다! 방벽을 지켜 괴물 왕을 쓰러뜨려라! 🛡️👑" },
    ];

    const COLS = 7, ROWS = 4, BRICKPTS = 2000, BOSS_HP = 24, BOSSHITPTS = 1500;
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, lives = 3, finished = false;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;

    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const livesEl = el("span", { class: "hud-chip__big", text: "❤️❤️❤️" });
    const lvlChip = makeLevelChip(); lvlChip.update(state.points);
    const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
    screen.appendChild(el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" }, el("span", { text: "❤️" }), livesEl),
        lvlChip.chip,
        el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
    ));
    screen.appendChild(el("div", { class: "sec-title", text: "🛡️ 방벽으로 공을 튕겨 가운데 👑왕을 부숴라! 아이템도 받아! (← →)" }));

    const field = el("div", { class: "sec-bk-field" });
    field.style.background = "linear-gradient(rgba(8,12,26,.42),rgba(8,12,26,.55)), url('assets/security/firewall_bg.jpeg') center/cover no-repeat";
    const paddle = el("div", { class: "sec-paddle", text: "🛡️" });
    field.appendChild(paddle);
    screen.appendChild(field);
    screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 떨어지는 아이템을 방벽으로 받으면 공이 늘거나 빨라져요! 왕을 부수면 끝!" }));
    root.appendChild(screen);

    let W = 560, H = 460, PW = 100, PH = 16, R = 11;
    let px = 280, py = 0, balls = [], bricks = [], items = [], boss = null, bossEl = null, hpFill = null;
    let rafId = null, last = 0, leftHeld = false, rightHeld = false, started = false;

    function measure() {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        PW = Math.max(70, W * 0.2); R = Math.max(9, W * 0.022); py = H - 28;
    }
    function drawPaddle() { paddle.style.left = (px - PW / 2) + "px"; paddle.style.top = py + "px";
        paddle.style.width = PW + "px"; paddle.style.height = PH + "px"; }

    // ----- 공 (멀티볼) -----
    function addBall(x, y, vx, vy, stuck) {
        const e = el("div", { class: "sec-ball", text: "⚡" });
        e.style.width = e.style.height = (R * 2) + "px";
        field.appendChild(e);
        balls.push({ x, y, vx, vy, el: e, stuck: !!stuck });
    }
    function clearBalls() { balls.forEach(b => b.el.remove()); balls = []; }
    function drawBall(b) { b.el.style.left = (b.x - R) + "px"; b.el.style.top = (b.y - R) + "px"; }
    function baseSpeed() { return H * 0.66; }
    function spawnStuckBall() { addBall(px, py - R - 4, 0, 0, true); }
    function launch() {
        let any = false;
        balls.forEach(b => { if (b.stuck) { b.stuck = false; const sp = baseSpeed();
            b.vx = (Math.random() < 0.5 ? -1 : 1) * sp * 0.5; b.vy = -sp; any = true; } });
        return any;
    }

    // ----- 보스 + 벽돌 -----
    function rectsOverlap(ax, ay, aw, ah, bx2, by2, bw2, bh2) {
        return ax < bx2 + bw2 && ax + aw > bx2 && ay < by2 + bh2 && ay + ah > by2;
    }
    function buildLevel() {
        bricks.forEach(b => b.el && b.el.remove()); bricks = [];
        if (bossEl) { bossEl.remove(); bossEl = null; }
        const offX = W * 0.04, offY = H * 0.07, gap = W * 0.012;
        const bw = (W * 0.92 - gap * (COLS - 1)) / COLS, bh = H * 0.05;
        // 보스(왕) 가운데 위쪽
        const bossW = W * 0.26, bossH = H * 0.15, bossX = W / 2 - bossW / 2, bossY = H * 0.05;
        boss = { x: bossX, y: bossY, w: bossW, h: bossH, hp: BOSS_HP, alive: true };
        bossEl = el("div", { class: "sec-boss" },
            el("div", { class: "sec-boss__hp" }, hpFill = el("div", { class: "sec-boss__hpfill" })),
            el("span", { class: "sec-boss__face", text: "👑" }),
        );
        bossEl.style.cssText += `left:${bossX}px;top:${bossY}px;width:${bossW}px;height:${bossH}px;`;
        field.appendChild(bossEl);
        // 벽돌 (보스와 겹치는 칸은 건너뜀)
        const skins = ["🐛", "🦠", "👾", "💣"];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const x = offX + c * (bw + gap), y = offY + r * (bh + gap);
            if (rectsOverlap(x, y, bw, bh, bossX - 4, bossY - 4, bossW + 8, bossH + 8)) continue;
            const e = el("div", { class: "sec-brick", text: skins[r % skins.length] });
            e.style.cssText += `left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;`;
            field.appendChild(e);
            bricks.push({ x, y, w: bw, h: bh, el: e, alive: true });
        }
    }

    // ----- 아이템 -----
    const ITEMS = [
        { kind: "multi", icon: "🔵", color: "#4aa3ff" },
        { kind: "fast",  icon: "⚡", color: "#ffd34d" },
        { kind: "wide",  icon: "📏", color: "#7be08a" },
        { kind: "life",  icon: "❤️", color: "#ff6b8a" },
    ];
    function dropItem(x, y) {
        const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const e = el("div", { class: "sec-item", text: def.icon });
        e.style.left = x + "px"; e.style.top = y + "px";
        e.style.boxShadow = `0 0 12px ${def.color}`;
        field.appendChild(e);
        items.push({ x, y, vy: H * 0.30, kind: def.kind, el: e });
    }
    function applyItem(kind) {
        if (kind === "multi") {
            const cur = balls.filter(b => !b.stuck);
            (cur.length ? cur : balls).forEach(b => { const sp = Math.hypot(b.vx, b.vy) || baseSpeed();
                addBall(b.x, b.y, -b.vx || sp * 0.4, b.vy || -sp); });
            showBanner("🔵 멀티볼! 공이 늘었다!");
        } else if (kind === "fast") {
            balls.forEach(b => { b.vx *= 1.28; b.vy *= 1.28; });
            showBanner("⚡ 스피드 업!");
        } else if (kind === "wide") {
            PW = Math.min(W * 0.5, PW * 1.4); drawPaddle(); showBanner("📏 방벽이 넓어졌다!");
        } else if (kind === "life") {
            lives++; updateLives(); showBanner("❤️ 목숨 +1!");
        }
        Audio.bigCorrect && Audio.bigCorrect(6);
    }

    // ----- 입력 -----
    function onKey(e) { if (finished) return;
        if (e.key === "ArrowLeft") { leftHeld = true; e.preventDefault(); }
        else if (e.key === "ArrowRight") { rightHeld = true; e.preventDefault(); }
        else if (e.key === " " || e.key === "ArrowUp") { launch(); e.preventDefault(); } }
    function onKeyUp(e) { if (e.key === "ArrowLeft") leftHeld = false; else if (e.key === "ArrowRight") rightHeld = false; }
    function onMove(e) { if (finished) return; const r = field.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        px = Math.max(PW / 2, Math.min(W - PW / 2, cx)); drawPaddle(); }
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp);
    field.addEventListener("mousemove", onMove); field.addEventListener("touchmove", onMove, { passive: true });
    field.addEventListener("click", launch);

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }
    function updateLives() { livesEl.textContent = "❤️".repeat(Math.max(0, lives)) || "💀"; }
    function showBanner(txt) { const b = el("div", { class: "sec-banner", text: txt }); screen.appendChild(b); setTimeout(() => b.remove(), 1200); }

    function hitBoss(b) {
        b.vy = Math.abs(b.vy); boss.hp--; if (hpFill) hpFill.style.width = Math.max(0, boss.hp / BOSS_HP * 100) + "%";
        score += BOSSHITPTS; updateScore(); Audio.tick && Audio.tick();
        bossEl.classList.remove("hit"); void bossEl.offsetWidth; bossEl.classList.add("hit");
        const fr = field.getBoundingClientRect();
        emitParticles(fr.left + boss.x + boss.w / 2, fr.top + boss.y + boss.h / 2, 6, ["💥", "✨"]);
        if (boss.hp <= 0) { boss.alive = false; bossEl.classList.add("dead");
            score += 120000; updateScore();
            for (let i = 0; i < 5; i++) setTimeout(() => emitParticles(fr.left + boss.x + boss.w / 2, fr.top + boss.y + boss.h / 2, 16, ["🎉", "👑", "💥", "⭐", "✨"]), i * 180);
            showBanner("👑 왕을 쓰러뜨렸다! 승리! +120,000");
            setTimeout(() => winGame(), 1600);
        }
    }

    function tick(t) {
        if (finished) return;
        const dt = Math.min(40, t - last) / 1000; last = t;
        const mv = W * 1.7;
        if (leftHeld) px = Math.max(PW / 2, px - mv * dt);
        if (rightHeld) px = Math.min(W - PW / 2, px + mv * dt);
        drawPaddle();

        // 아이템 낙하
        items.forEach(it => {
            if (!it.el) return; it.y += it.vy * dt; it.el.style.top = it.y + "px";
            if (it.y > py - 6 && it.y < py + PH + 10 && it.x > px - PW / 2 - 10 && it.x < px + PW / 2 + 10) {
                applyItem(it.kind); it.el.remove(); it.el = null;
            } else if (it.y > H + 20) { it.el.remove(); it.el = null; }
        });
        items = items.filter(it => it.el);

        // 공
        balls.forEach(b => {
            if (b.stuck) { b.x = px; b.y = py - R - 4; drawBall(b); return; }
            b.x += b.vx * dt; b.y += b.vy * dt;
            if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); } else if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); }
            if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }
            // 패들
            if (b.vy > 0 && b.y + R >= py && b.y < py + PH && b.x > px - PW / 2 - R && b.x < px + PW / 2 + R) {
                b.y = py - R; const hit = (b.x - px) / (PW / 2); const sp = Math.hypot(b.vx, b.vy);
                b.vx = hit * sp * 0.75; b.vy = -Math.abs(Math.sqrt(Math.max(0.2, 1 - (hit * 0.75) ** 2)) * sp);
                Audio.tick && Audio.tick();
            }
            // 벽돌
            for (const br of bricks) {
                if (!br.alive) continue;
                if (b.x + R > br.x && b.x - R < br.x + br.w && b.y + R > br.y && b.y - R < br.y + br.h) {
                    br.alive = false; br.el.classList.add("dead"); setTimeout(() => br.el.remove(), 180);
                    b.vy = -b.vy; score += BRICKPTS; updateScore();
                    Audio.bigCorrect && Audio.bigCorrect(3);
                    const fr = field.getBoundingClientRect();
                    emitParticles(fr.left + br.x + br.w / 2, fr.top + br.y + br.h / 2, 6, ["💥", "✨", "🧱"]);
                    if (Math.random() < 0.24) dropItem(br.x + br.w / 2, br.y + br.h / 2);
                    break;
                }
            }
            // 보스
            if (boss && boss.alive && b.x + R > boss.x && b.x - R < boss.x + boss.w && b.y + R > boss.y && b.y - R < boss.y + boss.h) {
                hitBoss(b);
            }
            drawBall(b);
        });

        // 바닥으로 떨어진 공 제거
        const lost = balls.filter(b => !b.stuck && b.y - R > H);
        if (lost.length) { lost.forEach(b => b.el.remove()); balls = balls.filter(b => lost.indexOf(b) < 0); }

        // 공이 다 떨어지면 목숨 -1
        if (balls.length === 0 && boss && boss.alive) {
            lives--; updateLives();
            if (lives <= 0) return loseGame();
            PW = Math.max(70, W * 0.2);   // 패들 폭 리셋
            spawnStuckBall();
            setTimeout(() => { if (!finished) launch(); }, 900);
        }
        // 벽돌 다 깨졌는데 보스 살아있으면 새 벽돌
        if (boss && boss.alive && bricks.every(b => !b.alive)) { rebuildBricksOnly(); }

        rafId = requestAnimationFrame(tick);
    }

    function rebuildBricksOnly() {
        const offX = W * 0.04, offY = H * 0.07, gap = W * 0.012;
        const bw = (W * 0.92 - gap * (COLS - 1)) / COLS, bh = H * 0.05;
        const skins = ["🐛", "🦠", "👾", "💣"];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const x = offX + c * (bw + gap), y = offY + r * (bh + gap);
            if (rectsOverlap(x, y, bw, bh, boss.x - 4, boss.y - 4, boss.w + 8, boss.h + 8)) continue;
            const e = el("div", { class: "sec-brick", text: skins[r % skins.length] });
            e.style.cssText += `left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;`;
            field.appendChild(e); bricks.push({ x, y, w: bw, h: bh, el: e, alive: true });
        }
        showBanner("🧱 적 보강! 계속 공격!");
    }

    function cleanup() { finished = true; if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); }

    function endTo(resultScore) {
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, resultScore);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score: resultScore, bestCombo: 0, leveledUp: newLevel > prevLevel, newLevel });
    }
    function winGame() { if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver(); endTo(score); }
    function loseGame() { if (finished) return; finished = true; cleanup(); Audio.wrong && Audio.wrong();
        showBanner("💀 방벽이 뚫렸어요…"); setTimeout(() => endTo(score), 1100); }

    updateScore(); updateLives();
    const startGame = () => {
        showCarryOverBanner(startingScore);
        setTimeout(() => {
            measure(); px = W / 2; drawPaddle(); buildLevel(); spawnStuckBall();
            last = performance.now(); rafId = requestAnimationFrame(tick);
            showBanner("← → 로 방벽을 움직여 공을 받아라! 🛡️");
            setTimeout(() => { if (!finished) launch(); }, 1300);
        }, 80);
    };
    secStoryIntro(screen, STORY, startGame);
};
