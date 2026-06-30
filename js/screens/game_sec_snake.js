/* ============================================================
   7단원 스텝 4: 개인정보 지키기 (뱀게임 / Snake)
   보안로봇이 정보 카드(📇)를 모아 길어진다. 벽·자기몸·바이러스에 닿으면 끝!
   ============================================================ */

SCREEN_RENDERERS.gameSecSnake = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-snake" });

    const COLS = 17, ROWS = 13, FOODPTS = 8000, STEP = 135, TIME = 75;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, finished = false, secs = TIME;
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
    screen.appendChild(el("div", { class: "sec-title", text: "📇 정보 카드를 모아 길어지자! 벽·바이러스·몸에 닿으면 끝! (방향키)" }));

    const board = el("div", { class: "sec-snake-board" });
    board.style.setProperty("--cols", COLS); board.style.setProperty("--rows", ROWS);
    screen.appendChild(board);
    screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 길어질수록 점수 폭발! 방향키로 조종 (반대로는 못 꺾어요)" }));
    root.appendChild(screen);

    let snake = [{ x: 4, y: 6 }, { x: 3, y: 6 }, { x: 2, y: 6 }];
    let dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 };
    let food = null, viruses = [], tickInt = null, timerInt = null;

    function cellStyle(x, y) {
        return `left:${(x / COLS * 100)}%;top:${(y / ROWS * 100)}%;width:${(1 / COLS * 100)}%;height:${(1 / ROWS * 100)}%;`;
    }
    function randEmpty() {
        for (let tries = 0; tries < 200; tries++) {
            const x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS);
            if (snake.some(s => s.x === x && s.y === y)) continue;
            if (viruses.some(v => v.x === x && v.y === y)) continue;
            if (food && food.x === x && food.y === y) continue;
            return { x, y };
        }
        return { x: 1, y: 1 };
    }
    function spawnFood() { food = randEmpty(); }
    function spawnVirus() { viruses.push(randEmpty()); }
    spawnFood(); spawnVirus(); spawnVirus();

    function render() {
        board.innerHTML = "";
        viruses.forEach(v => { const e = el("div", { class: "sec-svirus", text: "🦠" }); e.style.cssText += cellStyle(v.x, v.y); board.appendChild(e); });
        if (food) { const e = el("div", { class: "sec-food", text: "📇" }); e.style.cssText += cellStyle(food.x, food.y); board.appendChild(e); }
        snake.forEach((s, i) => { const e = el("div", { class: "sec-seg" + (i === 0 ? " sec-seg--head" : "") , text: i === 0 ? "🤖" : "" }); e.style.cssText += cellStyle(s.x, s.y); board.appendChild(e); });
    }
    render();

    function onKey(e) {
        if (finished) return;
        let nd = null;
        if (e.key === "ArrowLeft") nd = { x: -1, y: 0 };
        else if (e.key === "ArrowRight") nd = { x: 1, y: 0 };
        else if (e.key === "ArrowUp") nd = { x: 0, y: -1 };
        else if (e.key === "ArrowDown") nd = { x: 0, y: 1 };
        if (nd) { e.preventDefault(); if (nd.x !== -dir.x || nd.y !== -dir.y) nextDir = nd; }
    }
    window.addEventListener("keydown", onKey);

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }

    function step() {
        if (finished) return;
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        // 벽
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
        // 자기 몸 / 바이러스
        if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();
        if (viruses.some(v => v.x === head.x && v.y === head.y)) return gameOver();
        snake.unshift(head);
        if (food && head.x === food.x && head.y === food.y) {
            const g = FOODPTS + (snake.length - 3) * 400; score += g; updateScore();
            Audio.bigCorrect && Audio.bigCorrect(Math.min(8, 3 + Math.floor(snake.length / 3)));
            spawnFood();
            if (snake.length % 5 === 0) spawnVirus();   // 길어질수록 바이러스 증가
        } else { snake.pop(); }
        render();
    }

    function cleanup() { finished = true; clearInterval(tickInt); clearInterval(timerInt); window.removeEventListener("keydown", onKey); }

    function gameOver() {
        const head = snake[0];
        const r = board.getBoundingClientRect();
        emitParticles(r.left + (head.x + 0.5) / COLS * r.width, r.top + (head.y + 0.5) / ROWS * r.height, 14, ["💥", "⚠️", "🦠"]);
        finishGame();
    }

    function finishGame() {
        if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score, bestCombo: snake.length, leveledUp: newLevel > prevLevel, newLevel });
    }

    updateScore();
    const startGame = () => {
        showCarryOverBanner(startingScore);
        tickInt = setInterval(step, STEP);
        timerInt = setInterval(() => { if (finished) return; secs -= 0.1; timerEl.textContent = Math.max(0, secs).toFixed(1);
            timerEl.style.color = secs < 8 ? "#d63031" : "var(--secondary-dark)"; if (secs <= 0) finishGame(); }, 100);
    };
    if (typeof hasSeenTutorial === "function" && !hasSeenTutorial("gameSecSnake")) showTutorial("gameSecSnake", startGame);
    else startGame();
};
