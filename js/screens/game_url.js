/* ============================================================
   4단원 스텝 2: 주소창 타이핑
   가짜 브라우저 윈도우의 주소창에 URL 정확히 입력 + Enter
   ============================================================ */

SCREEN_RENDERERS.gameUrl = function (root, params) {
    const screen = el("div", { class: "screen game game--url game--unit4" });
    const cfg = URL_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;
    let urlsCorrect = 0;
    let currentTarget = "";
    let typed = "";

    // HUD
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
            el("span", { text: "🔗" }),
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

    // 미션
    const mission = el("div", { class: "internet-mission" },
        el("span", { text: "📝 이 주소를 입력하세요: " }),
        el("span", { class: "internet-mission__target", text: "—" }),
    );
    screen.appendChild(mission);

    // 가짜 브라우저
    const browser = el("div", { class: "fake-browser" },
        el("div", { class: "fake-browser__tabs" },
            el("div", { class: "fake-browser__tab", text: "🌐 새 탭" }),
            el("span", { class: "fake-browser__buttons", text: "─ ☐ ✕" }),
        ),
        el("div", { class: "fake-browser__nav" },
            el("span", { class: "fake-browser__btn", text: "←" }),
            el("span", { class: "fake-browser__btn", text: "→" }),
            el("span", { class: "fake-browser__btn", text: "↻" }),
            el("div", { class: "fake-browser__urlbar" },
                el("span", { class: "fake-browser__lock", text: "🔒" }),
                el("span", { class: "fake-browser__url-typed", text: "" }),
                el("span", { class: "fake-browser__caret", text: "│" }),
            ),
        ),
        el("div", { class: "fake-browser__content" },
            el("div", { class: "fake-browser__welcome", text: "🌐 주소를 입력하고 Enter를 누르세요!" }),
        ),
    );
    screen.appendChild(browser);

    const urlTypedEl = browser.querySelector(".fake-browser__url-typed");
    const contentEl = browser.querySelector(".fake-browser__content");
    const navEl = browser.querySelector(".fake-browser__nav");

    // 자동완성 추천 박스 (주소창 바로 아래에 드롭다운)
    const urlSuggestBox = el("div", { class: "url-suggest" });
    const urlSuggestItem = el("div", { class: "url-suggest__item" },
        el("span", { class: "url-suggest__icon", text: "🔍" }),
        el("span", { class: "url-suggest__text", text: "" }),
    );
    urlSuggestBox.appendChild(urlSuggestItem);
    // nav 다음에 삽입 → content 위
    navEl.insertAdjacentElement("afterend", urlSuggestBox);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 주소창에 정확히 입력 → Enter! 한 번에 성공하면 남은시간 × 보너스!" });
    screen.appendChild(bottomHelp);

    function updateUrlSuggest() {
        if (!inStage || finished || !currentTarget) {
            urlSuggestBox.classList.remove("url-suggest--show");
            return;
        }
        // 4글자 이상 (예: www.) + 시작이 일치 + 미완성
        if (typed.length >= 4 && typed.length < currentTarget.length
            && currentTarget.startsWith(typed)) {
            urlSuggestItem.querySelector(".url-suggest__text").textContent = currentTarget;
            urlSuggestBox.classList.add("url-suggest--show");
        } else {
            urlSuggestBox.classList.remove("url-suggest--show");
        }
    }

    urlSuggestItem.addEventListener("click", () => {
        if (!inStage || finished || !currentTarget) return;
        typed = currentTarget;
        urlTypedEl.textContent = typed;
        urlTypedEl.style.color = "#2c3e50";
        urlSuggestBox.classList.remove("url-suggest--show");
        Audio.tick && Audio.tick();
    });

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function loadNextUrl() {
        const stage = cfg.stages[stageIndex];
        currentTarget = stage.urls[Math.floor(Math.random() * stage.urls.length)];
        typed = "";
        urlTypedEl.textContent = "";
        urlTypedEl.style.color = "#2c3e50";
        mission.querySelector(".internet-mission__target").textContent = currentTarget;
        contentEl.innerHTML = "";
        contentEl.appendChild(el("div", { class: "fake-browser__welcome", text: "🌐 주소를 입력하고 Enter!" }));
        urlSuggestBox.classList.remove("url-suggest--show");
    }

    function onKey(e) {
        if (!inStage || finished) return;
        const stage = cfg.stages[stageIndex];

        if (e.key === "Enter") {
            e.preventDefault();
            if (typed === currentTarget) {
                // 정답! → 즉시 단계 종료 + 시간 보너스
                handleCorrectUrl(stage);
            } else {
                score = Math.max(0, score - stage.wrongPenalty);
                updateScoreDisplay();
                Audio.wrong();
                browser.classList.add("fake-browser--error");
                setTimeout(() => browser.classList.remove("fake-browser--error"), 500);
            }
            return;
        }
        if (e.key === "Backspace") {
            e.preventDefault();
            typed = typed.slice(0, -1);
            urlTypedEl.textContent = typed;
            updateUrlSuggest();
            return;
        }
        // 일반 문자
        if (e.key.length === 1) {
            e.preventDefault();
            typed += e.key.toLowerCase();
            urlTypedEl.textContent = typed;
            Audio.tick();
            // 색상 피드백 — 맞춰지면 초록, 틀리면 빨강
            if (currentTarget.startsWith(typed)) {
                urlTypedEl.style.color = "#2c3e50";
            } else {
                urlTypedEl.style.color = "#d63031";
            }
            updateUrlSuggest();
        }
    }
    document.addEventListener("keydown", onKey);

    function handleCorrectUrl(stage) {
        if (!inStage) return;
        inStage = false;     // 즉시 정지 (timer 멈춤)
        urlsCorrect++;

        const baseGain = stage.pointsPerUrl;
        const remainSec = Math.max(0, (stageEndsAt - performance.now()) / 1000);
        const bonus = Math.floor(remainSec) * (stage.timeBonusPerSec || 0);
        const total = baseGain + bonus;
        score += total;
        updateScoreDisplay();
        Audio.bigCorrect(8);
        showPageLoaded(currentTarget);
        showTimeBonus(remainSec, baseGain, bonus);

        // 다음 단계로 (또는 게임 종료)
        setTimeout(() => endStage(), 1900);
    }

    function showTimeBonus(remainSec, base, bonus) {
        const banner = el("div", { class: "cycle-banner",
            text: `⚡ ${Math.floor(remainSec)}초 남음! 기본 +${base.toLocaleString()} · 시간 보너스 +${bonus.toLocaleString()} = +${(base+bonus).toLocaleString()}점!` });
        screen.appendChild(banner);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 26, ["✨","⭐","🌟","💫","🎉","🎊","🔗"]);
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1700);
    }

    function showPageLoaded(url) {
        contentEl.innerHTML = "";
        contentEl.appendChild(el("div", { class: "fake-browser__loaded",
            text: `✨ ${url} 페이지가 열렸어요!` }));
        // 가짜 페이지 미리보기 (간단)
        if (url.includes("naver")) {
            contentEl.appendChild(el("div", { class: "fake-page-naver", text: "NAVER" }));
        } else if (url.includes("google")) {
            contentEl.appendChild(el("div", { class: "fake-page-google", text: "Google" }));
        } else if (url.includes("youtube")) {
            contentEl.appendChild(el("div", { class: "fake-page-youtube", text: "▶️ YouTube" }));
        } else {
            contentEl.appendChild(el("div", { class: "fake-page-generic", text: "📄 " + url }));
        }
    }

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            loadNextUrl();
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
        if (finished) return;            // handleCorrectUrl이 미리 inStage=false로 만들어도 진행 가능
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
            bestCombo: urlsCorrect,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "📝 주소창에 정확히 입력 → Enter!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameUrl")) {
        showTutorial("gameUrl", startGame);
    } else {
        startGame();
    }
};
