/* ============================================================
   6단원: 글자 그리기 마스터
   마우스로 "송양초등학교 최고" 글자를 따라 그려서 채우기.
   각 글자가 일정 비율 채워지면 완성 (+1000점), 모두 채우면 보너스 (+2000점).
   ============================================================ */

SCREEN_RENDERERS.game6 = function (root, params) {
    const screen = el("div", { class: "screen game game--trace" });
    const cfg = TRACE_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let completedCount = 0;
    let bestCombo = 0;
    let rafId = null;
    let gameEndsAtFinish = null;
    let finished = false;

    const chars = Array.from(cfg.word);   // ["송","양","초","등","학","교"," ","최","고"]
    const totalChars = chars.filter(c => c !== " ").length;

    // ----- HUD -----
    const goalScore = (LESSONS.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const progressEl = el("span", { text: `0 / ${totalChars}` });
    const lvlChip = makeLevelChip();
    lvlChip.update(state.points);

    const exitBtn = el("button", {
        class: "btn btn--ghost",
        text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => { cleanup(); navigate("home"); } },
    });

    const clearBtn = el("button", {
        class: "btn btn--ghost",
        text: "🗑️ 다시 그리기",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => clearAllChars() },
    });

    const hud = el("div", { class: "game__hud" },
        exitBtn,
        el("span", { class: "hud-chip" },
            el("span", { text: "✍️" }),
            el("span", { class: "stat-chip__label", text: "완성" }),
            progressEl,
        ),
        lvlChip.chip,
        el("span", { class: "hud-chip" },
            el("span", { text: "⭐" }),
            scoreEl,
            el("span", { class: "hud-chip__sep", text: "/" }),
            el("span", { class: "hud-chip__goal", text: `${goalScore}` }),
        ),
        clearBtn,
    );
    screen.appendChild(hud);

    // ----- 안내 배너 -----
    const banner = el("div", {
        class: "prompt-banner",
        style: { top: "90px", fontSize: "22px" },
        html: `<span class="prompt-banner__hint">마우스로 글자 위를 꾹 눌러서 따라 그려보세요!</span><span>송양초등학교 최고 ✍️</span>`,
    });
    screen.appendChild(banner);

    // ----- 트레이싱 영역 -----
    const traceArea = el("div", { class: "trace-area" });
    const charNodes = [];
    chars.forEach((char, idx) => {
        if (char === " ") {
            traceArea.appendChild(el("div", { class: "trace-space" }));
            return;
        }
        const node = createTraceableChar(char, idx);
        charNodes.push(node);
        traceArea.appendChild(node.wrapper);
    });
    screen.appendChild(traceArea);

    function createTraceableChar(char, idx) {
        const wrapper = el("div", { class: "trace-char" });
        const bg = el("span", { class: "trace-char__bg", text: char });
        const canvas = document.createElement("canvas");
        canvas.className = "trace-char__canvas";
        canvas.width = cfg.charWidth * 2;       // 고해상도
        canvas.height = cfg.charHeight * 2;
        const checkEl = el("div", { class: "trace-char__check", text: "✓" });

        wrapper.appendChild(bg);
        wrapper.appendChild(canvas);
        wrapper.appendChild(checkEl);

        const ctx = canvas.getContext("2d");
        ctx.lineWidth = cfg.strokeWidth * 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = cfg.strokeColor;
        ctx.fillStyle = cfg.strokeColor;

        let isDrawing = false;
        let lastX = 0, lastY = 0;
        let completed = false;
        let movesSinceCheck = 0;

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height),
            };
        }

        canvas.addEventListener("pointerdown", (e) => {
            if (completed || finished) return;
            e.preventDefault();
            try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
            isDrawing = true;
            const pos = getPos(e);
            lastX = pos.x; lastY = pos.y;
            ctx.beginPath();
            ctx.arc(lastX, lastY, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            Audio.tick();
        });

        canvas.addEventListener("pointermove", (e) => {
            if (!isDrawing || completed || finished) return;
            e.preventDefault();
            const pos = getPos(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastX = pos.x; lastY = pos.y;

            movesSinceCheck++;
            if (movesSinceCheck >= 4) {
                movesSinceCheck = 0;
                checkProgress();
            }
        });

        const endDrawing = (e) => {
            isDrawing = false;
            try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
            if (!completed && !finished) checkProgress();
        };
        canvas.addEventListener("pointerup", endDrawing);
        canvas.addEventListener("pointercancel", endDrawing);
        canvas.addEventListener("pointerleave", (e) => {
            isDrawing = false;
        });

        function checkProgress() {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let count = 0;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 50) count++;
            }
            const ratio = count / (canvas.width * canvas.height);
            if (ratio > cfg.completionThreshold && !completed) {
                completed = true;
                onCharComplete(idx, wrapper);
            }
        }

        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            completed = false;
            wrapper.classList.remove("completed");
        }

        return { wrapper, clearCanvas, char };
    }

    function onCharComplete(idx, wrapperEl) {
        completedCount++;
        score += cfg.pointsPerChar;
        updateScoreDisplay();
        Audio.correct();
        wrapperEl.classList.add("completed");
        progressEl.textContent = `${completedCount} / ${totalChars}`;

        const rect = wrapperEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pf = el("div", {
            class: "points-float",
            text: `+${cfg.pointsPerChar}`,
            style: { left: `${cx}px`, top: `${cy}px`, fontSize: "30px" },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1100);
        emitParticles(cx, cy, 8, ["✨", "⭐", "🌟", "💫"]);

        if (completedCount === totalChars) {
            // 모두 완성!
            score += cfg.allCompleteBonus;
            updateScoreDisplay();
            Audio.bigCorrect(8);
            showAllCompleteBanner();
            setTimeout(finishGame, 2400);
        }
    }

    function showAllCompleteBanner() {
        const winBanner = el("div", { class: "trace-win-banner" },
            el("div", { class: "trace-win-banner__title", text: "🎉 모든 글자 완성!" }),
            el("div", { class: "trace-win-banner__sub", text: `+${cfg.allCompleteBonus}점 보너스!` }),
        );
        screen.appendChild(winBanner);

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 20, ["✨", "⭐", "🌟", "💫", "🎉", "🎊"]);
    }

    function clearAllChars() {
        if (finished) return;
        charNodes.forEach(n => n.clearCanvas());
        completedCount = 0;
        // 점수는 유지 (이미 받은 점수는 안 깎음)
        progressEl.textContent = `0 / ${totalChars}`;
    }

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function cleanup() {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
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
            bestCombo: completedCount,
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

    root.appendChild(screen);
    addHelpButton(screen, "game6");

    const startGame = () => {
        showCarryOverBanner(startingScore);
        runCountdown(["3", "2", "1", "그려요!"], 0, () => {
            Audio.roundStart();
        });
    };

    if (!hasSeenTutorial("game6")) {
        showTutorial("game6", startGame);
    } else {
        startGame();
    }
};
