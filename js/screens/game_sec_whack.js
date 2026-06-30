/* ============================================================
   7단원 스텝 1: 바이러스 잡기
   스토리(USB를 주워 컴퓨터에 꽂음 → 바이러스!) 3장 인트로 후,
   배경 이미지 위를 돌아다니는 바이러스를 모두 잡는 게임.
   ============================================================ */

SCREEN_RENDERERS.gameSecWhack = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-whack" });

    // ▼▼ 스토리 3장 + 게임화면 배경 ▼▼
    const STORY = [
        { img: "assets/security/whack_story1.jpeg", text: "학교 가는 길… 어? 바닥에 USB가 떨어져 있네? ✨" },
        { img: "assets/security/whack_story2.jpeg", text: "“오, 공짜 USB다!” 주워서 컴퓨터실로 가져왔어요." },
        { img: "assets/security/whack_story3.jpeg", text: "무심코 컴퓨터에 쏙 꽂았더니… ‘DRIVE DETECTED’. 그 순간 바이러스가 쏟아진다! 🦠" },
    ];
    const GAME_BG = "assets/security/whack_bg.jpeg";
    const VIRUS = ["🦠", "🐛", "👾", "💀", "🪲"];
    const TIME = 35, HIT = 5000;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, combo = 0, finished = false, secs = TIME, wave = 1;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    root.appendChild(screen);

    // ====================== 스토리 인트로 ======================
    // ====================== 게임 ======================
    let viruses = [], rafId = null, last = 0, scoreEl, timerEl, comboEl, lvlChip, field, spawnTimer, tickTimer;

    function startPlay() {
        screen.innerHTML = "";
        scoreEl = el("span", { class: "hud-chip__big", text: `${score}` });
        timerEl = el("span", { class: "hud-chip__big", text: TIME + ".0", style: { color: "var(--secondary-dark)" } });
        lvlChip = makeLevelChip(); lvlChip.update(state.points + (score - startingScore));
        const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
            style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
        screen.appendChild(el("div", { class: "game__hud" },
            exitBtn,
            el("span", { class: "hud-chip" }, el("span", { text: "⏱️" }), timerEl),
            lvlChip.chip,
            el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
                el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
        ));
        screen.appendChild(el("div", { class: "sec-title", text: "🦠 돌아다니는 바이러스를 모두 클릭해서 잡아라!" }));
        comboEl = el("div", { class: "sec-combo" }); screen.appendChild(comboEl);
        field = el("div", { class: "sec-vfield" });
        field.style.backgroundImage = `url('${GAME_BG}')`;
        screen.appendChild(field);
        screen.appendChild(el("div", { class: "game-bottom-help", text: "💡 다 잡으면 더 많은 바이러스가 몰려와요(웨이브 보너스)! 연속으로 잡으면 콤보 점수!" }));

        showCarryOverBanner(startingScore);
        spawnWave(8);
        last = performance.now();
        rafId = requestAnimationFrame(tick);
        tickTimer = setInterval(() => {
            if (finished) return; secs -= 0.1; timerEl.textContent = Math.max(0, secs).toFixed(1);
            timerEl.style.color = secs < 6 ? "#d63031" : "var(--secondary-dark)";
            if (secs <= 0) finishGame();
        }, 100);
    }

    function spawnWave(n) {
        for (let i = 0; i < n; i++) {
            const v = { x: 0.08 + Math.random() * 0.84, y: 0.12 + Math.random() * 0.76,
                vx: (Math.random() < 0.5 ? -1 : 1) * (0.035 + Math.random() * 0.055 + wave * 0.006),
                vy: (Math.random() < 0.5 ? -1 : 1) * (0.035 + Math.random() * 0.055 + wave * 0.006), alive: true };
            const e = el("div", { class: "sec-virus", text: VIRUS[Math.floor(Math.random() * VIRUS.length)] });
            e.style.left = (v.x * 100) + "%"; e.style.top = (v.y * 100) + "%";
            e.addEventListener("click", () => catchVirus(v));
            v.el = e; field.appendChild(e); viruses.push(v);
        }
    }

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }
    function showCombo() { comboEl.textContent = combo >= 3 ? `🔥 ${combo} 콤보!` : ""; comboEl.classList.toggle("show", combo >= 3); }

    function catchVirus(v) {
        if (finished || !v.alive) return;
        v.alive = false; combo++;
        const gain = HIT + (combo - 1) * 300; score += gain; updateScore(); showCombo();
        Audio.bigCorrect && Audio.bigCorrect(Math.min(8, 3 + Math.floor(combo / 2)));
        const r = v.el.getBoundingClientRect();
        emitParticles(r.left + r.width / 2, r.top + r.height / 2, 9, ["💥", "✨", "⭐", "🔨"]);
        const f = el("div", { class: "sec-float good", text: `+${gain.toLocaleString()}` });
        f.style.left = (r.left + r.width / 2) + "px"; f.style.top = r.top + "px"; document.body.appendChild(f);
        setTimeout(() => f.remove(), 800);
        v.el.classList.add("caught"); setTimeout(() => v.el.remove(), 180);
        viruses = viruses.filter(x => x.alive);
        if (viruses.length === 0) {   // 웨이브 클리어
            wave++; const bonus = 8000 * wave; score += bonus; updateScore();
            banner(`🌊 웨이브 ${wave}! +${bonus.toLocaleString()} 보너스`);
            setTimeout(() => { if (!finished) spawnWave(8 + wave * 2); }, 700);
        }
    }

    function banner(txt) { const b = el("div", { class: "sec-banner", text: txt }); screen.appendChild(b); setTimeout(() => b.remove(), 1200); }

    function tick(t) {
        if (finished) return;
        const dt = Math.min(50, t - last) / 1000; last = t;
        viruses.forEach(v => {
            if (!v.alive) return;
            v.x += v.vx * dt; v.y += v.vy * dt;
            if (v.x < 0.04) { v.x = 0.04; v.vx = Math.abs(v.vx); } else if (v.x > 0.94) { v.x = 0.94; v.vx = -Math.abs(v.vx); }
            if (v.y < 0.08) { v.y = 0.08; v.vy = Math.abs(v.vy); } else if (v.y > 0.92) { v.y = 0.92; v.vy = -Math.abs(v.vy); }
            v.el.style.left = (v.x * 100) + "%"; v.el.style.top = (v.y * 100) + "%";
        });
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() { finished = true; if (rafId) cancelAnimationFrame(rafId); clearInterval(tickTimer); clearInterval(spawnTimer); }

    function finishGame() {
        if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score, bestCombo: wave, leveledUp: newLevel > prevLevel, newLevel });
    }

    // 스토리 인트로(공용) → 끝나면 게임 시작
    secStoryIntro(screen, STORY, startPlay);
};
