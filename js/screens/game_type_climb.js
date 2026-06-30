/* ============================================================
   6단원(타자편) 4관문: 성벽 오르기 — 애국가 1절 타이핑
   달빛 성벽 위 공주가 잠든 방. 애국가 1절을 한 줄씩 정확히 입력하면
   병사가 조금씩 성벽을 타고 올라간다. 1절을 완성하면 공주의 방으로 입장!
   ============================================================ */

SCREEN_RENDERERS.gameTypeClimb = function (root, params) {
    const screen = el("div", { class: "screen game game--typingadv game--unit5 game--climb" });

    const BG = "assets/unit5/climb_bg.jpeg?v=2";
    // 애국가 1절 (+후렴) — 한 줄씩 오른다
    const LINES = [
        "동해물과 백두산이 마르고 닳도록",
        "하느님이 보우하사 우리나라 만세",
        "무궁화 삼천리 화려강산",
        "대한사람 대한으로 길이 보전하세",
    ];
    function norm(s) { return String(s || "").normalize("NFC").replace(/\s+/g, ""); }
    const LINES_N = LINES.map(norm);
    const TOTAL = LINES_N.reduce((a, l) => a + l.length, 0);

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, finished = false, navigated = false;
    let lineIdx = 0, doneChars = 0, curMatched = 0, startTs = 0;
    const goalScore = (LESSONS_UNIT6.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    root.appendChild(screen);

    let scoreEl, pctEl, lvlChip, stage, climber, goalEl, progFill, card, lineBox, subEl, inp;

    function buildStage() {
        screen.innerHTML = "";
        scoreEl = el("span", { class: "hud-chip__big", text: `${score}` });
        pctEl = el("span", { class: "hud-chip__big", text: "0%" });
        lvlChip = makeLevelChip(); lvlChip.update(state.points + (score - startingScore));
        const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
            style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
        screen.appendChild(el("div", { class: "game__hud" },
            exitBtn,
            el("span", { class: "hud-chip" }, el("span", { text: "🧗" }), el("span", { class: "stat-chip__label", text: "성벽" }), pctEl),
            lvlChip.chip,
            el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
                el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
        ));

        stage = el("div", { class: "climb-stage" });
        stage.style.backgroundImage = `url('${BG}')`;
        screen.appendChild(stage);

        // 목표 — 성벽 위 공주의 방
        goalEl = el("div", { class: "climb-goal" },
            el("div", { class: "climb-goal__room" },
                el("div", { class: "climb-goal__princess gfx-sprite", style: { backgroundImage: "url('assets/unit5/princess.svg')" } })),
            el("div", { class: "climb-goal__label", text: "👑 공주의 방" }));
        stage.appendChild(goalEl);

        // 병사(기사)
        climber = el("div", { class: "climb-actor" },
            el("div", { class: "climb-actor__char gfx-sprite", style: { backgroundImage: "url('assets/unit5/knight.svg')" } }));
        stage.appendChild(climber);

        // 오른쪽 세로 진행바
        progFill = el("div", { class: "climb-track__fill" });
        stage.appendChild(el("div", { class: "climb-track" }, progFill,
            el("div", { class: "climb-track__top", text: "🚪" }), el("div", { class: "climb-track__bot", text: "🧗" })));

        // 가운데 타자 카드
        lineBox = el("div", { class: "climb-card__line" });
        subEl = el("div", { class: "climb-card__sub" });
        inp = el("input", { class: "climb-card__input",
            attrs: { type: "text", placeholder: "여기에 가사를 입력하세요…", autocomplete: "off", spellcheck: "false" } });
        inp.disabled = true;
        card = el("div", { class: "climb-card" },
            el("div", { class: "climb-card__head", text: "🎵 애국가 1절을 입력해 성벽을 오르자!" }),
            lineBox, inp, subEl);
        screen.appendChild(card);

        renderLine(0, -1); updateClimb();
        inp.oninput = onInput;
    }

    function showIntro(cb) {
        const m = el("div", { class: "climb-intro" },
            el("div", { class: "climb-intro__icon", text: "🧗" }),
            el("h1", { class: "climb-intro__title", text: "성벽 오르기" }),
            el("div", { class: "climb-intro__sub", text: "4관문 · 애국가 타이핑" }),
            el("p", { class: "climb-intro__text", text:
                "달빛 아래 성벽 위, 공주가 잠든 방이 있다.\n애국가 1절을 한 줄씩 정확히 입력하면\n병사가 조금씩 성벽을 타고 올라간다.\n1절을 완성해 공주의 방으로 들어가자! 🎵" }),
            el("button", { class: "btn btn--big climb-intro__cta", text: "🧗 오르기 시작!",
                on: { click: () => { m.classList.add("out"); setTimeout(() => { m.remove(); cb(); }, 320); } } }));
        screen.appendChild(m);
        Audio.roundStart && Audio.roundStart();
    }

    function renderLine(matched, errorAt) {
        lineBox.innerHTML = "";
        const line = LINES[lineIdx]; let ns = 0;
        for (const c of line) {
            const isSpace = /\s/.test(c); let cls = "climb-ch";
            if (isSpace) { if (ns < matched) cls += " done"; }
            else { if (ns < matched) cls += " done"; else if (ns === errorAt) cls += " wrong"; ns++; }
            lineBox.appendChild(el("span", { class: cls, text: c }));
        }
        subEl.textContent = `${lineIdx + 1} / ${LINES.length}째 줄` + (lineIdx + 1 < LINES.length ? `   다음 ▸ ${LINES[lineIdx + 1]}` : "   ✨ 마지막 줄!");
    }

    function updateClimb() {
        const p = Math.min(1, (doneChars + curMatched) / TOTAL);
        climber.style.bottom = (18 + p * 64) + "%";
        progFill.style.height = Math.round(p * 100) + "%";
        pctEl.textContent = Math.round(p * 100) + "%";
    }

    function addScore(n) {
        score += n; scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function onInput() {
        if (finished) return;
        const valN = norm(inp.value), tgt = LINES_N[lineIdx];
        let m = 0; while (m < valN.length && m < tgt.length && valN[m] === tgt[m]) m++;
        const hasErr = valN.length > m && m < tgt.length;
        curMatched = m;
        renderLine(m, hasErr ? m : -1);
        inp.classList.toggle("err", hasErr);
        updateClimb();
        if (valN === tgt) lineDone();
    }

    function lineDone() {
        doneChars += LINES_N[lineIdx].length; curMatched = 0;
        addScore(120000 + LINES_N[lineIdx].length * 15000);
        Audio.bigCorrect && Audio.bigCorrect(Math.min(8, 4 + lineIdx * 2));
        const r = climber.getBoundingClientRect();
        emitParticles(r.left + r.width / 2, r.top + r.height / 2, 10, ["⭐", "✨", "🎵", "🧗"]);
        climber.classList.add("hop"); setTimeout(() => climber.classList.remove("hop"), 400);
        lineIdx++; inp.value = "";
        if (lineIdx >= LINES.length) return succeed();
        renderLine(0, -1); updateClimb();
    }

    function succeed() {
        if (finished) return; finished = true;
        inp.disabled = true; inp.blur();
        climber.style.bottom = "82%"; climber.classList.add("arrive");
        goalEl.classList.add("open");
        const secs = Math.max(1, (performance.now() - startTs) / 1000);
        const speedBonus = Math.max(0, Math.round(180 - secs)) * 5000;
        addScore(400000 + speedBonus);
        Audio.gameOver && Audio.gameOver();
        const fr = stage.getBoundingClientRect();
        for (let i = 0; i < 5; i++) setTimeout(() => emitParticles(fr.left + fr.width / 2, fr.top + fr.height * 0.18, 16, ["🎉", "👑", "✨", "⭐", "🎵"]), i * 200);
        const b = el("div", { class: "sec-banner", text: `🎉 애국가 완성! 공주의 방으로 입장! (속도보너스 +${speedBonus})` });
        screen.appendChild(b);
        setTimeout(finishToResults, 2000);
    }

    function cleanup() { finished = true; }
    function finishToResults() {
        if (navigated) return; navigated = true;
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        cleanup();
        navigate("results", { lessonId: params.lessonId, score, bestCombo: lineIdx, leveledUp: newLevel > prevLevel, newLevel });
    }

    buildStage();
    showCarryOverBanner(startingScore);
    showIntro(() => { inp.disabled = false; startTs = performance.now(); setTimeout(() => inp.focus(), 60); });
};
