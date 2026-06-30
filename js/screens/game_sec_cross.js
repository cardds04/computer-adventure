/* ============================================================
   7단원 스텝 5: 백신 스네이크 (slither식 · 10단계 · 단계별 속도/색)
   8방향(방향키)+마우스 자유 조준. 주사기(💉)를 먹어 길어지고,
   바이러스(🦠)에 닿으면 죽는다. 단계가 오를수록 빨라지고 색이 바뀜.
   10단계에 도달하면 성공!
   ============================================================ */

SCREEN_RENDERERS.gameSecCross = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-snake2" });

    const STORY = [
        { img: "assets/security/cure_story1.png", text: "전투는 끝났지만 좀비가 된 병사들이 쓰러져 있어… 구급차가 도착했다! 🚑" },
        { img: "assets/security/cure_story2.jpeg", text: "의무병이 초록빛 치료 주사를 놓자 좀비가 다시 사람으로 돌아온다! 💉✨" },
        { img: "assets/security/cure_story3.png", text: "더 많은 동료를 구하자! 주사기(💉)를 모으고 바이러스(🦠)는 절대 닿지 마! 🐍" },
    ];
    const GAME_BG = "assets/security/cure_bg.jpeg";
    const MAXLV = 10, EAT_PER_LV = 2;

    // 단계별 색 (몸통 밝은/어두운, 머리 밝은/어두운)
    const LEVELS = [
        { c1: "#8ff5ad", c2: "#2faa5f", h1: "#c6ffd8", h2: "#2faa5f" }, // 1 초록
        { c1: "#7ef0e0", c2: "#1f9e8c", h1: "#c2fff4", h2: "#1f9e8c" }, // 2 청록
        { c1: "#8fd6ff", c2: "#2f86d6", h1: "#cdeeff", h2: "#2f86d6" }, // 3 하늘
        { c1: "#9aa8ff", c2: "#4444d6", h1: "#d3d8ff", h2: "#4444d6" }, // 4 파랑
        { c1: "#c79aff", c2: "#7a35d6", h1: "#e6d3ff", h2: "#7a35d6" }, // 5 보라
        { c1: "#ff9ad6", c2: "#c2358a", h1: "#ffd3ec", h2: "#c2358a" }, // 6 분홍
        { c1: "#ff9a9a", c2: "#d63a3a", h1: "#ffd3d3", h2: "#d63a3a" }, // 7 빨강
        { c1: "#ffc07a", c2: "#e07a1f", h1: "#ffe3c2", h2: "#e07a1f" }, // 8 주황
        { c1: "#ffe27a", c2: "#e0b020", h1: "#fff2c2", h2: "#e0b020" }, // 9 금색
        { c1: "#fff0a0", c2: "#ff7a1f", h1: "#fff7d0", h2: "#ff7a1f" }, // 10 무지개빛
    ];

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, finished = false, secs = 0, level = 1, eaten = 0;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    root.appendChild(screen);

    let scoreEl, timerEl, lvlChip, levelEl, field, headEl, rafId = null, timerInt = null, last = 0;
    let W = 800, H = 560, R = 14, baseSpeed = 0, speed = 0, turn = 6.4, gap = 18;
    let head = { x: 400, y: 280 }, angle = 0;
    let path = [], segEls = [], segCount = 5;
    let foods = [], viruses = [];
    let keys = { up: false, down: false, left: false, right: false };
    let mx = 0, my = 0, useMouse = false;

    function measure() {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        R = Math.max(8, Math.min(W, H) * 0.020); gap = R * 1.35;
        baseSpeed = Math.min(W, H) * 0.20;   // 시작은 아주 느리게
        applyLevel();
    }
    function speedFor(lv) { return baseSpeed * (1 + (lv - 1) * 0.15); }   // 1단계 1.0x → 10단계 ~2.35x
    function applyLevel() {
        speed = speedFor(level);
        const c = LEVELS[Math.min(level, MAXLV) - 1];
        field.style.setProperty("--snk-c1", c.c1); field.style.setProperty("--snk-c2", c.c2);
        field.style.setProperty("--snk-h1", c.h1); field.style.setProperty("--snk-h2", c.h2);
        if (levelEl) levelEl.textContent = `${level} / ${MAXLV}`;
    }

    function startPlay() {
        screen.innerHTML = "";
        scoreEl = el("span", { class: "hud-chip__big", text: `${score}` });
        timerEl = el("span", { class: "hud-chip__big", text: "0.0", style: { color: "var(--secondary-dark)" } });
        levelEl = el("span", { class: "hud-chip__big", text: "1 / " + MAXLV });
        lvlChip = makeLevelChip(); lvlChip.update(state.points + (score - startingScore));
        const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
            style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
        screen.appendChild(el("div", { class: "game__hud" },
            exitBtn,
            el("span", { class: "hud-chip" }, el("span", { text: "🐍" }), el("span", { class: "stat-chip__label", text: "단계" }), levelEl),
            el("span", { class: "hud-chip" }, el("span", { text: "⏱️" }), el("span", { class: "stat-chip__label", text: "시간" }), timerEl),
            lvlChip.chip,
            el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
                el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
        ));
        screen.appendChild(el("div", { class: "sec-title", text: "💉 주사기를 모아 길어지자! 🦠 닿으면 끝! 방향키·마우스 · 최고 10단계, 부딪힐 때까지 도전!" }));
        field = el("div", { class: "sec-snake2-field" });
        field.style.backgroundImage = `linear-gradient(rgba(8,16,12,.55),rgba(8,16,12,.66)), url('${GAME_BG}')`;
        screen.appendChild(field);
        screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 방향키는 8방향, 마우스로 더 정밀하게! 단계가 오를수록 빨라지고 색이 바뀌어요. 벽은 막혀요" }));

        measure();
        head = { x: W / 2, y: H / 2 }; angle = 0; mx = W; my = H / 2;
        path = []; for (let i = 0; i < 400; i++) path.push({ x: head.x - i * 2, y: head.y });
        segCount = 5; level = 1; eaten = 0; applyLevel();
        headEl = el("div", { class: "snk-head" }, el("span", { class: "snk-face", text: "😀" }));
        headEl.style.width = headEl.style.height = (R * 2.1) + "px";
        field.appendChild(headEl);
        segEls = []; foods = []; viruses = [];
        for (let i = 0; i < 8; i++) spawnFood();
        for (let i = 0; i < 4; i++) spawnVirus();

        showCarryOverBanner(startingScore);
        window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp);
        field.addEventListener("mousemove", onMove); field.addEventListener("touchmove", onTouch, { passive: true });
        last = performance.now(); rafId = requestAnimationFrame(tick);
        timerInt = setInterval(() => { if (finished) return; secs += 0.1; timerEl.textContent = secs.toFixed(1); }, 100);
    }

    function randPos(margin) { return { x: margin + Math.random() * (W - 2 * margin), y: margin + Math.random() * (H - 2 * margin) }; }
    function farFromHead(p, k) { return Math.hypot(p.x - head.x, p.y - head.y) > R * (k || 6); }
    function spawnFood() {
        let p; for (let t = 0; t < 30; t++) { p = randPos(R * 2.5); if (farFromHead(p)) break; }
        const e = el("div", { class: "snk-food", text: "💉" }); e.style.fontSize = (R * 2.1) + "px";
        e.style.left = p.x + "px"; e.style.top = p.y + "px"; field.appendChild(e);
        foods.push({ x: p.x, y: p.y, el: e });
    }
    function spawnVirus() {
        let p; for (let t = 0; t < 30; t++) { p = randPos(R * 3); if (farFromHead(p, 9)) break; }
        const e = el("div", { class: "snk-virus", text: "🦠" }); e.style.fontSize = (R * 2.2) + "px";
        e.style.left = p.x + "px"; e.style.top = p.y + "px"; field.appendChild(e);
        viruses.push({ x: p.x, y: p.y, el: e });
    }

    function onKey(e) {
        if (finished) return; let h = true;
        if (e.key === "ArrowUp") keys.up = true; else if (e.key === "ArrowDown") keys.down = true;
        else if (e.key === "ArrowLeft") keys.left = true; else if (e.key === "ArrowRight") keys.right = true; else h = false;
        if (h) { useMouse = false; e.preventDefault(); }
    }
    function onKeyUp(e) {
        if (e.key === "ArrowUp") keys.up = false; else if (e.key === "ArrowDown") keys.down = false;
        else if (e.key === "ArrowLeft") keys.left = false; else if (e.key === "ArrowRight") keys.right = false;
    }
    function onMove(e) { const r = field.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; useMouse = true; }
    function onTouch(e) { const r = field.getBoundingClientRect(); mx = e.touches[0].clientX - r.left; my = e.touches[0].clientY - r.top; useMouse = true; }

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }

    function targetAngle() {
        const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        if (dx || dy) return Math.atan2(dy, dx);
        if (useMouse) { const a = Math.atan2(my - head.y, mx - head.x); if (Math.hypot(mx - head.x, my - head.y) > R) return a; }
        return angle;
    }

    function segPositions() {
        const pos = []; let need = gap, acc = 0;
        for (let i = 1; i < path.length && pos.length < segCount; i++) {
            acc += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
            while (acc >= need && pos.length < segCount) { pos.push(path[i]); need += gap; }
        }
        while (pos.length < segCount) pos.push(path[path.length - 1] || head);
        return pos;
    }

    function banner(txt) { const b = el("div", { class: "sec-banner", text: txt }); screen.appendChild(b); setTimeout(() => b.remove(), 1200); }

    function eatFood(f, idx) {
        f.el.remove(); foods.splice(idx, 1);
        segCount += 2; eaten++;
        const g = 12000 + segCount * 300; score += g; updateScore();
        Audio.bigCorrect && Audio.bigCorrect(Math.min(8, 3 + level));
        const fr = field.getBoundingClientRect();
        emitParticles(fr.left + f.x, fr.top + f.y, 8, ["💉", "✨", "💚"]);
        spawnFood();
        // 단계 상승 (10단계가 최고 — 도달 후엔 부딪힐 때까지 계속!)
        const newLv = Math.min(MAXLV, 1 + Math.floor(eaten / EAT_PER_LV));
        if (newLv > level) {
            level = newLv; applyLevel(); spawnVirus();
            if (level >= MAXLV) banner("🏆 10단계 최고 속도! 부딪히지 말고 계속 모아!");
            else banner(`🔼 ${level}단계! 더 빨라진다!`);
        }
        // 10단계 이후에도 점점 어려워지게 — 주사기를 더 모을수록 바이러스 추가
        if (level >= MAXLV && eaten % 3 === 0) spawnVirus();
    }

    function tick(t) {
        if (finished) return;
        const dt = Math.min(40, t - last) / 1000; last = t;
        const tg = targetAngle();
        let diff = tg - angle; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
        const maxTurn = turn * dt; angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
        head.x += Math.cos(angle) * speed * dt; head.y += Math.sin(angle) * speed * dt;
        head.x = Math.max(R, Math.min(W - R, head.x)); head.y = Math.max(R, Math.min(H - R, head.y));
        path.unshift({ x: head.x, y: head.y });
        const maxPath = Math.ceil(segCount * gap / Math.max(1, speed * dt)) + 80;
        if (path.length > maxPath) path.length = maxPath;

        const pos = segPositions();
        while (segEls.length < pos.length) { const e = el("div", { class: "snk-seg" }); field.insertBefore(e, headEl); segEls.push(e); }
        while (segEls.length > pos.length) segEls.pop().remove();
        const segR = R * 0.92;
        for (let i = 0; i < pos.length; i++) {
            const e = segEls[i]; e.style.width = e.style.height = (segR * 2) + "px";
            e.style.left = (pos[i].x - segR) + "px"; e.style.top = (pos[i].y - segR) + "px";
            e.style.zIndex = String(50 - i);
        }
        headEl.style.left = (head.x - R * 1.05) + "px"; headEl.style.top = (head.y - R * 1.05) + "px";

        for (let i = foods.length - 1; i >= 0; i--) {
            if (Math.hypot(foods[i].x - head.x, foods[i].y - head.y) < R + R * 0.9) { eatFood(foods[i], i); if (finished) return; }
        }
        for (const v of viruses) {
            if (Math.hypot(v.x - head.x, v.y - head.y) < R + R * 0.85) return die();
        }
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() { finished = true; if (rafId) cancelAnimationFrame(rafId); clearInterval(timerInt);
        window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); }

    function die() {
        const fr = field.getBoundingClientRect();
        const passed = score >= goalScore;
        emitParticles(fr.left + head.x, fr.top + head.y, 16, passed ? ["🎉", "💉", "⭐", "✨"] : ["🦠", "💀", "⚠️"]);
        if (headEl) headEl.classList.add("dead");
        banner(passed ? "🎉 바이러스에 닿았어요! 그래도 목표 달성 — 성공!" : "🦠 바이러스에 닿았어요! 게임 끝");
        endGame(passed);
    }
    function endGame(won) {
        if (finished) return; finished = true; cleanup();
        if (won) Audio.gameOver && Audio.gameOver(); else Audio.wrong && Audio.wrong();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        setTimeout(() => navigate("results", { lessonId: params.lessonId, score, bestCombo: level, leveledUp: newLevel > prevLevel, newLevel }), won ? 1500 : 700);
    }

    secStoryIntro(screen, STORY, startPlay);
};
