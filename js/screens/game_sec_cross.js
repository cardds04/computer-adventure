/* ============================================================
   7단원 스텝 5: 안전하게 데이터 전송 (길건너기 / Frogger)
   데이터를 들고 위험한 인터넷 도로(해커 차·바이러스)를 피해 서버까지!
   ============================================================ */

SCREEN_RENDERERS.gameSecCross = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-cross" });

    const ROWS = 7, TIME = 45, CROSSPTS = 20000;   // row0=서버(안전), row6=출발(안전), 1~5=도로
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, lives = 3, crossings = 0, finished = false, secs = TIME;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;

    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const livesEl = el("span", { class: "hud-chip__big", text: "❤️❤️❤️" });
    const timerEl = el("span", { class: "hud-chip__big", text: TIME + ".0", style: { color: "var(--secondary-dark)" } });
    const lvlChip = makeLevelChip(); lvlChip.update(state.points);
    const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
    screen.appendChild(el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" }, el("span", { text: "❤️" }), livesEl),
        el("span", { class: "hud-chip" }, el("span", { text: "⏱️" }), timerEl),
        lvlChip.chip,
        el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
    ));
    screen.appendChild(el("div", { class: "sec-title", text: "💾 데이터를 들고 도로를 건너 🖥️ 서버까지! 해커 차·바이러스를 피해! (↑↓←→)" }));

    const field = el("div", { class: "sec-cross-field" });
    field.style.setProperty("--rows", ROWS);
    // 레인 배경
    for (let r = 0; r < ROWS; r++) {
        const lane = el("div", { class: "sec-lane " + (r === 0 ? "lane--server" : r === ROWS - 1 ? "lane--start" : "lane--road") });
        lane.style.cssText += `top:${r / ROWS * 100}%;height:${1 / ROWS * 100}%;`;
        if (r === 0) lane.appendChild(el("span", { class: "sec-lane__label", text: "🖥️ 안전한 서버" }));
        field.appendChild(lane);
    }
    const hero = el("div", { class: "sec-hero", text: "💾" });
    field.appendChild(hero);
    screen.appendChild(field);
    screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 위로 올라가 서버에 닿으면 +20,000! 차에 부딪히면 처음으로. 많이 건널수록 고득점!" }));
    root.appendChild(screen);

    const HEROHALF = 0.045;
    let cx = 0.5, row = ROWS - 1, hazards = [], rafId = null, last = 0, hopCd = 0;
    const HAZ = ["🚗", "🚙", "🦠", "🚚", "👾"];

    // 도로 레인마다 장애물 생성 (방향·속도 다름)
    function buildHazards() {
        hazards.forEach(h => h.el.remove()); hazards = [];
        for (let r = 1; r <= ROWS - 2; r++) {
            const dir = r % 2 === 0 ? 1 : -1;
            const speed = (0.14 + Math.random() * 0.12 + crossings * 0.012) * dir;
            const count = 2 + (r % 2);
            for (let i = 0; i < count; i++) {
                const e = el("div", { class: "sec-haz", text: HAZ[Math.floor(Math.random() * HAZ.length)] });
                field.appendChild(e);
                hazards.push({ el: e, lane: r, x: (i / count) + Math.random() * 0.1, w: 0.12, vx: speed });
            }
        }
    }

    function placeHero() {
        hero.style.left = (cx * 100) + "%";
        hero.style.top = ((row + 0.5) / ROWS * 100) + "%";
    }
    function placeHaz(h) { h.el.style.left = (h.x * 100) + "%"; h.el.style.top = ((h.lane + 0.5) / ROWS * 100) + "%"; }

    function onKey(e) {
        if (finished) return;
        if (e.key === "ArrowUp") { if (hopCd <= 0 && row > 0) { row--; hop(); } e.preventDefault(); }
        else if (e.key === "ArrowDown") { if (hopCd <= 0 && row < ROWS - 1) { row++; hop(); } e.preventDefault(); }
        else if (e.key === "ArrowLeft") { cx = Math.max(0.04, cx - 0.07); placeHero(); e.preventDefault(); }
        else if (e.key === "ArrowRight") { cx = Math.min(0.96, cx + 0.07); placeHero(); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);
    function hop() { hopCd = 0.12; placeHero();
        hero.classList.remove("hop"); void hero.offsetWidth; hero.classList.add("hop");
        if (row === 0) reachServer(); }

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }
    function updateLives() { livesEl.textContent = "❤️".repeat(Math.max(0, lives)) || "💀"; }

    function reachServer() {
        crossings++; const g = CROSSPTS + (crossings - 1) * 3000; score += g; updateScore();
        Audio.bigCorrect && Audio.bigCorrect(8);
        const r = field.getBoundingClientRect();
        emitParticles(r.left + cx * r.width, r.top + 30, 18, ["🎉", "✨", "⭐", "💾", "🖥️"]);
        banner(`✅ 전송 성공! +${g.toLocaleString()}`);
        row = ROWS - 1; cx = 0.5; placeHero(); buildHazards();
    }
    function hitHazard() {
        lives--; updateLives(); Audio.wrong && Audio.wrong();
        hero.classList.remove("hurt"); void hero.offsetWidth; hero.classList.add("hurt");
        const r = field.getBoundingClientRect();
        emitParticles(r.left + cx * r.width, r.top + ((row + 0.5) / ROWS) * r.height, 12, ["💥", "⚠️"]);
        if (lives <= 0) return finishGame();
        row = ROWS - 1; cx = 0.5; placeHero();
    }

    function banner(txt) { const b = el("div", { class: "sec-banner", text: txt }); screen.appendChild(b); setTimeout(() => b.remove(), 1200); }

    function tick(t) {
        if (finished) return;
        const dt = Math.min(40, t - last) / 1000; last = t;
        if (hopCd > 0) hopCd -= dt;
        hazards.forEach(h => {
            h.x += h.vx * dt;
            if (h.x > 1.12) h.x = -0.12; else if (h.x < -0.12) h.x = 1.12;
            placeHaz(h);
            if (h.lane === row && Math.abs(h.x - cx) < (h.w / 2 + HEROHALF)) hitHazard();
        });
        rafId = requestAnimationFrame(tick);
    }

    let timerInt = null;
    function cleanup() { finished = true; if (rafId) cancelAnimationFrame(rafId); clearInterval(timerInt); window.removeEventListener("keydown", onKey); }

    function finishGame() {
        if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score, bestCombo: crossings, leveledUp: newLevel > prevLevel, newLevel });
    }

    updateScore(); updateLives(); placeHero();
    const startGame = () => {
        showCarryOverBanner(startingScore); buildHazards();
        last = performance.now(); rafId = requestAnimationFrame(tick);
        timerInt = setInterval(() => { if (finished) return; secs -= 0.1; timerEl.textContent = Math.max(0, secs).toFixed(1);
            timerEl.style.color = secs < 8 ? "#d63031" : "var(--secondary-dark)"; if (secs <= 0) finishGame(); }, 100);
    };
    if (typeof hasSeenTutorial === "function" && !hasSeenTutorial("gameSecCross")) showTutorial("gameSecCross", startGame);
    else startGame();
};
