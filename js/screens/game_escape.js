/* ============================================================
   5단원 스텝 1: 역사 방탈출
   씽크홀에 빠져 구석기로! 20개 시대의 검색형 문제를 풀어 탈출.
   1~10단계 객관식 / 11~20단계 주관식. 시대마다 배경이 바뀐다.
   ============================================================ */

SCREEN_RENDERERS.gameEscape = function (root, params) {
    const screen = el("div", { class: "screen game game--escape" });
    const cfg = ESCAPE_GAME_CONFIG;
    const stages = cfg.stages;
    const TOTAL = stages.length;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIdx = 0;
    let solved = 0;
    let finished = false;
    let locked = false;   // 정답 처리 애니메이션 중 입력 잠금

    const goalScore = (LESSONS_UNIT5.find(l => l.id === params.lessonId) || {}).goalScore || 0;

    // ----- 배경 레이어 (시대마다 교체) -----
    const bg = el("div", { class: "esc-bg" });
    const shade = el("div", { class: "esc-shade" });
    screen.appendChild(bg);
    screen.appendChild(shade);

    // ----- HUD -----
    const exitBtn = el("button", {
        class: "esc-exit", text: "← 그만",
        on: { click: () => { cleanup(); navigate("home"); } },
    });
    const eraChip = el("span", { class: "esc-chip esc-chip--era" });
    const lockChip = el("span", { class: "esc-chip" });
    const scoreChip = el("span", { class: "esc-chip esc-chip--score" });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);

    const hud = el("div", { class: "esc-hud" },
        el("div", { class: "esc-hud__col" }, exitBtn, eraChip, lockChip),
        el("div", { class: "esc-hud__col esc-hud__col--r" }, scoreChip, lvlChip.chip),
    );
    screen.appendChild(hud);

    // 20단계 자물쇠 진행바
    const locksBar = el("div", { class: "esc-locks" });
    for (let i = 0; i < TOTAL; i++) locksBar.appendChild(el("i"));
    screen.appendChild(locksBar);

    // 좌측 시대 나침반
    const compass = el("div", { class: "esc-compass" },
        el("div", { class: "esc-compass__ico", text: "🧭" }),
        el("div", { class: "esc-compass__num" }),
    );
    screen.appendChild(compass);

    // 스토리 내레이션
    const story = el("div", { class: "esc-story" });
    screen.appendChild(story);

    // 문제 패널
    const panel = el("div", { class: "esc-panel" });
    screen.appendChild(panel);

    root.appendChild(screen);

    // ----- 헬퍼 -----
    function norm(s) {
        return String(s || "").normalize("NFC").toLowerCase().replace(/\s+/g, "");
    }
    function checkSub(input, answers) {
        const clean = norm(input);
        if (!clean) return false;
        // 입력이 정답을 '포함'할 때만 정답으로 인정.
        // (정답의 일부만 쳐서 통과하던 버그 방지 — 예: 정답 8849에 "88"만 입력)
        return answers.some(a => {
            const x = norm(a);
            return x && clean.includes(x);
        });
    }
    function updateScore() {
        scoreChip.innerHTML = "";
        scoreChip.appendChild(el("span", { text: "⭐ " }));
        scoreChip.appendChild(el("b", { text: `${score.toLocaleString()}` }));
        lvlChip.update(state.points + (score - startingScore));
    }
    function renderLocks() {
        [...locksBar.children].forEach((d, i) => {
            d.className = i < stageIdx ? "done" : (i === stageIdx ? "now" : "");
        });
    }

    // ----- 단계 로드 -----
    function loadStage() {
        const st = stages[stageIdx];
        const n = stageIdx + 1;
        bg.style.backgroundImage = `url('${st.bg}')`;
        eraChip.innerHTML = `${st.icon} <span>${st.era}</span>`;
        lockChip.innerHTML = `🔓 탈출 <b>${n} / ${TOTAL}</b>`;
        compass.querySelector(".esc-compass__num").textContent = `${n} / ${TOTAL}`;
        renderLocks();

        // 스토리 표시 후 자동 페이드
        story.innerHTML = st.story;
        story.classList.add("show");
        clearTimeout(loadStage._t);
        loadStage._t = setTimeout(() => story.classList.remove("show"), 4200);

        panel.innerHTML = "";
        const tag = el("div", { class: "esc-tag",
            text: `문제 ${n} · ${st.type === "obj" ? "객관식" : "주관식"}` });
        const q = el("div", { class: "esc-q", text: st.q });
        panel.appendChild(tag);
        panel.appendChild(q);

        if (st.type === "obj") {
            const grid = el("div", { class: "esc-choices" });
            // 보기를 매번 무작위로 섞는다 (정답이 항상 1번에 오지 않도록)
            const opts = st.choices.map((c, i) => ({ text: c, correct: i === st.answer }));
            for (let k = opts.length - 1; k > 0; k--) {
                const j = Math.floor(Math.random() * (k + 1));
                const tmp = opts[k]; opts[k] = opts[j]; opts[j] = tmp;
            }
            opts.forEach((o, i) => {
                const btn = el("button", { class: "esc-choice" },
                    el("b", { text: `${i + 1}` }),
                    el("span", { text: o.text }),
                );
                btn.addEventListener("click", () => onObjPick(o.correct, btn));
                grid.appendChild(btn);
            });
            panel.appendChild(grid);
            panel.appendChild(el("div", { class: "esc-hint",
                html: "💡 모르겠으면 <span>검색</span>! 맞히면 🔓 다음 시대로" }));
        } else {
            const input = el("input", { class: "esc-input",
                attrs: { type: "text", placeholder: "검색해서 정답을 입력!", autocomplete: "off", spellcheck: "false" } });
            const submit = el("button", { class: "esc-submit", text: "제출" });
            const row = el("div", { class: "esc-subrow" }, input, submit);
            panel.appendChild(row);
            panel.appendChild(el("div", { class: "esc-hint",
                html: "💡 검색해서 찾은 답을 입력 · 맞히면 🔓 다음 시대로" }));
            submit.addEventListener("click", () => onSubSubmit(input));
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
                    e.preventDefault(); onSubSubmit(input);
                }
            });
            setTimeout(() => input.focus(), 80);
        }
    }

    // ----- 정답/오답 -----
    function onObjPick(isCorrect, btn) {
        if (finished || locked) return;
        if (isCorrect) {
            btn.classList.add("correct");
            correct();
        } else {
            btn.classList.add("wrong");
            setTimeout(() => btn.classList.remove("wrong"), 500);
            wrong();
        }
    }
    function onSubSubmit(input) {
        if (finished || locked) return;
        const st = stages[stageIdx];
        if (!(input.value || "").trim()) return;
        if (checkSub(input.value, st.answers)) {
            input.classList.add("correct"); input.disabled = true;
            correct();
        } else {
            input.classList.add("wrong");
            setTimeout(() => input.classList.remove("wrong"), 500);
            wrong();
        }
    }

    function wrong() {
        score = Math.max(0, score - cfg.wrongPenalty);
        updateScore();
        Audio.wrong && Audio.wrong();
        panel.classList.remove("shake"); void panel.offsetWidth; panel.classList.add("shake");
    }

    function correct() {
        locked = true;
        solved++;
        score += cfg.pointsPerCorrect;
        updateScore();
        Audio.bigCorrect && Audio.bigCorrect(6);
        // 자물쇠 열림 표시
        const lk = locksBar.children[stageIdx];
        if (lk) lk.className = "done";
        const r = panel.getBoundingClientRect();
        emitParticles(r.left + r.width / 2, r.top + r.height / 2, 16, ["🔓", "✨", "⭐", "💫", "🎉"]);

        // 통과 배너
        const banner = el("div", { class: "esc-pass", text: "🔓 탈출 성공! 다음 시대로!" });
        screen.appendChild(banner);
        setTimeout(() => banner.remove(), 1300);

        setTimeout(() => {
            if (finished) return;
            locked = false;
            if (stageIdx >= TOTAL - 1) {
                winGame();
            } else {
                stageIdx++;
                loadStage();
            }
        }, 1300);
    }

    // ----- 종료 -----
    function winGame() {
        if (finished) return;
        finished = true;
        Audio.gameOver && Audio.gameOver();
        const over = el("div", { class: "esc-win" },
            el("div", { class: "esc-win__ico", text: "🎉" }),
            el("h1", { class: "esc-win__title", text: "탈출 성공!" }),
            el("p", { class: "esc-win__text",
                text: `20개의 시대를 모두 지나 학교로 돌아왔어요!\n맞힌 문제 ${solved} / ${TOTAL}` }),
        );
        screen.appendChild(over);
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        for (let i = 0; i < 6; i++) setTimeout(() => emitParticles(cx + (Math.random() - 0.5) * 240, cy, 18, ["🎉", "🎊", "✨", "⭐", "🏫", "🚪"]), i * 200);
        setTimeout(() => finishToResults(), 2600);
    }

    function finishToResults() {
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score,
            bestCombo: solved,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    function cleanup() {
        finished = true;
        clearTimeout(loadStage._t);
    }

    // ----- 시작 -----
    updateScore();
    const startGame = () => {
        showCarryOverBanner(startingScore);
        loadStage();
    };
    if (typeof hasSeenTutorial === "function" && !hasSeenTutorial("gameEscape")) {
        showTutorial("gameEscape", startGame);
    } else {
        startGame();
    }
};
