/* ============================================================
   4단원 스텝 4: 문장 타자치기
   주어진 한글 문장을 정확히 따라 입력. 글자별 색상 피드백.
   ============================================================ */

SCREEN_RENDERERS.gameSentence = function (root, params) {
    const screen = el("div", { class: "screen game game--sentence game--unit4" });
    const cfg = SENTENCE_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let sentencesDone = 0;

    let currentSentence = "";
    let sentenceKeys = "";
    let sentenceJamos = [];
    let keysTyped = 0;

    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "30.0", style: { color: "var(--secondary-dark)" } });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);
    const exitBtn = el("button", {
        class: "btn btn--ghost",
        text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => { cleanup(); navigate("home"); } },
    });
    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" },
            el("span", { text: "📝" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "⏱️" }),
            timerEl,
        ),
        lvlChip.chip,
        el("span", { class: "hud-chip" },
            el("span", { text: "⭐" }),
            scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }),
            el("span", { class: "hud-chip__goal", text: `${goalScore}` }),
        ),
    );
    screen.appendChild(hud);

    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);

    // 문장 패널 (타자 마스터와 비슷)
    const panel = el("div", { class: "sentence-panel" });
    const info = el("div", { class: "sentence-panel__info", text: "📝 다음 문장을 따라 입력하세요!" });
    const sentenceEl = el("div", { class: "sentence-text" });
    const progressEl = el("div", { class: "sentence-progress" });
    panel.appendChild(info);
    panel.appendChild(sentenceEl);
    panel.appendChild(progressEl);
    screen.appendChild(panel);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 위 문장을 한 글자씩 정확히 따라 입력! 한/영 키보드 모두 OK." });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function loadNextSentence() {
        const stage = cfg.stages[stageIndex];
        currentSentence = stage.sentences[Math.floor(Math.random() * stage.sentences.length)];
        sentenceKeys = textToKeySequence(currentSentence);
        sentenceJamos = textToJamoArray(currentSentence);
        keysTyped = 0;
        renderSentence();
    }

    function renderSentence() {
        sentenceEl.innerHTML = "";
        // 음절 단위 표시 + 현재 위치 강조
        let keysSoFar = 0;
        let currentIdx = -1;
        const syllableKeyCounts = [];
        for (let i = 0; i < currentSentence.length; i++) {
            const ch = currentSentence[i];
            if (ch === " ") {
                syllableKeyCounts.push(1);
                keysSoFar += 1;
            } else {
                const parts = decomposeSyllableFull(ch);
                const cnt = parts ? (1 + 1 + (parts.jong ? 1 : 0)) : 1;
                syllableKeyCounts.push(cnt);
                keysSoFar += cnt;
            }
            if (currentIdx < 0 && keysSoFar > keysTyped) currentIdx = i;
        }
        let cum = 0;
        for (let i = 0; i < currentSentence.length; i++) {
            const ch = currentSentence[i];
            cum += syllableKeyCounts[i];
            const span = el("span", { class: "sentence-char", text: ch });
            if (ch === " ") span.classList.add("sentence-char--space");
            if (cum <= keysTyped) span.classList.add("sentence-char--done");
            else if (i === currentIdx) span.classList.add("sentence-char--current");
            sentenceEl.appendChild(span);
        }
        // 진행도 — 완성된 문장을 정상 한글로 표시
        const ratio = sentenceKeys.length ? keysTyped / sentenceKeys.length : 0;
        // 완성된 음절 수 계산
        let kSum = 0;
        let completedChars = 0;
        for (let i = 0; i < currentSentence.length; i++) {
            const ch2 = currentSentence[i];
            const cnt = syllableKeyCounts[i];
            kSum += cnt;
            if (kSum <= keysTyped) completedChars = i + 1;
            else break;
        }
        const typedText = currentSentence.substring(0, completedChars) || "·";

        progressEl.innerHTML = "";
        progressEl.appendChild(el("span", { class: "sentence-progress__label", text: "내가 입력한 문장: " }));
        progressEl.appendChild(el("span", { class: "sentence-progress__typed", text: typedText }));
        progressEl.appendChild(el("span", { class: "sentence-progress__ratio",
            text: `  ${Math.round(ratio * 100)}%` }));
    }

    function completeSentence() {
        const stage = cfg.stages[stageIndex];
        const gain = stage.pointsPerSentence;
        score += gain;
        sentencesDone++;
        updateScoreDisplay();
        Audio.bigCorrect(8);

        const rect = sentenceEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        showScoreFloat(cx, cy, `🎉 +${gain.toLocaleString()}!`, "good");
        emitParticles(cx, cy, 16, ["✨","⭐","🌟","💫","📝"]);

        sentenceEl.classList.add("sentence-text--done");
        setTimeout(() => {
            sentenceEl.classList.remove("sentence-text--done");
            if (inStage && !finished) loadNextSentence();
        }, 700);
    }

    function onKey(e) {
        if (!inStage || finished) return;
        const rawKey = e.key;
        if (!rawKey) return;
        if (rawKey.length !== 1 && rawKey !== " ") return;
        e.preventDefault();
        const stage = cfg.stages[stageIndex];

        let key = HANGUL_KEYS[rawKey] || rawKey;
        if (key !== " ") key = key.toLowerCase();
        const expected = sentenceKeys[keysTyped];

        if (key === expected) {
            keysTyped++;
            renderSentence();
            Audio.tick();
            if (keysTyped >= sentenceKeys.length) {
                completeSentence();
            }
        } else {
            score = Math.max(0, score - stage.wrongPenalty);
            updateScoreDisplay();
            sentenceEl.classList.remove("sentence-text--shake");
            void sentenceEl.offsetWidth;
            sentenceEl.classList.add("sentence-text--shake");
        }
    }
    document.addEventListener("keydown", onKey);

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        info.textContent = "📝 " + stage.label;
        showStageBanner(stage.label);
        Audio.roundStart();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            loadNextSentence();
        }, 1100);
    }

    function showStageBanner(label) {
        const banner = el("div", { class: "math-stage-banner", text: label });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.5s, transform 0.5s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => banner.remove(), 520);
        }, 1000);
    }

    function endStage() {
        if (!inStage) return;
        inStage = false;
        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 1000);
        } else {
            setTimeout(() => startStage(stageIndex), 1400);
        }
    }

    function tick() {
        if (finished) { rafId = requestAnimationFrame(tick); return; }
        if (inStage) {
            const remain = Math.max(0, (stageEndsAt - performance.now()) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) endStage();
        }
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        document.removeEventListener("keydown", onKey);
    }

    function finishGame() {
        if (finished) return;
        finished = true;
        cleanup();
        Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score,
            bestCombo: sentencesDone,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "📝 문장을 따라 정확히 입력!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameSentence")) {
        showTutorial("gameSentence", startGame);
    } else {
        startGame();
    }
};
