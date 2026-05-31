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
    // 드래그 / 라소 / 휴지통 드롭
    let pdStart = null;        // 라소 시작 위치
    let lassoEl = null;
    let suppressNextClick = false;
    let dragFolder = null;     // 휴지통으로 끌고 가는 폴더
    let dragGhost = null;
    let trashHover = false;

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
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

    // 휴지통 (드래그해서 폴더 버리기)
    const trash = el("div", { class: "copy-trash sa-trash" },
        el("div", { class: "copy-trash__icon", text: "🗑️" }),
        el("div", { class: "copy-trash__label", text: "휴지통" }),
    );
    screen.appendChild(trash);

    const cards = makeShortcutCards([
        { combo: "클릭/드래그", label: "선택", icon: "🖱️" },
        { combo: "Ctrl+A", label: "전체선택", icon: "⬛" },
        { combo: "DELETE", label: "지우기", icon: "⌫" },
        { combo: "🗑️ 드래그", label: "휴지통", icon: "📁→🗑️" },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 클릭/드래그 선택 → DELETE 또는 🗑️로 끌어다 버리기! Ctrl+A → DELETE = ×5!" });
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

        const goldenChance = stage.goldenChance || 0;
        const goldenMult = cfg.goldenMultiplier || 10;
        for (let i = 0; i < count; i++) {
            const isGolden = Math.random() < goldenChance;
            const fEl = makeFolderIcon(isGolden ? `★${i + 1}★` : `폴더${i + 1}`);
            if (isGolden) {
                fEl.classList.add("fd-icon--golden");
                // 폴더 아이콘 이모지 교체: ⭐ 표시
                const emojiEl = fEl.querySelector(".fd-icon__emoji");
                if (emojiEl) emojiEl.textContent = "⭐";
            }
            fEl.style.userSelect = "none";
            const obj = { el: fEl, selected: false, deleted: false, isGolden, goldenMult };
            fEl.addEventListener("click", (e) => {
                if (!inStage || obj.deleted) return;
                if (suppressNextClick) {
                    suppressNextClick = false;
                    e.stopPropagation();
                    return;
                }
                e.stopPropagation();
                if (allSelected) {
                    folders.forEach(f => {
                        f.selected = false;
                        f.el.classList.remove("fd-icon--selected");
                    });
                    allSelected = false;
                }
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    // 단일 선택이면 다른 모두 해제
                    folders.forEach(f => {
                        if (f !== obj) {
                            f.selected = false;
                            f.el.classList.remove("fd-icon--selected");
                        }
                    });
                }
                obj.selected = !obj.selected;
                fEl.classList.toggle("fd-icon--selected", obj.selected);
            });
            // 휴지통으로 드래그
            fEl.addEventListener("pointerdown", (e) => {
                if (!inStage || obj.deleted) return;
                if (e.button !== 0) return;
                // 라소가 시작되면 pdStart를 통해 처리됨. 폴더 위 pointerdown은 일단 후보로만 기록
                pdStart = { x: e.clientX, y: e.clientY, ctrl: e.ctrlKey || e.metaKey || e.shiftKey,
                            onFolder: obj };
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
        let goldenCount = 0;
        selected.forEach(f => {
            f.deleted = true;
            f.el.classList.add("fd-icon--gone");
            const folderMult = f.isGolden ? f.goldenMult : 1;
            const g = stage.pointPerSingleDelete * multiplier * folderMult;
            gained += g;
            if (f.isGolden) goldenCount++;
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

        const goldenNote = goldenCount > 0 ? ` (⭐×${goldenCount})` : "";
        if (isComboDelete) {
            showCycleBanner(`💥 한 방에 ${selected.length}개${goldenNote}! +${gained.toLocaleString()} (×${multiplier}) + 콤보 +${stage.comboBonus.toLocaleString()}!`);
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            emitParticles(cx, cy, 32 + goldenCount * 4, ["✨","⭐","🌟","💫","🎉","🎊","🔥"]);
        } else {
            const cx = (selected[0].el.getBoundingClientRect().left + selected[0].el.getBoundingClientRect().right) / 2;
            const cy = selected[0].el.getBoundingClientRect().top;
            showScoreFloat(cx, cy, `+${gained.toLocaleString()}${goldenNote}`, "good");
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

    // ----- 빈 공간 pointerdown 으로도 라소 시작 가능 -----
    playArea.addEventListener("pointerdown", (e) => {
        if (!inStage) return;
        if (e.button !== 0) return;
        if (e.target.closest(".fd-icon")) return; // 폴더 위는 폴더 핸들러가 처리
        pdStart = { x: e.clientX, y: e.clientY, ctrl: e.ctrlKey || e.metaKey || e.shiftKey };
    });

    document.addEventListener("pointermove", (e) => {
        if (!pdStart || dragGhost) {
            // 드래그 모드 진행 중 처리
            if (dragGhost) {
                dragGhost.style.left = `${e.clientX}px`;
                dragGhost.style.top = `${e.clientY}px`;
                // 휴지통 호버 체크
                const tr = trash.getBoundingClientRect();
                const inTrash = e.clientX >= tr.left && e.clientX <= tr.right
                    && e.clientY >= tr.top && e.clientY <= tr.bottom;
                if (inTrash !== trashHover) {
                    trashHover = inTrash;
                    trash.classList.toggle("copy-trash--hover", inTrash);
                }
            }
            return;
        }
        const dx = e.clientX - pdStart.x;
        const dy = e.clientY - pdStart.y;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

        // 폴더 위에서 시작된 경우 → 드래그 (휴지통으로 이동)
        if (pdStart.onFolder && !lassoEl) {
            const folder = pdStart.onFolder;
            // 만약 선택 안된 폴더라면, 그 폴더만 선택
            if (!folder.selected) {
                folders.forEach(f => {
                    f.selected = false;
                    f.el.classList.remove("fd-icon--selected");
                });
                folder.selected = true;
                folder.el.classList.add("fd-icon--selected");
                allSelected = false;
            }
            const draggingCount = folders.filter(f => f.selected && !f.deleted).length;
            dragGhost = el("div", { class: "sa-drag-ghost",
                html: `<span class="sa-drag-ghost__icon">📁</span><span class="sa-drag-ghost__count">${draggingCount}</span>` });
            document.body.appendChild(dragGhost);
            dragGhost.style.left = `${e.clientX}px`;
            dragGhost.style.top = `${e.clientY}px`;
            dragFolder = folder;
            suppressNextClick = true;
            return;
        }

        // 빈 공간 / 폴더 라소 모드
        if (!lassoEl) {
            if (!pdStart.ctrl) {
                folders.forEach(f => {
                    f.selected = false;
                    f.el.classList.remove("fd-icon--selected");
                });
                allSelected = false;
            }
            lassoEl = el("div", { class: "copy-lasso" });
            document.body.appendChild(lassoEl);
            suppressNextClick = true;
            document.body.style.userSelect = "none";
        }
        const x1 = Math.min(pdStart.x, e.clientX);
        const y1 = Math.min(pdStart.y, e.clientY);
        const x2 = Math.max(pdStart.x, e.clientX);
        const y2 = Math.max(pdStart.y, e.clientY);
        lassoEl.style.left = `${x1}px`;
        lassoEl.style.top = `${y1}px`;
        lassoEl.style.width = `${x2 - x1}px`;
        lassoEl.style.height = `${y2 - y1}px`;
        folders.forEach(f => {
            if (f.deleted) return;
            const r = f.el.getBoundingClientRect();
            const overlap = r.left < x2 && r.right > x1 && r.top < y2 && r.bottom > y1;
            f.selected = overlap;
            f.el.classList.toggle("fd-icon--selected", overlap);
        });
    });

    document.addEventListener("pointerup", (e) => {
        // 드래그 → 휴지통 처리
        if (dragGhost) {
            dragGhost.remove();
            dragGhost = null;
            if (trashHover) {
                deleteSelected();   // 휴지통에 드롭하면 선택된 거 다 지우기
            }
            trash.classList.remove("copy-trash--hover");
            trashHover = false;
            dragFolder = null;
        }
        // 라소 정리
        if (lassoEl) {
            lassoEl.remove();
            lassoEl = null;
            document.body.style.userSelect = "";
        }
        pdStart = null;
    });

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
