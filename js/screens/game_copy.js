/* ============================================================
   3단원 스텝 2: Ctrl+C / Ctrl+V — 한 폴더 안에서 복사 증식
   - 폴더에 파일이 N개 있음 (시작은 작은 수)
   - 클릭/드래그로 다중 선택 가능
   - Ctrl+C 로 선택된 파일들을 클립보드에
   - Ctrl+V 누를 때마다 클립보드 내용이 폴더에 추가됨 (그래서 점점 늘어남)
   - targetCount 채우면 폴더 가득 → 보너스 + 다음 단계
   - 남은 시간 × 시간보너스
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

    let files = [];          // [{ el, name }]
    let clipboard = [];      // 복사된 파일 스냅샷 (이름만)
    // 드래그 상태
    let pdStart = null;
    let lassoEl = null;
    let suppressNextClick = false;

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 2" });
    const timerEl = el("span", { class: "hud-chip__big", text: "15.0", style: { color: "var(--secondary-dark)" } });
    const countEl = el("span", { class: "hud-chip__big", text: "1 / 30" });
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
            el("span", { text: "📦" }),
            el("span", { class: "stat-chip__label", text: "파일" }),
            countEl,
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

    // 폴더 영역 (단일 패널)
    const folderPanel = el("div", { class: "copy-folder-panel" },
        el("div", { class: "copy-folder-panel__title", text: "📁 내 폴더" }),
    );
    const folderGrid = el("div", { class: "copy-folder-grid" });
    folderPanel.appendChild(folderGrid);
    screen.appendChild(folderPanel);

    // 단축키 카드
    const cards = makeShortcutCards([
        { combo: "드래그", label: "다중선택", icon: "🖱️" },
        { combo: "Ctrl+C", label: "복사", icon: "📋", active: true },
        { combo: "Ctrl+V", label: "붙임 (증식)", icon: "✨" },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 클릭/드래그로 선택 → Ctrl+C → Ctrl+V 누를 때마다 파일이 늘어나요! 폴더 가득 채우기!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        const stage = cfg.stages[stageIndex];
        countEl.textContent = `${files.length} / ${stage.targetCount}`;
        if (files.length >= stage.targetCount) countEl.style.color = "var(--secondary-dark)";
        else countEl.style.color = "var(--text-dark)";
    }

    function pickRandomName() {
        return cfg.fileNames[Math.floor(Math.random() * cfg.fileNames.length)];
    }

    function buildStage() {
        folderGrid.innerHTML = "";
        files = [];
        clipboard = [];
        const stage = cfg.stages[stageIndex];
        for (let i = 0; i < stage.startCount; i++) {
            const name = pickRandomName();
            const fEl = makeFileIcon(name);
            wireFileClick(fEl);
            folderGrid.appendChild(fEl);
            files.push({ el: fEl, name });
        }
    }

    function wireFileClick(fileEl) {
        fileEl.style.userSelect = "none";
        fileEl.addEventListener("click", (e) => {
            if (!inStage) return;
            if (suppressNextClick) {
                suppressNextClick = false;
                e.stopPropagation();
                return;
            }
            e.stopPropagation();
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                files.forEach(f => f.el.classList.remove("fd-icon--selected"));
            }
            fileEl.classList.toggle("fd-icon--selected");
        });
    }

    function pasteClipboard() {
        if (clipboard.length === 0) return false;
        const stage = cfg.stages[stageIndex];
        const before = files.length;
        clipboard.forEach(item => {
            const fEl = makeFileIcon(item.name);
            fEl.classList.add("fd-icon--just-pasted");
            wireFileClick(fEl);
            folderGrid.appendChild(fEl);
            setTimeout(() => fEl.classList.remove("fd-icon--just-pasted"), 500);
            files.push({ el: fEl, name: item.name });
        });
        const added = files.length - before;
        const gain = added * stage.pointsPerPaste;
        score += gain;
        updateScoreDisplay();
        cards.flash("Ctrl+V");

        // 작은 점수 표시
        const r = folderPanel.getBoundingClientRect();
        showScoreFloat(r.left + r.width / 2, r.top + 60, `✨ +${added}개 (+${gain}점)`, "good");
        Audio.bigCorrect(Math.min(8, 2 + Math.floor(added / 4)));

        // targetCount 달성 체크
        if (files.length >= stage.targetCount) {
            triggerFillBonus();
        }
        return true;
    }

    function triggerFillBonus() {
        if (!inStage) return;
        inStage = false;
        const stage = cfg.stages[stageIndex];
        let total = stage.fillBonus;
        const remainSec = Math.max(0, (stageEndsAt - performance.now()) / 1000);
        const timeBonus = Math.floor(remainSec) * stage.timeBonusPerSec;
        total += timeBonus;
        score += total;
        updateScoreDisplay();

        const banner = el("div", { class: "cycle-banner",
            text: `🎉 폴더 꽉! 채움 보너스 +${stage.fillBonus.toLocaleString()} | 시간 +${timeBonus.toLocaleString()}!` });
        screen.appendChild(banner);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 36, ["✨","⭐","🌟","💫","🎉","🎊","📦","📄"]);
        Audio.gameOver();

        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1600);

        setTimeout(() => endStage(), 1800);
    }

    // ----- 키 입력 -----
    function onKey(e) {
        if (!inStage || finished) return;
        if (!e.ctrlKey && !e.metaKey) return;
        const k = e.key.toLowerCase();
        if (k === "a") {
            // 전체 선택 (보너스 — 학생이 발견할 수 있도록)
            e.preventDefault();
            files.forEach(f => f.el.classList.add("fd-icon--selected"));
        } else if (k === "c") {
            e.preventDefault();
            const sel = files.filter(f => f.el.classList.contains("fd-icon--selected"));
            if (sel.length === 0) return;
            clipboard = sel.map(f => ({ name: f.name }));
            cards.flash("Ctrl+C");
            sel.forEach(f => {
                f.el.classList.add("fd-icon--copied");
                setTimeout(() => f.el.classList.remove("fd-icon--copied"), 500);
            });
            Audio.tick();
            const r = folderPanel.getBoundingClientRect();
            showScoreFloat(r.left + r.width / 2, r.top + 60, `📋 ${sel.length}개 복사!`, "good");
        } else if (k === "v") {
            e.preventDefault();
            pasteClipboard();
        }
    }
    document.addEventListener("keydown", onKey);

    // ----- 드래그 라소 -----
    folderPanel.addEventListener("pointerdown", (e) => {
        if (!inStage) return;
        if (e.button !== 0) return;
        pdStart = { x: e.clientX, y: e.clientY, ctrl: e.ctrlKey || e.metaKey || e.shiftKey };
    });

    document.addEventListener("pointermove", (e) => {
        if (!pdStart) return;
        const dx = e.clientX - pdStart.x;
        const dy = e.clientY - pdStart.y;
        if (!lassoEl && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        if (!lassoEl) {
            if (!pdStart.ctrl) files.forEach(f => f.el.classList.remove("fd-icon--selected"));
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
        files.forEach(f => {
            const r = f.el.getBoundingClientRect();
            const overlap = r.left < x2 && r.right > x1 && r.top < y2 && r.bottom > y1;
            f.el.classList.toggle("fd-icon--selected", overlap);
        });
    });

    document.addEventListener("pointerup", () => {
        if (lassoEl) {
            lassoEl.remove();
            lassoEl = null;
            document.body.style.userSelect = "";
        }
        pdStart = null;
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
        updateScoreDisplay();

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
        if (inStage) inStage = false;
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
        showIntroInstruction(screen, "Ctrl+C → Ctrl+V! 파일이 점점 늘어나요!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameCopy")) {
        showTutorial("gameCopy", startGame);
    } else {
        startGame();
    }
};
