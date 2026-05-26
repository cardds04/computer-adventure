/* ============================================================
   2단원 스텝 6: 타자 마스터 (한글 단어 입력)
   화면 가운데 큰 한글 단어 → 한 글자씩 입력 → 완성하면 다음 단어.
   3단계: 짧은 단어 → 긴 단어 → 송양초 챌린지!
   좌상단에 캐릭터 (레벨업 시 변신). 하단에 게임방법 안내.
   ============================================================ */

SCREEN_RENDERERS.gameType = function (root, params) {
    const screen = el("div", { class: "screen game game--type" });
    const cfg = TYPE_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;

    // 단어 모드
    let currentWord = "";
    let wordKeys = "";          // 영문 키 시퀀스
    let wordJamos = [];         // 키별 한글 자모 (표시용, 길이 == wordKeys.length)
    let keysTyped = 0;
    let wordsCompleted = 0;

    // 문장 모드
    let phraseKeys = "";
    let phraseTyped = 0;
    let phraseStartedAt = 0;

    // DOM 참조
    let wordDisplayEl = null;   // 단어 글자 span 컨테이너
    let progressEl = null;      // 입력 키 진행 표시
    let stageInfoEl = null;     // 단계 부가 안내

    // ----- HUD -----
    const goalScore = LESSONS_UNIT2.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "25.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "⌨️" }),
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

    // ----- 좌상단 캐릭터 -----
    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);

    // ----- 메인 패널 (단어 + 입력) -----
    const panel = el("div", { class: "typing-panel" });
    stageInfoEl = el("div", { class: "typing-panel__stage", text: "이 단어를 따라 입력하세요!" });
    wordDisplayEl = el("div", { class: "typing-word" });
    progressEl = el("div", { class: "typing-progress" });
    panel.appendChild(stageInfoEl);
    panel.appendChild(wordDisplayEl);
    panel.appendChild(progressEl);
    screen.appendChild(panel);

    // ----- 하단 안내 -----
    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 한글로 입력하세요! 노란 글씨가 다음에 누를 자모(ㄱ,ㅏ...)예요." });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    // ----- 단어 모드 -----
    function loadNextWord() {
        const stage = cfg.stages[stageIndex];
        currentWord = stage.words[Math.floor(Math.random() * stage.words.length)];
        wordKeys = textToKeySequence(currentWord);
        wordJamos = textToJamoArray(currentWord);
        keysTyped = 0;
        renderWord();
    }

    function renderWord() {
        wordDisplayEl.innerHTML = "";
        // 현재 음절 인덱스 계산
        let keysSoFar = 0;
        let currentIdx = -1;
        const syllableKeyCounts = [];
        for (let i = 0; i < currentWord.length; i++) {
            const ch = currentWord[i];
            if (ch === " ") {
                syllableKeyCounts.push(1);
                keysSoFar += 1;
            } else {
                const parts = decomposeSyllableFull(ch);
                const cnt = parts ? (1 + 1 + (parts.jong ? 1 : 0)) : 1;
                syllableKeyCounts.push(cnt);
                keysSoFar += cnt;
            }
            if (currentIdx < 0 && keysSoFar > keysTyped) {
                currentIdx = i;
            }
        }
        let cum = 0;
        for (let i = 0; i < currentWord.length; i++) {
            const ch = currentWord[i];
            cum += syllableKeyCounts[i];
            const span = el("span", { class: "typing-word__char", text: ch });
            if (ch === " ") span.classList.add("typing-word__char--space");
            if (cum <= keysTyped) span.classList.add("typing-word__char--done");
            else if (i === currentIdx) span.classList.add("typing-word__char--current");
            wordDisplayEl.appendChild(span);
        }
        // 진행 표시: 내가 누른 키 (한글 자모로 표시)
        progressEl.innerHTML = "";
        progressEl.appendChild(el("span", { class: "typing-progress__label", text: "내가 누른 키: " }));

        const typedJamos = wordJamos.slice(0, keysTyped).filter(j => j !== " ");
        const typedText = typedJamos.length ? typedJamos.join(" ") : "·";
        progressEl.appendChild(el("span", { class: "typing-progress__typed", text: typedText }));

        if (keysTyped < wordJamos.length) {
            const nextJamo = wordJamos[keysTyped];
            const nextText = nextJamo === " " ? "␣" : nextJamo;
            progressEl.appendChild(el("span", { class: "typing-progress__next", text: nextText }));
        }
    }

    function onWordKey(key) {
        const expected = wordKeys[keysTyped];
        if (key === expected) {
            keysTyped++;
            renderWord();
            Audio.tick();
            if (keysTyped >= wordKeys.length) {
                completeWord();
            }
        } else if (key === " " && expected === " ") {
            keysTyped++;
            renderWord();
            Audio.tick();
        } else {
            score = Math.max(0, score - cfg.wrongPenalty);
            updateScoreDisplay();
            // 살짝 흔들기
            wordDisplayEl.classList.remove("typing-word--shake");
            void wordDisplayEl.offsetWidth;
            wordDisplayEl.classList.add("typing-word--shake");
        }
    }

    function completeWord() {
        const stage = cfg.stages[stageIndex];
        const lengthBonus = Math.floor(currentWord.replace(/\s/g, "").length / 2) * 100;
        const gain = stage.pointsPerWord + lengthBonus;
        score += gain;
        wordsCompleted++;
        updateScoreDisplay();

        const rect = wordDisplayEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pf = el("div", {
            class: "points-float",
            text: `+${gain}`,
            style: { left: `${cx}px`, top: `${cy}px` },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1100);
        emitParticles(cx, cy, 10, ["✨", "⭐", "🌟", "💫"]);
        Audio.bigCorrect(4);

        wordDisplayEl.classList.add("typing-word--done");
        setTimeout(() => {
            wordDisplayEl.classList.remove("typing-word--done");
            if (inStage) loadNextWord();
        }, 500);
    }

    // ----- 문장 모드 (단계 3) -----
    function setupPhrase() {
        const stage = cfg.stages[stageIndex];
        phraseKeys = textToKeySequence(stage.phrase);
        phraseTyped = 0;
        phraseStartedAt = performance.now();
        stageInfoEl.textContent = "📜 다음 문장을 빨리 입력하세요!";
        currentWord = stage.phrase;
        wordKeys = phraseKeys;
        wordJamos = textToJamoArray(stage.phrase);
        keysTyped = 0;
        renderWord();
    }

    function onPhraseKey(rawKey) {
        // 한글 자모 → 영문 키 변환
        let key = HANGUL_KEYS[rawKey] || rawKey;
        if (key !== " ") key = key.toLowerCase();
        if (key !== " " && key.length !== 1) return;

        const expected = phraseKeys[phraseTyped];
        if (key === expected) {
            phraseTyped++;
            keysTyped = phraseTyped;
            renderWord();
            Audio.tick();
            if (phraseTyped >= phraseKeys.length) {
                completePhrase();
            }
        } else {
            score = Math.max(0, score - cfg.wrongPenalty);
            updateScoreDisplay();
        }
    }

    function completePhrase() {
        if (!inStage) return;
        inStage = false;
        const stage = cfg.stages[stageIndex];
        const timeTaken = (performance.now() - phraseStartedAt) / 1000;
        const bonusSec = Math.max(0, stage.slowestTimeSec - timeTaken);
        const bonusPts = Math.floor(bonusSec * stage.speedBonusPerSec);
        const total = stage.baseScore + bonusPts;
        score += total;
        updateScoreDisplay();
        Audio.gameOver();

        const banner = el("div", { class: "phrase-complete" },
            el("div", { class: "phrase-complete__title", text: "🎉 완성!" }),
            el("div", { class: "phrase-complete__sub",
                text: `${timeTaken.toFixed(1)}초 만에 완료! +${total.toLocaleString()}점` }),
            el("div", { class: "phrase-complete__detail",
                text: `(기본 +${stage.baseScore.toLocaleString()} + 속도 +${bonusPts.toLocaleString()})` }),
        );
        screen.appendChild(banner);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 24, ["✨", "⭐", "🌟", "💫", "🎉", "🎊", "🏆"]);

        setTimeout(finishGame, 2500);
    }

    // ----- 키 입력 -----
    function onKey(e) {
        if (!inStage || finished) return;
        const rawKey = e.key;
        if (!rawKey) return;
        if (rawKey.length !== 1 && rawKey !== " ") return;
        e.preventDefault();

        const stage = cfg.stages[stageIndex];
        if (stage.type === "words") {
            // 한글 키 → 영문 변환
            let key = HANGUL_KEYS[rawKey] || rawKey;
            if (key !== " ") key = key.toLowerCase();
            onWordKey(key);
        } else if (stage.type === "phrase") {
            onPhraseKey(rawKey);
        }
    }
    document.addEventListener("keydown", onKey);

    // ----- 루프 -----
    function tick(t) {
        if (inStage) {
            const stage = cfg.stages[stageIndex];
            if (stage.type === "words") {
                const remain = Math.max(0, (stageEndsAt - t) / 1000);
                timerEl.textContent = remain.toFixed(1);
                timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
                if (remain <= 0) endStage();
            } else if (stage.type === "phrase") {
                const elapsed = (performance.now() - phraseStartedAt) / 1000;
                timerEl.textContent = elapsed.toFixed(1);
                timerEl.style.color = elapsed > stage.slowestTimeSec ? "#d63031" : "var(--secondary-dark)";
            }
        }
        rafId = requestAnimationFrame(tick);
    }

    // ----- 스테이지 흐름 -----
    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        showStageBanner(stage.label);
        Audio.roundStart();

        setTimeout(() => {
            inStage = true;
            if (stage.type === "words") {
                stageInfoEl.textContent = "이 단어를 따라 입력하세요!";
                stageEndsAt = performance.now() + stage.duration;
                timerEl.textContent = (stage.duration / 1000).toFixed(1);
                loadNextWord();
            } else if (stage.type === "phrase") {
                setupPhrase();
                timerEl.textContent = "0.0";
            }
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
            setTimeout(finishGame, 800);
        } else {
            setTimeout(() => startStage(stageIndex), 1400);
        }
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
            bestCombo: wordsCompleted,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    function runCountdown(numbers, idx, cb) {
        if (idx >= numbers.length) { cb(); return; }
        const cd = el("div", { class: "countdown", text: numbers[idx] });
        screen.appendChild(cd);
        if (idx < numbers.length - 1) Audio.tick();
        else Audio.tickGo();
        setTimeout(() => { cd.remove(); runCountdown(numbers, idx + 1, cb); }, 800);
    }

    // ----- 시작 -----
    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "타자를 쳐서 단어를 완성하세요!");
        runCountdown(["3", "2", "1", "출발!"], 0, () => startStage(0));
    };
    if (!hasSeenTutorial("gameType")) {
        showTutorial("gameType", startGame);
    } else {
        startGame();
    }
};
