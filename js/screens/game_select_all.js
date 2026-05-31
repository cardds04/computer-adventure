/* ============================================================
   3단원 스텝 4: Ctrl+A 전체 선택 폭주 마법
   폴더 50~100개 → 클릭 하나씩 vs Ctrl+A → 한 방에!
   ============================================================ */

SCREEN_RENDERERS.gameSelectAll = function (root, params) {
    const screen = el("div", { class: "screen game game--select-all game--unit3" });
    const cfg = SELECT_ALL_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let folders = [];      // {el, selected, deleted}
    let allSelected = false;
    let rafId = null;
    let foldersAlive = 0;
    let hintShown = false;

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "25.0", style: { color: "var(--secondary-dark)" } });
    const remainEl = el("span", { class: "hud-chip__big", text: "0" });
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
            el("span", { text: "⬛" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "📁" }),
            el("span", { class: "stat-chip__label", text: "남은폴더" }),
            remainEl,
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

    const playArea = el("div", { class: "select-all-area" });
    screen.appendChild(playArea);

    const cards = makeShortcutCards([
        { combo: "클릭", label: "선택", icon: "🖱️" },
        { combo: "Ctrl+A", label: "전체선택", icon: "⬛" },
        { combo: "DELETE", label: "지우기", icon: "⌫" },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 한 개씩? 너무 느려요. Ctrl+A → DELETE 로 한 방에! 점수 ×5 보너스!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function buildFolders() {
        playArea.innerHTML = "";
        folders = [];
        allSelected = false;
        hintShown = false;
        const stage = cfg.stages[stageIndex];
        const count = stage.folderCount;

        // 격자 계산
        const cols = Math.ceil(Math.sqrt(count * 1.6));
        playArea.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        for (let i = 0; i < count; i++) {
            const fEl = makeFolderIcon(`폴더${i + 1}`);
            const obj = { el: fEl, selected: false, deleted: false };
            fEl.addEventListener("click", (e) => {
                if (!inStage || obj.deleted) return;
                e.stopPropagation();
                // 전체 선택 상태 해제
                if (allSelected) {
                    folders.forEach(f => {
                        f.selected = false;
                        f.el.classList.remove("fd-icon--selected");
                    });
                    allSelected = false;
                }
                obj.selected = !obj.selected;
                fEl.classList.toggle("fd-icon--selected", obj.selected);
            });
            playArea.appendChild(fEl);
            folders.push(obj);
        }
        foldersAlive = count;
        remainEl.textContent = foldersAlive;
    }

    function selectAll() {
        if (!inStage || finished) return;
        folders.forEach(f => {
            if (f.deleted) return;
            f.selected = true;
            f.el.classList.add("fd-icon--selected");
        });
        allSelected = true;
        cards.flash("Ctrl+A");
        Audio.tick();
        showCycleBanner("⬛ 전체 선택! DELETE 누르면 한 방에 ×5 보너스!");
    }

    function deleteSelected() {
        if (!inStage || finished) return;
        const stage = cfg.stages[stageIndex];
        const selected = folders.filter(f => f.selected && !f.deleted);
        if (selected.length === 0) return;

        const isComboDelete = allSelected && selected.length >= foldersAlive;
        const multiplier = isComboDelete ? stage.selectAllMultiplier : 1;

        let gained = 0;
        selected.forEach(f => {
            f.deleted = true;
            f.el.classList.add("fd-icon--gone");
            const g = stage.pointPerSingleDelete * multiplier;
            gained += g;
            const r = f.el.getBoundingClientRect();
            setTimeout(() => { f.el.style.visibility = "hidden"; }, 400);
        });
        foldersAlive -= selected.length;
        remainEl.textContent = foldersAlive;
        score += gained;
        if (isComboDelete) score += stage.comboBonus;
        updateScoreDisplay();
        cards.flash("DELETE");
        Audio.bigCorrect(isComboDelete ? 8 : 4);
        allSelected = false;

        if (isComboDelete) {
            showCycleBanner(`💥 한 방에 ${selected.length}개! +${gained.toLocaleString()} (×${multiplier}) + 콤보 +${stage.comboBonus.toLocaleString()}!`);
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            emitParticles(cx, cy, 32, ["✨","⭐","🌟","💫","🎉","🎊","🔥"]);
        } else {
            const cx = (selected[0].el.getBoundingClientRect().left + selected[0].el.getBoundingClientRect().right) / 2;
            const cy = selected[0].el.getBoundingClientRect().top;
            showScoreFloat(cx, cy, `+${gained.toLocaleString()}`, "good");
        }

        // 모두 지워졌으면 즉시 다음 단계
        if (foldersAlive === 0) {
            setTimeout(() => { if (inStage) endStage(); }, 600);
        }
    }

    function showCycleBanner(text) {
        const banner = el("div", { class: "cycle-banner", text });
        screen.appendChild(banner);
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1300);
    }

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        buildFolders();

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            // 5초 뒤 힌트
            setTimeout(() => {
                if (inStage && !hintShown && foldersAlive > stage.folderCount * 0.7) {
                    hintShown = true;
                    showCycleBanner("💡 힌트! Ctrl+A 누르면 전부 선택돼요!");
                }
            }, 5000);
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
            setTimeout(() => startStage(stageIndex), 1200);
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
        document.removeEventListener("keydown", keyHandler);
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

    function keyHandler(e) {
        if (!inStage || finished) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
            e.preventDefault();
            selectAll();
        } else if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            deleteSelected();
        }
    }
    document.addEventListener("keydown", keyHandler);

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "Ctrl+A 로 전체 선택! DELETE 로 한 방에!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameSelectAll")) {
        showTutorial("gameSelectAll", startGame);
    } else {
        startGame();
    }
};
