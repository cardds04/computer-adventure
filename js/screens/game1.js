/* ============================================================
   1단원 게임 — 러시 모드
   라운드마다 5초간 단어가 폭우처럼 떨어짐. 정답 클릭하면 점수.
   ============================================================ */

SCREEN_RENDERERS.game1 = function (root, params) {
    const screen = el("div", { class: "screen game" });

    // ----- 상태 -----
    let roundIndex = 0;
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;          // 이전 최고점부터 시작
    let combo = 0;
    let bestCombo = 0;
    let fallingWords = [];
    let lastTickAt = 0;
    let rafId = null;
    let roundEndsAt = 0;          // performance.now() 기준
    let spawnTimer = null;
    let inRound = false;
    let roundClicks = { correct: 0, wrong: 0 };

    // 스프라이트 프리로드 — 전부 로드 성공할 때만 SVG 사용, 실패하면 이모지 폴백
    // (에셋 404·배포지연·캐시에도 아이콘이 사라지지 않도록)
    let useSprites = false;
    (function preloadPartSprites() {
        const urls = Object.values(COMPUTER_PARTS).map(p => p.sprite).filter(Boolean);
        if (urls.length === 0) return;
        let remaining = urls.length, allOk = true;
        urls.forEach(u => {
            const img = new Image();
            const fin = () => { if (--remaining === 0) useSprites = allOk; };
            img.onload = fin;
            img.onerror = () => { allOk = false; fin(); };
            img.src = u;
        });
    })();

    // ----- HUD -----
    const goalScore = (LESSONS.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const roundEl = el("span", { text: `1 / ${LESSON1_ROUNDS.length}` });
    const timerEl = el("span", { class: "hud-chip__big", text: "5.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "🎯" }),
            el("span", { class: "stat-chip__label", text: "라운드" }),
            roundEl,
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

    // 점수가 목표 도달 시 색상 변화 + 레벨 실시간 갱신
    const updateScoreDisplay = () => {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + score);
    };

    // ----- 플레이어 캐릭터 -----
    const playerChar = el("div", {
        class: "player-character",
        text: getCurrentEmoji(),
    });
    screen.appendChild(playerChar);

    // ----- 게임 영역 -----
    const playArea = el("div", {
        style: {
            position: "absolute",
            inset: "0",
            overflow: "hidden",
        },
    });
    screen.appendChild(playArea);

    let promptBanner = null;
    let comboBadge = null;

    function showPrompt(round) {
        if (promptBanner) promptBanner.remove();
        promptBanner = el("div", { class: "prompt-banner" },
            el("span", { class: "prompt-banner__hint", text: round.hint }),
            el("span", { text: round.prompt }),
        );
        screen.appendChild(promptBanner);
    }

    function showCombo() {
        if (combo < 2) {
            if (comboBadge) { comboBadge.remove(); comboBadge = null; }
            return;
        }
        if (comboBadge) comboBadge.remove();
        comboBadge = el("div", { class: "combo-badge", text: `🔥 ${combo} 콤보!` });
        screen.appendChild(comboBadge);
    }

    function spawnOne(round) {
        if (!inRound) return;
        const correctKeys = round.correct;

        // 정답만 떨어짐 (오답 없음)
        const key = correctKeys[Math.floor(Math.random() * correctKeys.length)];
        const isCorrect = true;
        const part = COMPUTER_PARTS[key];
        // 1/30 확률로 ×10 보너스 단어
        const isBonus = Math.random() < (1 / 30);
        // 아이콘: 스프라이트가 로드 성공(useSprites)했을 때만 이미지로, 아니면 이모지 폴백
        const iconHtml = part
            ? ((useSprites && part.sprite)
                ? `<span class="word-sprite" style="background-image:url('${part.sprite}')"></span>`
                : `<span style="font-size: 32px; line-height: 1;">${part.emoji}</span>`)
            : "";
        const labelHtml = part ? `<span>${part.word}</span>` : `<span>${key}</span>`;
        const displayHtml = `${iconHtml}${labelHtml}${isBonus ? '<span class="word-bonus">×10</span>' : ''}`;

        const areaWidth = screen.clientWidth;
        const speed = GAME_CONFIG.fallSpeedBase + roundIndex * GAME_CONFIG.fallSpeedPerRound;

        const wEl = el("div", { class: "falling-word" + (isBonus ? " falling-word--bonus" : ""), html: displayHtml });
        const startX = 60 + Math.random() * (areaWidth - 120);
        const startY = -60;

        wEl.style.left = `${startX}px`;
        wEl.style.top = `${startY}px`;
        wEl.style.transform = "translateX(-50%)";

        const wordObj = { el: wEl, vy: speed, x: startX, y: startY, isCorrect, key, isBonus };
        wEl.addEventListener("click", () => onWordClick(wordObj));

        fallingWords.push(wordObj);
        playArea.appendChild(wEl);
    }

    function onWordClick(wordObj) {
        if (!inRound) return;
        if (wordObj.el.classList.contains("correct") || wordObj.el.classList.contains("wrong")) return;

        const rect = wordObj.el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        if (wordObj.isCorrect) {
            wordObj.el.classList.add("correct");
            const comboBonus = Math.min(combo, GAME_CONFIG.comboMax) * GAME_CONFIG.comboBonus;
            const roundMultiplier = roundIndex + 1;          // R1=×1, R2=×2, R3=×3
            const baseGain = GAME_CONFIG.correctPointsBase * roundMultiplier + comboBonus;
            const gain = wordObj.isBonus ? baseGain * 10 : baseGain;
            score += gain;
            combo++;
            bestCombo = Math.max(bestCombo, combo);
            roundClicks.correct++;
            updateScoreDisplay();
            showCombo();

            // 사운드 (보너스는 무조건 화려하게)
            if (wordObj.isBonus) Audio.bigCorrect(8);
            else if (combo >= 3) Audio.bigCorrect(Math.min(combo, 8));
            else Audio.correct();

            // 점수 플로팅 (보너스는 더 크게)
            const pf = el("div", {
                class: "points-float" + (wordObj.isBonus ? " points-float--bonus" : ""),
                text: wordObj.isBonus ? `🎉 +${gain}!` : `+${gain}`,
                style: { left: `${cx}px`, top: `${cy}px` },
            });
            fxLayer.appendChild(pf);
            setTimeout(() => pf.remove(), 1100);

            emitParticles(cx, cy, 6, ["✨", "⭐", "🌟", "💫"]);

            setTimeout(() => wordObj.el.remove(), 400);
        } else {
            wordObj.el.classList.add("wrong");
            combo = 0;
            roundClicks.wrong++;
            showCombo();
            Audio.wrong();

            const mf = el("div", {
                class: "miss-float",
                text: "❌",
                style: { left: `${cx}px`, top: `${cy}px` },
            });
            fxLayer.appendChild(mf);
            setTimeout(() => mf.remove(), 900);

            score = Math.max(0, score - GAME_CONFIG.wrongPenalty);
            updateScoreDisplay();

            setTimeout(() => wordObj.el.remove(), 400);
        }
    }

    function endRound() {
        if (!inRound) return;
        inRound = false;
        clearInterval(spawnTimer);
        spawnTimer = null;

        // 남은 단어 모두 사라지게
        fallingWords.forEach(w => {
            if (w.el.classList.contains("correct") || w.el.classList.contains("wrong")) return;
            w.el.style.transition = "opacity 0.35s, transform 0.35s";
            w.el.style.opacity = "0";
            w.el.style.transform += " scale(0.6) translateY(20px)";
            setTimeout(() => w.el.remove(), 360);
        });
        fallingWords = [];

        if (promptBanner) {
            promptBanner.style.transition = "opacity 0.3s, transform 0.3s";
            promptBanner.style.opacity = "0";
            promptBanner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => promptBanner && promptBanner.remove(), 320);
        }

        if (comboBadge) {
            comboBadge.style.opacity = "0";
            setTimeout(() => comboBadge && comboBadge.remove(), 320);
            comboBadge = null;
        }
        combo = 0;

        roundIndex++;
        if (roundIndex >= LESSON1_ROUNDS.length) {
            setTimeout(() => finishGame(), 800);
        } else {
            // 라운드 사이 휴식
            setTimeout(() => startRound(), 1100);
        }
    }

    function startRound() {
        const round = LESSON1_ROUNDS[roundIndex];
        roundEl.textContent = `${roundIndex + 1} / ${LESSON1_ROUNDS.length}`;
        showPrompt(round);
        Audio.roundStart();
        roundClicks = { correct: 0, wrong: 0 };

        // 잠깐 제시어 읽을 시간
        setTimeout(() => {
            inRound = true;
            roundEndsAt = performance.now() + GAME_CONFIG.roundDuration;
            // 첫 단어 즉시 + 이후 주기적으로
            spawnOne(round);
            spawnTimer = setInterval(() => spawnOne(round), GAME_CONFIG.spawnIntervalMs);
            // 5초 후 종료
            setTimeout(endRound, GAME_CONFIG.roundDuration);
        }, 700);
    }

    function tick(t) {
        const dt = Math.min(50, t - (lastTickAt || t));
        lastTickAt = t;

        // 타이머 표시 업데이트
        if (inRound) {
            const remain = Math.max(0, (roundEndsAt - t) / 1000);
            timerEl.textContent = remain.toFixed(1);
            // 마지막 1초 빨간색
            timerEl.style.color = remain < 1 ? "#d63031" : "var(--secondary-dark)";
        }

        const screenHeight = screen.clientHeight;
        fallingWords = fallingWords.filter(w => {
            if (w.el.classList.contains("correct") || w.el.classList.contains("wrong")) {
                return true;
            }
            w.y += (w.vy * dt) / 1000;
            w.el.style.top = `${w.y}px`;
            if (w.y > screenHeight - 40) {
                if (w.isCorrect && inRound) {
                    // 정답을 놓침 → 콤보 끊김
                    combo = 0;
                    showCombo();
                }
                w.el.remove();
                return false;
            }
            return true;
        });

        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        if (spawnTimer) clearInterval(spawnTimer);
        rafId = null;
        spawnTimer = null;
        inRound = false;
    }

    function finishGame() {
        cleanup();
        Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", {
            lessonId: params.lessonId,
            score,
            bestCombo,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    // ----- 시작 카운트다운 -----
    function runCountdown(numbers, idx, cb) {
        if (idx >= numbers.length) { cb(); return; }
        const cd = el("div", { class: "countdown", text: numbers[idx] });
        screen.appendChild(cd);
        if (idx < numbers.length - 1) Audio.tick();
        else Audio.tickGo();
        setTimeout(() => {
            cd.remove();
            runCountdown(numbers, idx + 1, cb);
        }, 800);
    }

    // ----- 일시정지/재개 핸들러 -----
    let _pausedAt = null;
    let _wasInRound = false;
    const pauseHandler = {
        pause() {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
            if (roundTimer) { clearTimeout(roundTimer); roundTimer = null; }
            _pausedAt = performance.now();
            _wasInRound = inRound;
            inRound = false;
        },
        resume() {
            if (_pausedAt === null) return;
            const pauseDuration = performance.now() - _pausedAt;
            _pausedAt = null;
            if (_wasInRound) {
                roundEndsAt += pauseDuration;
                inRound = true;
                const round = LESSON1_ROUNDS[roundIndex];
                spawnTimer = setInterval(() => spawnOne(round), GAME_CONFIG.spawnIntervalMs);
                const remaining = Math.max(0, roundEndsAt - performance.now());
                roundTimer = setTimeout(endRound, remaining);
            }
            lastTickAt = 0;
            rafId = requestAnimationFrame(tick);
        },
    };

    root.appendChild(screen);
    updateScoreDisplay();

    const startGame = () => {
        showCarryOverBanner(startingScore);
        runCountdown(["3", "2", "1", "출발!"], 0, () => {
            startRound();
            rafId = requestAnimationFrame(tick);
        });
    };

    if (!hasSeenTutorial("game1")) {
        showTutorial("game1", startGame);
    } else {
        startGame();
    }
};
