/* ============================================================
   7단원 스텝 3: 피싱 피하기 (받기 게임 / Catcher)
   안전한 정보(🔐)는 바구니로 받고, 피싱 미끼(🪝)·바이러스는 피하자!
   ============================================================ */

SCREEN_RENDERERS.gameSecCatch = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-catch" });

    const GOOD = ["🔐", "🔑", "🛡️", "💊", "✅"];
    const BAD = ["🪝", "🦠", "💣", "🎁", "👾"];
    const TIME = 35, GOODPTS = 5000;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, combo = 0, finished = false, secs = TIME;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;

    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const timerEl = el("span", { class: "hud-chip__big", text: TIME + ".0", style: { color: "var(--secondary-dark)" } });
    const lvlChip = makeLevelChip(); lvlChip.update(state.points);
    const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
    screen.appendChild(el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" }, el("span", { text: "⏱️" }), timerEl),
        lvlChip.chip,
        el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
    ));
    screen.appendChild(el("div", { class: "sec-title", text: "🔐 안전한 정보는 받고, 🪝 피싱 미끼는 피하세요! (← →)" }));

    const field = el("div", { class: "sec-field" });
    const basket = el("div", { class: "sec-basket", text: "🧺" });
    field.appendChild(basket);
    screen.appendChild(field);
    screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 좌우로 움직여 안전템만 쏙쏙! 피싱·바이러스를 받으면 감점이에요" }));
    root.appendChild(screen);

    let items = [], bx = 0.5, leftHeld = false, rightHeld = false, rafId = null, last = 0, lastSpawn = 0;

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }
    function placeBasket() { basket.style.left = (bx * 100) + "%"; }
    placeBasket();

    function onKey(e) {
        if (finished) return;
        if (e.key === "ArrowLeft") { leftHeld = true; e.preventDefault(); }
        else if (e.key === "ArrowRight") { rightHeld = true; e.preventDefault(); }
    }
    function onKeyUp(e) { if (e.key === "ArrowLeft") leftHeld = false; else if (e.key === "ArrowRight") rightHeld = false; }
    // 마우스/터치로도 이동
    function onMove(e) {
        if (finished) return; const r = field.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        bx = Math.max(0.05, Math.min(0.95, cx / r.width)); placeBasket();
    }
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp);
    field.addEventListener("mousemove", onMove); field.addEventListener("touchmove", onMove, { passive: true });

    function spawnItem() {
        const good = Math.random() < 0.6;
        const e = el("div", { class: "sec-fall " + (good ? "good" : "bad"),
            text: good ? GOOD[Math.floor(Math.random() * GOOD.length)] : BAD[Math.floor(Math.random() * BAD.length)] });
        const x = 0.06 + Math.random() * 0.88;
        e.style.left = (x * 100) + "%"; e.style.top = "-8%";
        field.appendChild(e);
        items.push({ el: e, x, y: -0.08, vy: 0.28 + Math.random() * 0.12 + secs * 0.0 , good });
    }

    function floatTxt(xPct, txt, kind) {
        const r = field.getBoundingClientRect();
        const f = el("div", { class: "sec-float " + (kind === "bad" ? "bad" : "good"), text: txt });
        f.style.left = (r.left + xPct * r.width) + "px"; f.style.top = (r.bottom - 70) + "px";
        document.body.appendChild(f); setTimeout(() => f.remove(), 800);
    }

    function tick(t) {
        if (finished) return;
        const dt = Math.min(50, t - last) / 1000; last = t;
        const mv = 1.1;
        if (leftHeld) bx = Math.max(0.05, bx - mv * dt);
        if (rightHeld) bx = Math.min(0.95, bx + mv * dt);
        placeBasket();
        if (t - lastSpawn > 620) { spawnItem(); lastSpawn = t; }
        items.forEach(it => {
            if (!it.el) return;
            it.y += it.vy * dt; it.el.style.top = (it.y * 100) + "%";
            // 바구니 충돌 (바닥 근처 + x 근접)
            if (it.y > 0.82 && it.y < 0.97 && Math.abs(it.x - bx) < 0.09) {
                if (it.good) { combo++; const g = GOODPTS + (combo - 1) * 500; score += g; updateScore();
                    Audio.bigCorrect && Audio.bigCorrect(Math.min(8, 3 + combo)); floatTxt(it.x, `+${g.toLocaleString()}`, "good"); }
                else { score = Math.max(0, score - 4000); combo = 0; updateScore();
                    Audio.wrong && Audio.wrong(); floatTxt(it.x, "-4,000", "bad");
                    basket.classList.remove("hurt"); void basket.offsetWidth; basket.classList.add("hurt"); }
                it.el.remove(); it.el = null;
            } else if (it.y > 1.05) { it.el.remove(); it.el = null; }
        });
        items = items.filter(it => it.el);
        rafId = requestAnimationFrame(tick);
    }

    let timerInt = setInterval(() => {
        if (finished) return; secs -= 0.1; timerEl.textContent = Math.max(0, secs).toFixed(1);
        timerEl.style.color = secs < 6 ? "#d63031" : "var(--secondary-dark)";
        if (secs <= 0) finishGame();
    }, 100);

    function cleanup() { finished = true; if (rafId) cancelAnimationFrame(rafId); clearInterval(timerInt);
        window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); }

    function finishGame() {
        if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score, bestCombo: 0, leveledUp: newLevel > prevLevel, newLevel });
    }

    updateScore();
    const startGame = () => { showCarryOverBanner(startingScore); last = performance.now(); lastSpawn = last; rafId = requestAnimationFrame(tick); };
    if (typeof hasSeenTutorial === "function" && !hasSeenTutorial("gameSecCatch")) showTutorial("gameSecCatch", startGame);
    else startGame();
};
