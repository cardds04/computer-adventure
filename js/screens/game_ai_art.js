/* ============================================================
   4단원 스텝 4: AI 그림 생성기 + 미술관
   1) 미션 카드: "사과를 그려줘"
   2) 학생이 AI 프롬프트 입력 → 생성 버튼
   3) AI가 그림(이모지) 생성
   4) "걸기!" 버튼 → 액자에 그림이 걸림
   5) 다음 미션으로
   ============================================================ */

SCREEN_RENDERERS.gameAiArt = function (root, params) {
    const screen = el("div", { class: "screen game game--ai-art game--unit4" });
    const cfg = AI_ART_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;

    let currentPainting = null;
    let phase = "prompt";   // "prompt" | "generated" | "hung"
    let generatedEmoji = "";
    let paintingsCompleted = 0;       // 전체 누적
    let stagePaintingsCompleted = 0;  // 현재 단계에서 성공한 개수
    let paintingsPool = [];
    let galleryFrames = [];   // 화면 하단에 걸린 작품들 (이모지 배열)
    const STAGE_CLEAR_COUNT = 2;      // 단계 클리어 조건: 작품 2개

    const goalScore = LESSONS_UNIT4.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "60.0", style: { color: "var(--secondary-dark)" } });
    const hungEl = el("span", { class: "hud-chip__big", text: "0" });
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
            el("span", { text: "🎨" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "🖼️" }),
            el("span", { class: "stat-chip__label", text: "걸린수" }),
            hungEl,
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

    // ----- 미션 카드 -----
    const missionCard = el("div", { class: "ai-mission" },
        el("span", { class: "ai-mission__icon", text: "🎨" }),
        el("span", { class: "ai-mission__text", text: "—" }),
    );
    screen.appendChild(missionCard);

    // ----- AI 생성기 패널 -----
    const generator = el("div", { class: "ai-generator" });
    const genHeader = el("div", { class: "ai-generator__header" },
        el("span", { class: "ai-generator__bot", text: "🤖" }),
        el("span", { class: "ai-generator__title", text: "AI 그림 생성기" }),
        el("span", { class: "ai-generator__status", text: "대기 중..." }),
    );
    generator.appendChild(genHeader);

    // 프롬프트 입력
    const promptRow = el("div", { class: "ai-generator__inputrow" });
    const promptInput = el("input", {
        class: "ai-generator__input",
        attrs: { type: "text", placeholder: "예: 사과, 큰 나무, 무지개...",
                  autocomplete: "off", spellcheck: "false" },
    });
    const genBtn = el("button", { class: "ai-generator__btn", text: "✨ 생성!" });
    promptRow.appendChild(promptInput);
    promptRow.appendChild(genBtn);
    generator.appendChild(promptRow);

    // 자동완성 추천 박스 (프롬프트 아래)
    const aiSuggestBox = el("div", { class: "ai-suggest" });
    const aiSuggestItem = el("div", { class: "ai-suggest__item" },
        el("span", { class: "ai-suggest__icon", text: "🤖" }),
        el("span", { class: "ai-suggest__text", text: "" }),
    );
    aiSuggestBox.appendChild(aiSuggestItem);
    generator.appendChild(aiSuggestBox);

    // 결과 영역 (생성된 그림 + 액자)
    const outputArea = el("div", { class: "ai-generator__output" });
    const canvasFrame = el("div", { class: "ai-canvas" });
    const canvasArt = el("div", { class: "ai-canvas__art", text: "" });
    const canvasHint = el("div", { class: "ai-canvas__hint", text: "여기에 AI가 그림을 그려줘요!" });
    canvasFrame.appendChild(canvasHint);
    canvasFrame.appendChild(canvasArt);
    outputArea.appendChild(canvasFrame);

    const hangBtn = el("button", { class: "ai-hang-btn", text: "🖼️ 액자에 걸기!" });
    outputArea.appendChild(hangBtn);
    generator.appendChild(outputArea);

    screen.appendChild(generator);

    // ----- 미술관 (걸린 작품들) -----
    const gallery = el("div", { class: "ai-gallery" });
    const galleryTitle = el("div", { class: "ai-gallery__title", text: "🏛️ 송양초 미술관" });
    const galleryRow = el("div", { class: "ai-gallery__row" });
    gallery.appendChild(galleryTitle);
    gallery.appendChild(galleryRow);
    screen.appendChild(gallery);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 각 단계에서 작품 2개 완성 → 단계 클리어! 남은 시간은 보너스 점수!" });
    screen.appendChild(bottomHelp);

    // ----- 이벤트 핸들러 -----
    promptInput.addEventListener("keydown", (e) => {
        if (!inStage || finished || phase !== "prompt") return;
        if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
            e.preventDefault();
            if ((promptInput.value || "").trim()) submitPrompt();
        }
    });
    promptInput.addEventListener("input", () => {
        if (inStage) Audio.tick();
        updateAiSuggest();
    });

    function updateAiSuggest() {
        if (!inStage || finished || phase !== "prompt" || !currentPainting) {
            aiSuggestBox.classList.remove("ai-suggest--show");
            return;
        }
        const typed = (promptInput.value || "").trim();
        const full = currentPainting.mission;
        // 2글자 이상 + 미션 시작 부분과 일치 + 미완성
        if (typed.length >= 2 && typed.length < full.length && full.startsWith(typed)) {
            aiSuggestItem.querySelector(".ai-suggest__text").textContent = full;
            aiSuggestBox.classList.add("ai-suggest--show");
        } else {
            aiSuggestBox.classList.remove("ai-suggest--show");
        }
    }

    aiSuggestItem.addEventListener("click", () => {
        if (!inStage || finished || phase !== "prompt" || !currentPainting) return;
        promptInput.value = currentPainting.mission;
        promptInput.focus();
        aiSuggestBox.classList.remove("ai-suggest--show");
        Audio.tick && Audio.tick();
    });
    genBtn.addEventListener("click", () => {
        if (!inStage || finished) return;
        if (phase === "prompt" && (promptInput.value || "").trim()) submitPrompt();
    });
    hangBtn.addEventListener("click", () => {
        if (!inStage || finished) return;
        if (phase === "generated") hangArtwork();
    });

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        hungEl.textContent = paintingsCompleted;
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function pickNextPainting() {
        if (paintingsPool.length === 0) {
            paintingsPool = shuffle(cfg.stages[stageIndex].paintings);
        }
        return paintingsPool.shift();
    }

    function loadNextPainting() {
        currentPainting = pickNextPainting();
        phase = "prompt";
        generatedEmoji = "";
        promptInput.value = "";
        promptInput.disabled = false;
        genBtn.disabled = false;
        hangBtn.classList.remove("ai-hang-btn--ready");
        hangBtn.disabled = true;
        canvasArt.textContent = "";
        canvasArt.className = "ai-canvas__art";
        canvasHint.style.display = "";
        canvasHint.textContent = "여기에 AI가 그림을 그려줘요!";
        canvasFrame.classList.remove("ai-canvas--filled");
        genHeader.querySelector(".ai-generator__status").textContent = "대기 중...";
        missionCard.querySelector(".ai-mission__text").textContent = `"${currentPainting.mission}"`;
        aiSuggestBox.classList.remove("ai-suggest--show");
        setTimeout(() => promptInput.focus(), 60);
    }

    function normalize(s) {
        return String(s || "").replace(/\s+/g, "");
    }

    function checkPrompt(typed) {
        const clean = normalize(typed);
        if (!clean) return false;
        return currentPainting.keywords.some(k => {
            const ck = normalize(k);
            return clean.includes(ck) || ck.includes(clean);
        });
    }

    function submitPrompt() {
        const typed = (promptInput.value || "").trim();
        if (!typed) return;
        const stage = cfg.stages[stageIndex];

        if (!checkPrompt(typed)) {
            // 오답 — 흔들기
            score = Math.max(0, score - stage.wrongPenalty);
            updateScoreDisplay();
            promptInput.classList.add("ai-generator__input--error");
            setTimeout(() => promptInput.classList.remove("ai-generator__input--error"), 500);
            Audio.wrong();
            genHeader.querySelector(".ai-generator__status").textContent = "❌ 잘 이해하지 못했어요. 다시 시도!";
            const r = promptInput.getBoundingClientRect();
            showScoreFloat(r.left + r.width / 2, r.top, `❌ -${stage.wrongPenalty}`, "bad");
            return;
        }

        // 정답 — AI가 그림 생성!
        phase = "generating";
        promptInput.disabled = true;
        genBtn.disabled = true;
        canvasHint.style.display = "none";
        canvasArt.textContent = "🌀";
        canvasArt.classList.add("ai-canvas__art--loading");
        genHeader.querySelector(".ai-generator__status").textContent = "🤖 AI가 그림을 그리는 중...";

        setTimeout(() => {
            if (!inStage || finished) return;
            // 그림 등장
            generatedEmoji = currentPainting.emoji;
            canvasArt.textContent = generatedEmoji;
            canvasArt.className = "ai-canvas__art ai-canvas__art--generated";
            canvasFrame.classList.add("ai-canvas--filled");
            genHeader.querySelector(".ai-generator__status").textContent = "✨ 완성! 액자에 걸어주세요!";
            phase = "generated";
            hangBtn.disabled = false;
            hangBtn.classList.add("ai-hang-btn--ready");
            Audio.bigCorrect(6);
            const r = canvasArt.getBoundingClientRect();
            emitParticles(r.left + r.width / 2, r.top + r.height / 2, 16, ["✨","⭐","🌟","💫","🎨","🤖"]);
        }, 700);
    }

    function hangArtwork() {
        if (!generatedEmoji) return;
        phase = "hung";
        hangBtn.disabled = true;
        hangBtn.classList.remove("ai-hang-btn--ready");

        const stage = cfg.stages[stageIndex];
        score += stage.pointsPerArt;
        paintingsCompleted++;
        stagePaintingsCompleted++;
        updateScoreDisplay();
        Audio.bigCorrect(8);
        if (Audio.perfectBell) Audio.perfectBell();

        // 액자 추가 애니메이션 — 캔버스에서 갤러리로
        const fromR = canvasArt.getBoundingClientRect();
        const flyingArt = el("div", { class: "ai-flying-art", text: generatedEmoji });
        flyingArt.style.left = `${fromR.left + fromR.width / 2 - 30}px`;
        flyingArt.style.top = `${fromR.top + fromR.height / 2 - 30}px`;
        document.body.appendChild(flyingArt);

        // 갤러리에 새 액자 추가
        const frameEl = el("div", { class: "ai-gallery__frame" },
            el("div", { class: "ai-gallery__art", text: generatedEmoji }),
        );
        frameEl.style.visibility = "hidden";   // 도착 후 보이기
        galleryRow.appendChild(frameEl);
        // 자동 스크롤 우측 끝
        galleryRow.scrollLeft = galleryRow.scrollWidth;

        const toR = frameEl.getBoundingClientRect();
        flyingArt.style.setProperty("--target-x", `${toR.left + toR.width / 2 - fromR.left - fromR.width / 2}px`);
        flyingArt.style.setProperty("--target-y", `${toR.top + toR.height / 2 - fromR.top - fromR.height / 2}px`);
        setTimeout(() => {
            flyingArt.remove();
            frameEl.style.visibility = "";
            frameEl.classList.add("ai-gallery__frame--pop");
        }, 700);

        // 캔버스 정리
        setTimeout(() => {
            canvasArt.classList.add("ai-canvas__art--hung");
        }, 200);

        // 점수 토스트
        const cx = window.innerWidth / 2;
        showScoreFloat(cx, fromR.top, `🎉 +${stage.pointsPerArt.toLocaleString()}`, "good");

        // 단계 클리어 체크
        if (stagePaintingsCompleted >= STAGE_CLEAR_COUNT) {
            // 남은 시간을 보너스로!
            setTimeout(() => {
                if (!inStage || finished) return;
                clearStageWithBonus();
            }, 900);
        } else {
            // 다음 그림
            setTimeout(() => {
                if (inStage && !finished) loadNextPainting();
            }, 1200);
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
        // 단계 클리어 배너
        const banner = el("div", { class: "math-stage-banner",
            text: `🎉 ${stageIndex + 1}단계 클리어!` });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.5s, transform 0.5s";
            banner.style.opacity = "0";
            banner.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => banner.remove(), 520);
        }, 1100);
        // 단계 종료
        setTimeout(() => endStage(), 1300);
    }

    // ----- 스테이지 -----
    function buildGalleryForStage() {
        galleryRow.innerHTML = "";
    }

    function startStage(idx) {
        stageIndex = idx;
        stagePaintingsCompleted = 0;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(`${stage.label}  (작품 ${STAGE_CLEAR_COUNT}개 완성하기!)`);
        Audio.roundStart();
        paintingsPool = [];
        buildGalleryForStage();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            loadNextPainting();
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
            timerEl.style.color = remain < 8 ? "#d63031" : "var(--secondary-dark)";
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
            bestCombo: paintingsCompleted,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "🤖 AI에게 명령 → 그림 생성 → 액자에 걸기!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameAiArt")) {
        showTutorial("gameAiArt", startGame);
    } else {
        startGame();
    }
};
