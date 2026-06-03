/* ============================================================
   4단원 스텝 3: 검색하기
   가짜 네이버 메인. 검색창 클릭 → 키워드 입력 → Enter
   ============================================================ */

SCREEN_RENDERERS.gameSearch = function (root, params) {
    const screen = el("div", { class: "screen game game--search game--unit4" });
    const cfg = SEARCH_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let searches = 0;
    let stageSearches = 0;            // 현재 단계 성공 횟수
    const STAGE_CLEAR_COUNT = 3;      // 단계 클리어 조건: 검색 3회 성공
    let currentTarget = "";
    let typed = "";
    let searchBoxActive = false;

    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
    const timerEl = el("span", { class: "hud-chip__big", text: "15.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "🔎" }),
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

    const mission = el("div", { class: "internet-mission" },
        el("span", { text: "🔎 이 단어를 검색하세요: " }),
        el("span", { class: "internet-mission__target", text: "—" }),
    );
    screen.appendChild(mission);

    // 가짜 네이버
    const naver = el("div", { class: "fake-naver" });
    const logo = el("div", { class: "fake-naver__logo", text: "NAVER" });
    const searchRow = el("div", { class: "fake-naver__searchrow" });
    // 진짜 input 사용 — 한글 IME 자연스럽게 처리됨
    const searchInput = el("input", {
        class: "fake-naver__input",
        attrs: { type: "text", placeholder: "검색어를 입력해주세요", autocomplete: "off", spellcheck: "false" },
    });
    const searchBox = el("div", { class: "fake-naver__searchbox" }, searchInput);
    const searchBtn = el("button", { class: "fake-naver__searchbtn", text: "🔎" });
    searchRow.appendChild(searchBox);
    searchRow.appendChild(searchBtn);
    naver.appendChild(logo);
    naver.appendChild(searchRow);
    naver.appendChild(el("div", { class: "fake-naver__menu",
        html: `<span>📧 메일</span> <span>📁 카페</span> <span>📝 블로그</span> <span>🛒 쇼핑</span> <span>📰 뉴스</span>` }));
    screen.appendChild(naver);

    // 검색창 클릭 = 활성화 (focus 자동으로 됨)
    searchBox.addEventListener("click", () => {
        if (!inStage) return;
        searchInput.focus();
        searchBox.classList.add("fake-naver__searchbox--active");
    });
    searchInput.addEventListener("focus", () => {
        searchBox.classList.add("fake-naver__searchbox--active");
    });
    searchBtn.addEventListener("click", () => {
        if (!inStage || finished) return;
        submitSearch();
    });

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 검색창 클릭 → 키워드 입력 → 단계당 3개 성공! 남은 시간은 보너스!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function loadNextKeyword() {
        const stage = cfg.stages[stageIndex];
        currentTarget = stage.keywords[Math.floor(Math.random() * stage.keywords.length)];
        searchInput.value = "";
        searchInput.focus();
        searchBox.classList.add("fake-naver__searchbox--active");
        mission.querySelector(".internet-mission__target").textContent = `"${currentTarget}"`;
    }

    function normalize(s) {
        return (s || "").trim().replace(/\s+/g, "");
    }

    function submitSearch() {
        const stage = cfg.stages[stageIndex];
        const typedRaw = searchInput.value || "";
        // 공백 차이 무시하고 비교 (예: "재미있는 게임" == "재미있는게임")
        if (normalize(typedRaw) === normalize(currentTarget)) {
            // 정답!
            score += stage.pointsPerSearch;
            searches++;
            stageSearches++;
            updateScoreDisplay();
            Audio.bigCorrect(6);
            showResultsFlash(currentTarget);
            if (stageSearches >= STAGE_CLEAR_COUNT) {
                // 단계 클리어! 남은 시간을 보너스로
                setTimeout(() => {
                    if (inStage && !finished) clearStageWithBonus();
                }, 1100);
            } else {
                setTimeout(() => { if (inStage && !finished) loadNextKeyword(); }, 1300);
            }
        } else {
            score = Math.max(0, score - stage.wrongPenalty);
            updateScoreDisplay();
            Audio.wrong();
            searchBox.classList.add("fake-naver__searchbox--error");
            setTimeout(() => searchBox.classList.remove("fake-naver__searchbox--error"), 500);
        }
    }

    function clearStageWithBonus() {
        const stage = cfg.stages[stageIndex];
        const remainSec = Math.max(0, (stageEndsAt - performance.now()) / 1000);
        const bonus = Math.floor(remainSec * (stage.timeBonusPerSec || 0));
        if (bonus > 0) {
            score += bonus;
            updateScoreDisplay();
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            showScoreFloat(cx, cy - 60,
                `⏱️ 남은 시간 보너스 +${bonus.toLocaleString()}`, "good");
            if (Audio.bigCorrect) Audio.bigCorrect(12);
        }
        const banner = el("div", { class: "math-stage-banner",
            text: `🎉 ${stageIndex + 1}단계 클리어!` });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.5s, transform 0.5s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => banner.remove(), 520);
        }, 1100);
        setTimeout(() => endStage(), 1300);
    }

    function showResultsFlash(keyword) {
        const flash = el("div", { class: "fake-naver__results-flash",
            text: `🔎 "${keyword}" 검색 결과 페이지로 이동!` });
        screen.appendChild(flash);
        setTimeout(() => flash.remove(), 1100);
    }

    // input의 Enter 키만 처리 (한글 IME 조합 중에는 keyCode 229)
    searchInput.addEventListener("keydown", (e) => {
        if (!inStage || finished) return;
        if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
            e.preventDefault();
            submitSearch();
        }
    });
    // 한글 IME 조합 완료 후 input 이벤트로 들리는 효과음 처리
    searchInput.addEventListener("input", () => {
        if (inStage && !finished) Audio.tick();
    });
    function onKey() {}   // no-op (호환용)

    function startStage(idx) {
        stageIndex = idx;
        stageSearches = 0;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(`${stage.label}  (검색 ${STAGE_CLEAR_COUNT}개 성공!)`);
        Audio.roundStart();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            loadNextKeyword();
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
            bestCombo: searches,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "🔎 검색창 클릭 → 키워드 입력 → Enter!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameSearch")) {
        showTutorial("gameSearch", startGame);
    } else {
        startGame();
    }
};
