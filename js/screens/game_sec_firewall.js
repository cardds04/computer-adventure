/* ============================================================
   7단원 스텝 2: 방화벽 디펜스 (벽돌깨기 / Breakout)
   방화벽 패들로 공을 튕겨 위쪽 '해킹 벽돌(악성코드)'을 격파!
   ============================================================ */

SCREEN_RENDERERS.gameSecFirewall = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-firewall" });

    const COLS = 7, ROWS = 4, BRICKPTS = 3000;
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, lives = 3, wave = 1, finished = false;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;

    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const livesEl = el("span", { class: "hud-chip__big", text: "❤️❤️❤️" });
    const lvlChip = makeLevelChip(); lvlChip.update(state.points);
    const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
    screen.appendChild(el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" }, el("span", { text: "🧱" }), el("span", { class: "stat-chip__label", text: "목숨" }), livesEl),
        lvlChip.chip,
        el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
    ));
    screen.appendChild(el("div", { class: "sec-title", text: "🛡️ 방화벽으로 공을 튕겨 해킹 벽돌을 모두 부숴라! (← →)" }));

    const field = el("div", { class: "sec-bk-field" });
    const paddle = el("div", { class: "sec-paddle", text: "🛡️" });
    const ballEl = el("div", { class: "sec-ball", text: "⚡" });
    field.appendChild(paddle); field.appendChild(ballEl);
    screen.appendChild(field);
    screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 공을 떨어뜨리지 말고 다 부수면 다음 웨이브! 점수가 쭉쭉 올라가요" }));
    root.appendChild(screen);

    let W = 560, H = 460, PW = 100, PH = 16, R = 11;
    let px = 280, py = 0, bx = 280, by = 300, vx = 0, vy = 0, bricks = [], rafId = null, last = 0;
    let leftHeld = false, rightHeld = false, launched = false;

    function measure() {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        PW = Math.max(70, W * 0.2); R = Math.max(9, W * 0.022); py = H - 28;
    }

    function buildBricks() {
        bricks.forEach(b => b.el && b.el.remove()); bricks = [];
        const offX = W * 0.04, offY = H * 0.10, gap = W * 0.012;
        const bw = (W * 0.92 - gap * (COLS - 1)) / COLS, bh = H * 0.05;
        const skins = ["🐛", "🦠", "👾", "💣"];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const x = offX + c * (bw + gap), y = offY + r * (bh + gap);
            const e = el("div", { class: "sec-brick", text: skins[r % skins.length] });
            e.style.cssText += `left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;`;
            field.appendChild(e);
            bricks.push({ x, y, w: bw, h: bh, el: e, alive: true });
        }
    }

    function resetBall() {
        launched = false; bx = px; by = py - R - 4; vx = 0; vy = 0; drawBall();
    }
    function launch() {
        if (launched) return; launched = true;
        const sp = (H * 0.62) * (1 + (wave - 1) * 0.12);
        vx = (Math.random() < 0.5 ? -1 : 1) * sp * 0.5; vy = -sp;
    }
    function drawBall() { ballEl.style.left = (bx - R) + "px"; ballEl.style.top = (by - R) + "px";
        ballEl.style.width = ballEl.style.height = (R * 2) + "px"; }
    function drawPaddle() { paddle.style.left = (px - PW / 2) + "px"; paddle.style.top = py + "px";
        paddle.style.width = PW + "px"; paddle.style.height = PH + "px"; }

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

    function tick(t) {
        if (finished) return;
        const dt = Math.min(40, t - last) / 1000; last = t;
        const mv = W * 1.7;
        if (leftHeld) px = Math.max(PW / 2, px - mv * dt);
        if (rightHeld) px = Math.min(W - PW / 2, px + mv * dt);
        drawPaddle();

        if (!launched) { bx = px; drawBall(); rafId = requestAnimationFrame(tick); return; }

        bx += vx * dt; by += vy * dt;
        if (bx < R) { bx = R; vx = Math.abs(vx); } else if (bx > W - R) { bx = W - R; vx = -Math.abs(vx); }
        if (by < R) { by = R; vy = Math.abs(vy); }
        // 패들
        if (vy > 0 && by + R >= py && by < py + PH && bx > px - PW / 2 - R && bx < px + PW / 2 + R) {
            by = py - R; const hit = (bx - px) / (PW / 2); const sp = Math.hypot(vx, vy);
            vx = hit * sp * 0.75; vy = -Math.abs(Math.sqrt(Math.max(0.2, 1 - (hit * 0.75) ** 2)) * sp);
            Audio.tick && Audio.tick();
        }
        // 벽돌
        for (const b of bricks) {
            if (!b.alive) continue;
            if (bx + R > b.x && bx - R < b.x + b.w && by + R > b.y && by - R < b.y + b.h) {
                b.alive = false; b.el.classList.add("dead"); setTimeout(() => b.el.remove(), 200);
                vy = -vy; score += BRICKPTS; updateScore();
                Audio.bigCorrect && Audio.bigCorrect(4);
                const fr = field.getBoundingClientRect();
                emitParticles(fr.left + b.x + b.w / 2, fr.top + b.y + b.h / 2, 7, ["💥", "✨", "🧱"]);
                break;
            }
        }
        // 다 부숨 → 다음 웨이브
        if (bricks.every(b => !b.alive)) { wave++; score += 10000; updateScore(); buildBricks(); resetBall();
            showBanner(`🌊 웨이브 ${wave}! +10,000 보너스`); }
        // 바닥
        if (by - R > H) {
            lives--; updateLives();
            if (lives <= 0) return finishGame();
            resetBall();
        }
        drawBall();
        rafId = requestAnimationFrame(tick);
    }

    function showBanner(txt) {
        const b = el("div", { class: "sec-banner", text: txt }); screen.appendChild(b);
        setTimeout(() => b.remove(), 1300);
    }

    function cleanup() { finished = true; if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); }

    function finishGame() {
        if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score, bestCombo: wave, leveledUp: newLevel > prevLevel, newLevel });
    }

    updateScore(); updateLives();
    const startGame = () => {
        showCarryOverBanner(startingScore);
        setTimeout(() => {   // 레이아웃 잡힌 뒤 측정
            measure(); px = W / 2; drawPaddle(); buildBricks(); resetBall();
            last = performance.now(); rafId = requestAnimationFrame(tick);
            showBanner("클릭 또는 Space로 공 발사! 🚀");
        }, 60);
    };
    if (typeof hasSeenTutorial === "function" && !hasSeenTutorial("gameSecFirewall")) showTutorial("gameSecFirewall", startGame);
    else startGame();
};
