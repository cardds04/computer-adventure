/* ============================================================
   3단원 스텝 1: 폴더 이름 변경 마법
   폴더 클릭 → 우클릭 → 이름 바꾸기 → 새 이름 입력 → Enter
   ============================================================ */

SCREEN_RENDERERS.gameRename = function (root, params) {
    const screen = el("div", { class: "screen game game--rename game--unit3" });
    const cfg = RENAME_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;

    let currentFolderEl = null;
    let currentTargetName = "";   // 현재 폴더에 새로 붙여야 할 이름
    let isEditing = false;
    let foldersDone = 0;

    // ----- HUD -----
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
            el("span", { text: "📁" }),
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

    // 좌상단 캐릭터
    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);

    // ----- 미션 안내 -----
    const hint = el("div", { class: "rename-hint" },
        el("span", { class: "rename-hint__label", text: "🎯 이 폴더의 이름을: " }),
        el("span", { class: "rename-hint__target", text: "—" }),
    );
    screen.appendChild(hint);

    // ----- 가짜 바탕화면 -----
    const desktop = el("div", { class: "fake-desktop" });
    screen.appendChild(desktop);

    // 단축키 카드
    const cards = makeShortcutCards([
        { combo: "우클릭", label: "메뉴", icon: "🖱️", active: true },
        { combo: "Enter", label: "확정", icon: "↵", active: false },
    ]);
    screen.appendChild(cards.el);

    // 하단 안내
    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 폴더를 클릭 → 마우스 오른쪽 클릭 → '이름 바꾸기' → 힌트대로 입력 → Enter" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    // ----- 폴더 생성 -----
    function spawnFolder() {
        const stage = cfg.stages[stageIndex];
        currentTargetName = stage.names[Math.floor(Math.random() * stage.names.length)];
        hint.querySelector(".rename-hint__target").textContent = `"${currentTargetName}"`;

        // 이전 폴더 제거
        if (currentFolderEl) currentFolderEl.remove();

        const folder = makeFolderIcon("새 폴더");
        folder.classList.add("fd-icon--center");
        desktop.appendChild(folder);
        currentFolderEl = folder;
        folder._selected = false;

        // 폴더 클릭 → 선택
        folder.addEventListener("click", (e) => {
            if (!inStage || isEditing) return;
            e.stopPropagation();
            folder.classList.add("fd-icon--selected");
            folder._selected = true;
        });

        // 폴더 우클릭 → 메뉴
        folder.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (!inStage || isEditing) return;
            // 선택 안되어있으면 자동 선택
            folder.classList.add("fd-icon--selected");
            folder._selected = true;
            showContextMenu(e.clientX, e.clientY, [
                { icon: "📂", label: "열기", disabled: true },
                { icon: "📋", label: "복사", disabled: true },
                { icon: "✂️", label: "잘라내기", disabled: true },
                { icon: "✏️", label: "이름 바꾸기", onClick: () => startEditing(folder) },
                { icon: "🗑️", label: "삭제", disabled: true },
            ], screen);
        });
    }

    function startEditing(folder) {
        isEditing = true;
        cards.setActive("Enter", true);

        // 라벨을 input으로 교체
        const labelEl = folder.querySelector(".fd-icon__label");
        const input = el("input", {
            class: "fd-icon__input",
            type: "text",
            value: "",
            placeholder: "이름 입력...",
        });
        labelEl.style.display = "none";
        folder.appendChild(input);
        input.focus();

        function commit() {
            const v = input.value.trim();
            input.remove();
            labelEl.style.display = "";
            isEditing = false;
            cards.setActive("Enter", false);

            if (v === currentTargetName) {
                // 정답!
                labelEl.textContent = v;
                folder.classList.add("fd-icon--correct");
                const stage = cfg.stages[stageIndex];
                const gain = stage.pointsPerCorrect;
                score += gain;
                updateScoreDisplay();
                foldersDone++;

                const r = folder.getBoundingClientRect();
                showScoreFloat(r.left + r.width / 2, r.top, `+${gain}`);
                emitParticles(r.left + r.width / 2, r.top + r.height / 2, 8, ["✨","⭐","🌟"]);
                Audio.bigCorrect(4);

                setTimeout(() => {
                    if (!inStage || finished) return;
                    if (foldersDone >= stage.folderCount) {
                        endStage();
                    } else {
                        spawnFolder();
                    }
                }, 600);
            } else {
                // 오답
                folder.classList.remove("fd-icon--selected");
                labelEl.textContent = "새 폴더";
                folder.classList.add("fd-icon--wrong");
                setTimeout(() => folder.classList.remove("fd-icon--wrong"), 500);
                const stage = cfg.stages[stageIndex];
                score = Math.max(0, score - stage.wrongPenalty);
                updateScoreDisplay();
                Audio.wrong();
            }
        }

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                commit();
            } else if (e.key === "Escape") {
                input.remove();
                labelEl.style.display = "";
                isEditing = false;
                cards.setActive("Enter", false);
            }
            e.stopPropagation();
        });

        input.addEventListener("blur", () => {
            // blur 시에도 commit 시도
            if (input.value.trim()) commit();
            else {
                input.remove();
                labelEl.style.display = "";
                isEditing = false;
                cards.setActive("Enter", false);
            }
        });
    }

    // ----- 스테이지 -----
    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        showStageBanner(stage.label);
        Audio.roundStart();
        foldersDone = 0;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            spawnFolder();
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
        inStage = false;
        if (currentFolderEl) { currentFolderEl.remove(); currentFolderEl = null; }
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

    // 시작
    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "폴더 우클릭 → 이름 바꾸기 → 입력 → Enter!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameRename")) {
        showTutorial("gameRename", startGame);
    } else {
        startGame();
    }
};
