/* ============================================================
   4단원 스텝 3: 검색해서 정답 찾기
   1) 질문 표시 → 학생이 질문을 검색창에 입력 → Enter
   2) 가짜 검색 결과 등장 (정답이 결과 안에 들어있음)
   3) 학생이 결과를 읽고 "정답 입력란"에 정답 타이핑 → Enter
   4) 정답이면 +점수, 다음 질문 / 오답이면 -페널티
   ============================================================ */

SCREEN_RENDERERS.gameQuiz = function (root, params) {
    const screen = el("div", { class: "screen game game--quiz game--unit4" });
    const cfg = QUIZ_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let correctCount = 0;

    let currentQ = null;
    let phase = "search";       // "search" | "answer"
    let questionsPool = [];

    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "60.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "🧠" }),
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

    // 질문 카드
    const qCard = el("div", { class: "quiz-question" },
        el("span", { class: "quiz-question__icon", text: "❓" }),
        el("span", { class: "quiz-question__text", text: "—" }),
    );
    screen.appendChild(qCard);

    // 검색 + 결과 + 정답 입력 패널
    const searchPanel = el("div", { class: "quiz-search-panel" });

    // 검색창
    const searchRow = el("div", { class: "quiz-search-row" });
    const searchInput = el("input", {
        class: "quiz-searchbox__input",
        attrs: { type: "text", placeholder: "위 질문을 그대로 검색창에 입력하세요!",
                  autocomplete: "off", spellcheck: "false" },
    });
    const searchBox = el("div", { class: "quiz-searchbox" },
        el("span", { class: "quiz-searchbox__icon", text: "🔎" }),
        searchInput,
    );
    const searchBtn = el("button", { class: "quiz-search-btn", text: "검색" });
    searchRow.appendChild(searchBox);
    searchRow.appendChild(searchBtn);
    searchPanel.appendChild(searchRow);

    // 자동완성 추천 박스 (검색창 아래)
    const suggestBox = el("div", { class: "quiz-suggest" });
    const suggestItem = el("div", { class: "quiz-suggest__item" },
        el("span", { class: "quiz-suggest__icon", text: "🔍" }),
        el("span", { class: "quiz-suggest__text", text: "" }),
    );
    suggestBox.appendChild(suggestItem);
    searchPanel.appendChild(suggestBox);

    // 결과 영역
    const resultsEl = el("div", { class: "quiz-results" });
    searchPanel.appendChild(resultsEl);

    // 정답 입력 영역 (처음엔 숨김)
    const answerRow = el("div", { class: "quiz-answer-row" });
    const answerLabel = el("div", { class: "quiz-answer__label", text: "💡 정답을 입력하세요:" });
    const answerInput = el("input", {
        class: "quiz-answer__input",
        attrs: { type: "text", placeholder: "위 결과를 읽고 정답을 적어주세요",
                  autocomplete: "off", spellcheck: "false" },
    });
    const answerBtn = el("button", { class: "quiz-answer__btn", text: "제출" });
    const answerWrap = el("div", { class: "quiz-answer__inputrow" }, answerInput, answerBtn);
    answerRow.appendChild(answerLabel);
    answerRow.appendChild(answerWrap);
    searchPanel.appendChild(answerRow);

    screen.appendChild(searchPanel);

    searchBox.addEventListener("click", () => searchInput.focus());
    searchBtn.addEventListener("click", () => {
        if (!inStage || finished) return;
        if (phase === "search" && (searchInput.value || "").trim()) submitSearch();
    });
    answerBtn.addEventListener("click", () => {
        if (!inStage || finished) return;
        if (phase === "answer" && (answerInput.value || "").trim()) submitAnswer();
    });

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 질문 검색 → 결과 읽고 → 정답 입력! 한 번에 맞추면 5만점 + 남은시간 × 보너스!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function pickNextQuestion() {
        if (questionsPool.length === 0) {
            questionsPool = shuffle(cfg.stages[stageIndex].questions);
        }
        return questionsPool.shift();
    }

    function loadNextQuestion() {
        currentQ = pickNextQuestion();
        phase = "search";
        // 검색창 초기화
        searchInput.value = "";
        searchInput.disabled = false;
        searchBtn.disabled = false;
        searchInput.placeholder = "위 질문을 그대로 검색창에 입력하세요!";
        // 정답 입력란 초기화 — 이전 단계 정답 성공 시 disabled 됐던 것 풀기!
        answerInput.value = "";
        answerInput.disabled = false;
        answerInput.classList.remove("quiz-answer__input--correct", "quiz-answer__input--wrong");
        answerBtn.disabled = false;
        answerRow.classList.remove("quiz-answer-row--visible");
        // 질문/결과 초기화
        qCard.querySelector(".quiz-question__text").textContent = currentQ.q;
        resultsEl.innerHTML = "";
        resultsEl.appendChild(el("div", { class: "quiz-results__hint",
            text: "🔍 위 질문을 검색창에 입력하고 Enter 누르면 결과가 나와요" }));
        suggestBox.classList.remove("quiz-suggest--show");
        setTimeout(() => searchInput.focus(), 60);
    }

    // 검색 입력값과 질문의 최장 공통 문자열 길이 계산
    function normalizeForOverlap(s) {
        return String(s || "").replace(/[\s?!.,;:'"()\[\]\-_·]/g, "");
    }
    function longestCommonSubstring(a, b) {
        if (!a || !b) return 0;
        let maxLen = 0;
        for (let i = 0; i < a.length; i++) {
            for (let len = 1; i + len <= a.length; len++) {
                const sub = a.substr(i, len);
                if (b.indexOf(sub) >= 0) {
                    if (len > maxLen) maxLen = len;
                } else {
                    break;
                }
            }
        }
        return maxLen;
    }

    function submitSearch() {
        const typed = (searchInput.value || "").trim();
        if (!typed) return;

        // 검색어 검증: 질문과 최소 5글자 이상 겹쳐야 통과
        const overlap = longestCommonSubstring(
            normalizeForOverlap(typed),
            normalizeForOverlap(currentQ.q)
        );
        if (overlap < 5) {
            Audio.wrong();
            searchBox.classList.add("quiz-searchbox--error");
            setTimeout(() => searchBox.classList.remove("quiz-searchbox--error"), 500);
            resultsEl.innerHTML = "";
            resultsEl.appendChild(el("div", { class: "quiz-results__hint quiz-results__hint--warn",
                text: "💡 질문과 비슷한 검색어가 필요해요! 질문의 일부(5글자 이상)를 그대로 따라 입력해보세요." }));
            return;
        }

        resultsEl.innerHTML = "";
        resultsEl.appendChild(el("div", { class: "quiz-results__queryline",
            text: `🔎 "${typed}" 검색 결과` }));

        // 정답 카드
        const answerCard = el("div", { class: "quiz-answer-card" },
            el("div", { class: "quiz-answer-card__label", text: "🎯 정답" },),
            el("div", { class: "quiz-answer-card__answer", text: currentQ.answerLabel }),
        );
        resultsEl.appendChild(answerCard);

        // 설명 카드
        const explanationCard = el("div", { class: "quiz-explanation" },
            el("div", { class: "quiz-explanation__label", text: "📚 설명" }),
            el("div", { class: "quiz-explanation__text",
                html: formatExplanation(currentQ.explanation) }),
        );
        resultsEl.appendChild(explanationCard);

        // 정답 입력 단계로 전환
        phase = "answer";
        searchInput.disabled = true;
        searchBtn.disabled = true;
        answerRow.classList.add("quiz-answer-row--visible");
        setTimeout(() => answerInput.focus(), 60);
        Audio.tickGo && Audio.tickGo();
    }

    // **text** 를 <b>text</b> 로 변환 (강조용)
    function formatExplanation(text) {
        const escaped = String(text).replace(/[&<>]/g, c =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
        return escaped.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    }

    function checkAnswer(userInput) {
        const clean = userInput.trim().replace(/\s+/g, "");
        if (!clean) return false;
        return currentQ.answers.some(ans => {
            const a = ans.trim().replace(/\s+/g, "");
            return clean.includes(a) || a.includes(clean);
        });
    }

    function submitAnswer() {
        const typed = (answerInput.value || "").trim();
        if (!typed) return;
        const stage = cfg.stages[stageIndex];
        if (checkAnswer(typed)) {
            handleCorrectAnswer(stage);
        } else {
            score = Math.max(0, score - stage.wrongPenalty);
            updateScoreDisplay();
            Audio.wrong();
            answerInput.classList.add("quiz-answer__input--wrong");
            setTimeout(() => answerInput.classList.remove("quiz-answer__input--wrong"), 500);
            const r = answerWrap.getBoundingClientRect();
            showScoreFloat(r.left + r.width / 2, r.top, `❌ -${stage.wrongPenalty}`, "bad");
        }
    }

    function handleCorrectAnswer(stage) {
        if (!inStage) return;
        inStage = false;        // 타이머 정지
        correctCount++;

        const baseGain = stage.pointsPerCorrect;
        const remainSec = Math.max(0, (stageEndsAt - performance.now()) / 1000);
        const bonus = Math.floor(remainSec) * (stage.timeBonusPerSec || 0);
        const total = baseGain + bonus;
        score += total;
        updateScoreDisplay();
        Audio.bigCorrect(8);

        answerInput.classList.add("quiz-answer__input--correct");
        answerInput.disabled = true;
        answerBtn.disabled = true;

        const r = answerWrap.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        showScoreFloat(cx, cy, `🎉 +${total.toLocaleString()}`, "good");
        emitParticles(cx, cy, 22, ["✨","⭐","🌟","🎯","🧠","🎉","🎊"]);
        showTimeBonus(remainSec, baseGain, bonus);

        // 즉시 다음 단계로 (또는 게임 종료)
        setTimeout(() => endStage(), 2000);
    }

    function showTimeBonus(remainSec, base, bonus) {
        const banner = el("div", { class: "cycle-banner",
            text: `⚡ ${Math.floor(remainSec)}초 남음! 정답 +${base.toLocaleString()} · 시간 보너스 +${bonus.toLocaleString()} = +${(base+bonus).toLocaleString()}점!` });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1800);
    }

    // 검색 입력 Enter
    searchInput.addEventListener("keydown", (e) => {
        if (!inStage || finished) return;
        if (phase !== "search") return;
        if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
            e.preventDefault();
            if ((searchInput.value || "").trim()) submitSearch();
        }
    });
    // 정답 입력 Enter
    answerInput.addEventListener("keydown", (e) => {
        if (!inStage || finished) return;
        if (phase !== "answer") return;
        if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
            e.preventDefault();
            if ((answerInput.value || "").trim()) submitAnswer();
        }
    });
    // 입력음 + 자동완성 추천
    searchInput.addEventListener("input", () => {
        if (inStage && !finished) Audio.tick();
        updateSuggest();
    });
    answerInput.addEventListener("input", () => inStage && !finished && Audio.tick());

    // 자동완성 추천 갱신
    function updateSuggest() {
        if (!inStage || finished || phase !== "search" || !currentQ) {
            suggestBox.classList.remove("quiz-suggest--show");
            return;
        }
        const typed = (searchInput.value || "").trim();
        const full = currentQ.q;
        // 2글자 이상 입력 + 질문의 시작 부분과 일치 + 아직 전체가 입력되지 않음
        if (typed.length >= 2 && typed.length < full.length && full.startsWith(typed)) {
            suggestItem.querySelector(".quiz-suggest__text").textContent = full;
            suggestBox.classList.add("quiz-suggest--show");
        } else {
            suggestBox.classList.remove("quiz-suggest--show");
        }
    }

    // 추천 클릭 → 검색창에 전체 질문 채우기
    suggestItem.addEventListener("click", () => {
        if (!inStage || finished || phase !== "search" || !currentQ) return;
        searchInput.value = currentQ.q;
        searchInput.focus();
        suggestBox.classList.remove("quiz-suggest--show");
        Audio.tick && Audio.tick();
    });

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        questionsPool = [];

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            loadNextQuestion();
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
        if (finished) return;
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
            bestCombo: correctCount,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "❓ 질문 → 🔎 검색 → 💡 정답 입력!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameQuiz")) {
        showTutorial("gameQuiz", startGame);
    } else {
        startGame();
    }
};
