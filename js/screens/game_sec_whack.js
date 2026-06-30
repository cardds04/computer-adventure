/* ============================================================
   7단원 스텝 1: 바이러스 잡기 (두더지 잡기 / Whac-A-Mole)
   구멍에서 튀어나오는 바이러스를 백신 망치로 클릭 처치.
   안전한 파일을 때리면 감점! 30초 콤보 고득점.
   ============================================================ */

SCREEN_RENDERERS.gameSecWhack = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-whack" });

    const VIRUS = ["🦠", "🐛", "👾", "💀", "🪲"];
    const SAFE = ["📄", "😊", "🗂️", "📁"];
    const TIME = 35;
    const HIT = 5000;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, combo = 0, finished = false, secs = TIME;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;

    // HUD
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const timerEl = el("span", { class: "hud-chip__big", text: TIME + ".0", style: { color: "var(--secondary-dark)" } });
    const comboEl = el("span", { class: "sec-combo" });
    const lvlChip = makeLevelChip(); lvlChip.update(state.points);
    const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" }, el("span", { text: "⏱️" }), timerEl),
        lvlChip.chip,
        el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
    );
    screen.appendChild(hud);
    screen.appendChild(el("div", { class: "sec-title", text: "🦠 바이러스를 망치로 처치! 😊 안전한 파일은 때리지 마세요!" }));
    screen.appendChild(comboEl);

    // 3x3 구멍
    const board = el("div", { class: "sec-holes" });
    const holes = [];
    for (let i = 0; i < 9; i++) {
        const pop = el("div", { class: "sec-pop" });
        const hole = el("div", { class: "sec-hole" }, pop);
        const obj = { el: hole, pop, busy: false, kind: null, timer: null };
        pop.addEventListener("click", () => whack(obj));
        holes.push(obj); board.appendChild(hole);
    }
    screen.appendChild(board);
    screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 빠르게 연속으로 잡으면 콤보 점수 폭발! 안전한 파일은 그냥 두세요" }));
    root.appendChild(screen);

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }
    function showCombo() { comboEl.textContent = combo >= 2 ? `🔥 ${combo} 콤보!` : ""; comboEl.classList.toggle("show", combo >= 2); }

    function clearHole(o) { o.busy = false; o.kind = null; o.pop.className = "sec-pop"; o.pop.textContent = "";
        if (o.timer) { clearTimeout(o.timer); o.timer = null; } }

    function spawn() {
        if (finished) return;
        const free = holes.filter(h => !h.busy);
        if (!free.length) return;
        const o = free[Math.floor(Math.random() * free.length)];
        const isVirus = Math.random() < 0.78;
        o.busy = true; o.kind = isVirus ? "virus" : "safe";
        o.pop.textContent = isVirus ? VIRUS[Math.floor(Math.random() * VIRUS.length)] : SAFE[Math.floor(Math.random() * SAFE.length)];
        o.pop.className = "sec-pop up " + (isVirus ? "virus" : "safe");
        const life = 850 + Math.random() * 500;
        o.timer = setTimeout(() => { if (o.busy) { if (o.kind === "virus") combo = 0; showCombo(); clearHole(o); } }, life);
    }

    function whack(o) {
        if (finished || !o.busy) return;
        const r = o.pop.getBoundingClientRect();
        if (o.kind === "virus") {
            combo++; const gain = HIT + (combo - 1) * 600; score += gain; updateScore(); showCombo();
            o.pop.classList.add("hit"); Audio.bigCorrect && Audio.bigCorrect(Math.min(8, 3 + combo));
            emitParticles(r.left + r.width / 2, r.top + r.height / 2, 10, ["💥", "✨", "⭐", "🔨"]);
            showFloat(r.left + r.width / 2, r.top, `+${gain.toLocaleString()}`, "good");
            setTimeout(() => clearHole(o), 160);
        } else {
            score = Math.max(0, score - 3000); combo = 0; updateScore(); showCombo();
            o.pop.classList.add("oops"); Audio.wrong && Audio.wrong();
            showFloat(r.left + r.width / 2, r.top, "-3,000", "bad");
            setTimeout(() => clearHole(o), 200);
        }
    }

    function showFloat(x, y, txt, kind) {
        const f = el("div", { class: "sec-float " + (kind === "bad" ? "bad" : "good"), text: txt });
        f.style.left = x + "px"; f.style.top = y + "px"; document.body.appendChild(f);
        setTimeout(() => f.remove(), 800);
    }

    // 진행
    let spawnTimer = setInterval(spawn, 620);
    let tick = setInterval(() => {
        if (finished) return;
        secs -= 0.1; timerEl.textContent = Math.max(0, secs).toFixed(1);
        timerEl.style.color = secs < 6 ? "#d63031" : "var(--secondary-dark)";
        if (secs <= 0) finishGame();
    }, 100);

    function cleanup() { finished = true; clearInterval(spawnTimer); clearInterval(tick);
        holes.forEach(h => h.timer && clearTimeout(h.timer)); }

    function finishGame() {
        if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score, bestCombo: 0, leveledUp: newLevel > prevLevel, newLevel });
    }

    updateScore();
    const startGame = () => { showCarryOverBanner(startingScore); spawn(); };
    if (typeof hasSeenTutorial === "function" && !hasSeenTutorial("gameSecWhack")) showTutorial("gameSecWhack", startGame);
    else startGame();
};
