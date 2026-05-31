/* ============================================================
   3단원 스텝 2: Ctrl+C / Ctrl+V 복사 마법
   1단계: 파일 1개 (10초) / 2단계: 파일 여러 개 — 드래그 선택 (30초)
   복사+붙여넣은 파일은 왼쪽에서 휴지통으로 사라짐
   다 끝내면 남은시간 × 보너스
   ============================================================ */

SCREEN_RENDERERS.gameCopy = function (root, params) {
    const screen = el("div", { class: "screen game game--copy game--unit3" });
    const cfg = COPY_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;

    let leftFiles = [];        // [{el, name, copied}]
    let copiedCount = 0;
    let totalNeeded = 0;
    let clipboard = [];         // 복사된 파일 객체 배열
    let rightFolderSelected = false;
    // 드래그 선택
    let isDragging = false;
    let dragStart = null;
    let dragRect = null;
    let lassoEl = null;

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
    const timerEl = el("span", { class: "hud-chip__big", text: "10.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "📋" }),
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

    // 좌우 분할 영역
    const splitArea = el("div", { class: "copy-split" });
    const leftPane = el("div", { class: "copy-pane copy-pane--left" },
        el("div", { class: "copy-pane__title", text: "📁 원본 폴더 (여기서 복사)" }),
    );
    const leftGrid = el("div", { class: "copy-pane__grid" });
    leftPane.appendChild(leftGrid);

    const rightPane = el("div", { class: "copy-pane copy-pane--right" },
        el("div", { class: "copy-pane__title", text: "📁 복사본 폴더 (여기로 붙임)" }),
    );
    const rightGrid = el("div", { class: "copy-pane__grid" });
    rightPane.appendChild(rightGrid);

    // 오른쪽 폴더 클릭 = 선택
    rightPane.addEventListener("click", (e) => {
        if (!inStage) return;
        if (e.target.closest(".fd-icon")) return;
        rightFolderSelected = true;
        rightPane.classList.add("copy-pane--selected");
        // 왼쪽 파일 선택 해제
        leftFiles.forEach(f => f.el.classList.remove("fd-icon--selected"));
        e.stopPropagation();
    });

    splitArea.appendChild(leftPane);
    splitArea.appendChild(rightPane);
    screen.appendChild(splitArea);

    // 휴지통
    const trash = el("div", { class: "copy-trash" },
        el("div", { class: "copy-trash__icon", text: "🗑️" }),
        el("div", { class: "copy-trash__label", text: "휴지통" }),
    );
    screen.appendChild(trash);

    // 단축키 카드
    const cards = makeShortcutCards([
        { combo: "드래그", label: "다중선택", icon: "🖱️" },
        { combo: "Ctrl+C", label: "복사", icon: "📋" },
        { combo: "Ctrl+V", label: "붙임", icon: "🖌️" },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 파일 클릭/드래그로 선택 → Ctrl+C → 오른쪽 폴더 클릭 → Ctrl+V! 다 복사하면 보너스!" });
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

    function buildStage() {
        const stage = cfg.stages[stageIndex];
        leftGrid.innerHTML = "";
        rightGrid.innerHTML = "";
        leftFiles = [];
        copiedCount = 0;
        totalNeeded = stage.fileCount;
        clipboard = [];
        rightFolderSelected = false;
        rightPane.classList.remove("copy-pane--selected");

        const names = shuffle(cfg.fileNames).slice(0, stage.fileCount);
        names.forEach(name => {
            const fileEl = makeFileIcon(name);
            fileEl.addEventListener("click", (e) => {
                if (!inStage) return;
                e.stopPropagation();
                rightPane.classList.remove("copy-pane--selected");
                rightFolderSelected = false;
                const fileObj = leftFiles.find(f => f.el === fileEl);
                if (!fileObj || fileObj.copied) return;
                // Ctrl 또는 Shift = 추가 선택, 아니면 단일 선택
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    leftFiles.forEach(f => f.el.classList.remove("fd-icon--selected"));
                }
                fileEl.classList.toggle("fd-icon--selected");
            });
            leftGrid.appendChild(fileEl);
            leftFiles.push({ el: fileEl, name, copied: false });
        });
    }

    // ----- 드래그 선택 (lasso) -----
    leftGrid.addEventListener("pointerdown", (e) => {
        if (!inStage) return;
        if (e.target.closest(".fd-icon")) return;   // 아이콘 위 클릭은 무시
        isDragging = true;
        const rect = leftGrid.getBoundingClientRect();
        dragStart = { x: e.clientX, y: e.clientY };
        lassoEl = el("div", { class: "copy-lasso" });
        document.body.appendChild(lassoEl);
        // 단일 클릭처럼 보이면 선택 해제
        leftFiles.forEach(f => f.el.classList.remove("fd-icon--selected"));
        e.preventDefault();
    });

    document.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const x1 = Math.min(dragStart.x, e.clientX);
        const y1 = Math.min(dragStart.y, e.clientY);
        const x2 = Math.max(dragStart.x, e.clientX);
        const y2 = Math.max(dragStart.y, e.clientY);
        lassoEl.style.left = `${x1}px`;
        lassoEl.style.top = `${y1}px`;
        lassoEl.style.width = `${x2 - x1}px`;
        lassoEl.style.height = `${y2 - y1}px`;
        // 라소와 겹치는 파일 선택
        leftFiles.forEach(f => {
            if (f.copied) return;
            const r = f.el.getBoundingClientRect();
            const overlap = r.left < x2 && r.right > x1 && r.top < y2 && r.bottom > y1;
            f.el.classList.toggle("fd-icon--selected", overlap);
        });
    });

    document.addEventListener("pointerup", () => {
        if (isDragging) {
            isDragging = false;
            if (lassoEl) { lassoEl.remove(); lassoEl = null; }
        }
    });

    // ----- 키 입력 -----
    function onKey(e) {
        if (!inStage || finished) return;
        if (!e.ctrlKey && !e.metaKey) return;
        const k = e.key.toLowerCase();
        if (k === "c") {
            e.preventDefault();
            const selected = leftFiles.filter(f => f.el.classList.contains("fd-icon--selected") && !f.copied);
            if (selected.length === 0) return;
            clipboard = selected.map(f => ({ name: f.name, sourceObj: f }));
            cards.flash("Ctrl+C");
            selected.forEach(f => f.el.classList.add("fd-icon--copied"));
            Audio.tick();
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 3;
            showScoreFloat(cx, cy, `📋 ${selected.length}개 복사!`, "good");
        } else if (k === "v") {
            e.preventDefault();
            if (clipboard.length === 0) return;
            if (!rightFolderSelected) return;
            const stage = cfg.stages[stageIndex];
            let totalGain = 0;
            clipboard.forEach(item => {
                if (item.sourceObj.copied) return;
                item.sourceObj.copied = true;
                copiedCount++;
                totalGain += stage.pointsPerCopy;

                // 오른쪽에 복사본
                const newFile = makeFileIcon(item.name);
                newFile.classList.add("fd-icon--just-pasted");
                rightGrid.appendChild(newFile);
                setTimeout(() => newFile.classList.remove("fd-icon--just-pasted"), 500);

                // 원본 → 휴지통 애니메이션
                animateToTrash(item.sourceObj.el);
            });
            score += totalGain;
            updateScoreDisplay();
            cards.flash("Ctrl+V");
            Audio.bigCorrect(Math.min(8, 2 + clipboard.length));
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 3;
            showScoreFloat(cx, cy, `🖌 +${totalGain.toLocaleString()}`, "good");

            clipboard = [];

            if (copiedCount >= totalNeeded) {
                // 시간 보너스
                const remainSec = Math.max(0, (stageEndsAt - performance.now()) / 1000);
                const bonus = Math.floor(remainSec) * stage.timeBonusPerSec;
                if (bonus > 0) {
                    score += bonus;
                    updateScoreDisplay();
                    showTimeBonus(remainSec, bonus);
                }
                setTimeout(() => endStage(), 1200);
            }
        }
    }
    document.addEventListener("keydown", onKey);

    function animateToTrash(fileEl) {
        const r = fileEl.getBoundingClientRect();
        const tr = trash.getBoundingClientRect();
        const startX = r.left + r.width / 2;
        const startY = r.top + r.height / 2;
        const endX = tr.left + tr.width / 2;
        const endY = tr.top + tr.height / 2;

        // 원본 자리 비우기
        fileEl.style.visibility = "hidden";

        // 떠다니는 클론
        const clone = el("div", { class: "copy-trash-fly", text: "📄" });
        clone.style.left = `${startX}px`;
        clone.style.top = `${startY}px`;
        clone.style.setProperty("--dx", `${endX - startX}px`);
        clone.style.setProperty("--dy", `${endY - startY}px`);
        document.body.appendChild(clone);

        setTimeout(() => {
            clone.remove();
            // 휴지통 흔들기
            trash.classList.add("copy-trash--shake");
            setTimeout(() => trash.classList.remove("copy-trash--shake"), 400);
        }, 700);
    }

    function showTimeBonus(secLeft, bonus) {
        const banner = el("div", { class: "cycle-banner",
            text: `⚡ ${Math.floor(secLeft)}초 남음! 시간 보너스 +${bonus.toLocaleString()}점!` });
        screen.appendChild(banner);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 24, ["✨","⭐","🌟","💫","🎉","🎊"]);
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1500);
    }

    screen.addEventListener("click", (e) => {
        if (e.target === screen || e.target === splitArea) {
            leftFiles.forEach(f => f.el.classList.remove("fd-icon--selected"));
            rightPane.classList.remove("copy-pane--selected");
            rightFolderSelected = false;
        }
    });

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        showStageBanner(stage.label);
        Audio.roundStart();
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        buildStage();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
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
            setTimeout(() => startStage(stageIndex), 1300);
        }
    }

    function tick() {
        if (finished) { rafId = requestAnimationFrame(tick); return; }
        if (inStage) {
            const remain = Math.max(0, (stageEndsAt - performance.now()) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 3 ? "#d63031" : "var(--secondary-dark)";
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
            bestCombo: 0,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "드래그로 선택! Ctrl+C → Ctrl+V! 빨리 끝내면 보너스!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameCopy")) {
        showTutorial("gameCopy", startGame);
    } else {
        startGame();
    }
};
