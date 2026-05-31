/* ============================================================
   3단원 스텝 2: Ctrl+C / Ctrl+V 복사 마법
   좌측 폴더에서 파일 선택 → Ctrl+C → 우측 폴더 클릭 → Ctrl+V
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
    let selectedFileEl = null; // 현재 선택된 파일
    let rightFolderEl = null;
    let rightFolderSelected = false;
    let clipboard = null;       // { name }

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
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
        el("div", { class: "copy-pane__title", text: "📁 원본 폴더" }),
    );
    const leftGrid = el("div", { class: "copy-pane__grid" });
    leftPane.appendChild(leftGrid);

    const rightPane = el("div", { class: "copy-pane copy-pane--right" },
        el("div", { class: "copy-pane__title", text: "📁 복사본 폴더" }),
    );
    const rightGrid = el("div", { class: "copy-pane__grid" });
    rightPane.appendChild(rightGrid);

    rightFolderEl = rightPane;
    rightPane.addEventListener("click", (e) => {
        if (!inStage) return;
        rightFolderSelected = true;
        rightPane.classList.add("copy-pane--selected");
        // 좌측 선택 해제
        if (selectedFileEl) {
            selectedFileEl.classList.remove("fd-icon--selected");
            selectedFileEl = null;
        }
        e.stopPropagation();
    });

    splitArea.appendChild(leftPane);
    splitArea.appendChild(rightPane);
    screen.appendChild(splitArea);

    // 단축키 카드
    const cards = makeShortcutCards([
        { combo: "Ctrl+C", label: "복사", icon: "📋" },
        { combo: "Ctrl+V", label: "붙임", icon: "🖌️" },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 왼쪽 파일 클릭 → Ctrl+C → 오른쪽 폴더 클릭 → Ctrl+V 로 복사!" });
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
        selectedFileEl = null;
        rightFolderSelected = false;
        clipboard = null;
        rightPane.classList.remove("copy-pane--selected");

        const names = shuffle(cfg.fileNames).slice(0, stage.fileCount);
        names.forEach(name => {
            const fileEl = makeFileIcon(name);
            fileEl.addEventListener("click", (e) => {
                if (!inStage) return;
                e.stopPropagation();
                // 다른 선택 해제
                if (selectedFileEl) selectedFileEl.classList.remove("fd-icon--selected");
                rightPane.classList.remove("copy-pane--selected");
                rightFolderSelected = false;
                fileEl.classList.add("fd-icon--selected");
                selectedFileEl = fileEl;
            });
            leftGrid.appendChild(fileEl);
            leftFiles.push({ el: fileEl, name, copied: false });
        });
    }

    // ----- 키 입력 -----
    function onKey(e) {
        if (!inStage || finished) return;
        if (!e.ctrlKey && !e.metaKey) return;
        const k = e.key.toLowerCase();
        if (k === "c") {
            e.preventDefault();
            // 선택된 파일이 있어야 복사 가능
            if (!selectedFileEl) return;
            const fileObj = leftFiles.find(f => f.el === selectedFileEl);
            if (!fileObj) return;
            clipboard = { name: fileObj.name, sourceObj: fileObj };
            cards.flash("Ctrl+C");
            // 파일에 복사됨 표시
            selectedFileEl.classList.add("fd-icon--copied");
            Audio.tick();
            const r = selectedFileEl.getBoundingClientRect();
            showScoreFloat(r.left + r.width / 2, r.top, "📋 복사!", "good");
        } else if (k === "v") {
            e.preventDefault();
            if (!clipboard) return;
            if (!rightFolderSelected) return;
            // 이미 복사한 파일인지 체크
            if (clipboard.sourceObj.copied) return;
            clipboard.sourceObj.copied = true;
            copiedCount++;

            // 오른쪽에 복사본 추가
            const newFile = makeFileIcon(clipboard.name);
            newFile.classList.add("fd-icon--just-pasted");
            rightGrid.appendChild(newFile);
            setTimeout(() => newFile.classList.remove("fd-icon--just-pasted"), 500);

            cards.flash("Ctrl+V");
            const stage = cfg.stages[stageIndex];
            const gain = stage.pointsPerCopy;
            score += gain;
            updateScoreDisplay();
            Audio.bigCorrect(4);

            const r = newFile.getBoundingClientRect();
            showScoreFloat(r.left + r.width / 2, r.top, `+${gain}`, "good");

            // 클립보드 비우기
            clipboard = null;

            // 완료 체크
            if (copiedCount >= stage.targetCopies) {
                endStage();
            }
        }
    }
    document.addEventListener("keydown", onKey);

    // 빈공간 클릭 시 선택 해제
    screen.addEventListener("click", (e) => {
        if (e.target === screen || e.target === splitArea) {
            if (selectedFileEl) {
                selectedFileEl.classList.remove("fd-icon--selected");
                selectedFileEl = null;
            }
            rightPane.classList.remove("copy-pane--selected");
            rightFolderSelected = false;
        }
    });

    // ----- 스테이지 -----
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
        showIntroInstruction(screen, "Ctrl+C 로 복사! Ctrl+V 로 붙여넣기!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameCopy")) {
        showTutorial("gameCopy", startGame);
    } else {
        startGame();
    }
};
