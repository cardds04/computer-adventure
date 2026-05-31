/* ============================================================
   3단원 스텝 5: 파일 분류 정리
   - 음악(🎵) / 문서(📄) / 영상(🎬) / 사진(🖼️) 파일이 어수선하게 흩어짐
   - 상단에 폴더 종류별 드롭존
   - 파일을 잡아 알맞은 폴더로 드래그
   - 잘못된 곳에 놓으면 페널티 + 제자리로
   - 모든 파일 정리하면 보너스 + 시간 보너스
   ============================================================ */

SCREEN_RENDERERS.gameSort = function (root, params) {
    const screen = el("div", { class: "screen game game--sort game--unit3" });
    const cfg = SORT_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;

    let folders = [];    // [{ el, type }]
    let files = [];      // [{ el, type, name, done }]
    let remaining = 0;

    // 드래그 상태
    let dragFile = null;
    let dragOffset = { x: 0, y: 0 };
    let dragHover = null;

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
            el("span", { text: "🗂️" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "📦" }),
            el("span", { class: "stat-chip__label", text: "남은" }),
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

    // 폴더 트레이 (상단)
    const folderTray = el("div", { class: "sort-folder-tray" });
    screen.appendChild(folderTray);

    // 파일 놀이 영역 (하단)
    const playArea = el("div", { class: "sort-play-area" });
    screen.appendChild(playArea);

    const cards = makeShortcutCards([
        { combo: "드래그", label: "정리", icon: "🖱️", active: true },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 파일을 잡아서 같은 종류의 📁폴더로 끌어다 놓으세요! 다 정리하면 보너스!" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        remainEl.textContent = remaining;
    }

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // ----- 폴더 / 파일 만들기 -----
    function buildStage() {
        folderTray.innerHTML = "";
        playArea.innerHTML = "";
        folders = [];
        files = [];

        const stage = cfg.stages[stageIndex];
        const useTypes = cfg.types.slice(0, stage.typeCount);

        // 폴더들
        useTypes.forEach(t => {
            const fEl = el("div", { class: "sort-folder", "data-type": t.id },
                el("div", { class: "sort-folder__icon", text: t.folder }),
                el("div", { class: "sort-folder__label", text: t.label }),
            );
            fEl.dataset.type = t.id;
            folderTray.appendChild(fEl);
            folders.push({ el: fEl, type: t.id });
        });

        // 파일들 (랜덤 위치 + 회전)
        const areaRect = () => playArea.getBoundingClientRect();
        // 잠시 뒤 area가 layout되면 좌표 사용 가능
        requestAnimationFrame(() => {
            const r = areaRect();
            const margin = 50;
            const usableW = Math.max(200, r.width - margin * 2);
            const usableH = Math.max(200, r.height - margin * 2);
            for (let i = 0; i < stage.fileCount; i++) {
                const type = useTypes[Math.floor(Math.random() * useTypes.length)];
                const name = type.names[Math.floor(Math.random() * type.names.length)];
                const fileEl = el("div", { class: "sort-file" },
                    el("div", { class: "sort-file__icon", text: type.fileEmoji }),
                    el("div", { class: "sort-file__name", text: name }),
                );
                fileEl.dataset.type = type.id;
                const x = Math.random() * usableW;
                const y = Math.random() * usableH;
                const rot = (Math.random() - 0.5) * 30;
                fileEl.style.left = `${x}px`;
                fileEl.style.top = `${y}px`;
                fileEl.style.transform = `rotate(${rot}deg)`;
                fileEl.dataset.rot = rot;
                const obj = { el: fileEl, type: type.id, name, done: false };
                wireFileDrag(obj);
                playArea.appendChild(fileEl);
                files.push(obj);
            }
            remaining = files.length;
            updateScoreDisplay();
        });
    }

    function wireFileDrag(obj) {
        const fileEl = obj.el;
        fileEl.style.touchAction = "none";
        fileEl.addEventListener("pointerdown", (e) => {
            if (!inStage || finished || obj.done) return;
            if (e.button !== 0) return;
            const r = fileEl.getBoundingClientRect();
            // 절대좌표 → fixed로 전환
            fileEl.dataset.origLeft = fileEl.style.left;
            fileEl.dataset.origTop = fileEl.style.top;
            fileEl.dataset.origRot = fileEl.dataset.rot;
            fileEl.style.position = "fixed";
            fileEl.style.left = `${r.left}px`;
            fileEl.style.top = `${r.top}px`;
            fileEl.style.transform = `rotate(0deg)`;
            dragOffset.x = e.clientX - r.left;
            dragOffset.y = e.clientY - r.top;
            dragFile = obj;
            fileEl.classList.add("sort-file--dragging");
            e.preventDefault();
        });
    }

    document.addEventListener("pointermove", (e) => {
        if (!dragFile) return;
        const fileEl = dragFile.el;
        fileEl.style.left = `${e.clientX - dragOffset.x}px`;
        fileEl.style.top = `${e.clientY - dragOffset.y}px`;
        // 폴더 호버 강조
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const folderEl = under && under.closest(".sort-folder");
        if (dragHover && dragHover !== folderEl) {
            dragHover.classList.remove("sort-folder--hover");
        }
        if (folderEl && folderEl !== dragHover) {
            folderEl.classList.add("sort-folder--hover");
            dragHover = folderEl;
        } else if (!folderEl) {
            dragHover = null;
        }
    });

    document.addEventListener("pointerup", (e) => {
        if (!dragFile) return;
        const obj = dragFile;
        const fileEl = obj.el;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const folderEl = under && under.closest(".sort-folder");

        if (dragHover) dragHover.classList.remove("sort-folder--hover");
        dragHover = null;
        fileEl.classList.remove("sort-file--dragging");
        dragFile = null;

        if (folderEl) {
            const folderType = folderEl.dataset.type;
            if (folderType === obj.type) {
                // 정답!
                obj.done = true;
                const stage = cfg.stages[stageIndex];
                score += stage.pointsPerCorrect;
                remaining--;
                updateScoreDisplay();
                Audio.bigCorrect(4);

                // 폴더로 빨려들어가는 애니메이션
                const fr = folderEl.getBoundingClientRect();
                const fdr = fileEl.getBoundingClientRect();
                const dx = (fr.left + fr.width / 2) - (fdr.left + fdr.width / 2);
                const dy = (fr.top + fr.height / 2) - (fdr.top + fdr.height / 2);
                fileEl.style.setProperty("--dx", `${dx}px`);
                fileEl.style.setProperty("--dy", `${dy}px`);
                fileEl.classList.add("sort-file--sucked");
                setTimeout(() => fileEl.remove(), 420);

                folderEl.classList.add("sort-folder--accepted");
                setTimeout(() => folderEl.classList.remove("sort-folder--accepted"), 400);

                const cx = fr.left + fr.width / 2;
                const cy = fr.top + fr.height / 2;
                showScoreFloat(cx, cy, `+${stage.pointsPerCorrect}`, "good");
                emitParticles(cx, cy, 8, ["✨","⭐","🌟"]);

                if (remaining === 0) {
                    triggerAllCorrect();
                }
                return;
            } else {
                // 오답
                const stage = cfg.stages[stageIndex];
                score = Math.max(0, score - stage.wrongPenalty);
                updateScoreDisplay();
                Audio.wrong();
                folderEl.classList.add("sort-folder--rejected");
                setTimeout(() => folderEl.classList.remove("sort-folder--rejected"), 400);
                const fr = folderEl.getBoundingClientRect();
                showScoreFloat(fr.left + fr.width / 2, fr.top + fr.height / 2, `❌ -${stage.wrongPenalty}`, "bad");
            }
        }

        // 오답 or 빈 공간 → 원위치 복귀
        const playRect = playArea.getBoundingClientRect();
        const origLeft = parseFloat(fileEl.dataset.origLeft);
        const origTop = parseFloat(fileEl.dataset.origTop);
        const targetX = playRect.left + origLeft;
        const targetY = playRect.top + origTop;
        // fixed 위치에서 원래 자리(absolute 좌표)로 이동 시각
        fileEl.style.transition = "left 0.3s, top 0.3s, transform 0.3s";
        fileEl.style.left = `${targetX}px`;
        fileEl.style.top = `${targetY}px`;
        const rot = fileEl.dataset.origRot || "0";
        fileEl.style.transform = `rotate(${rot}deg)`;
        setTimeout(() => {
            fileEl.style.transition = "";
            fileEl.style.position = "absolute";
            fileEl.style.left = `${origLeft}px`;
            fileEl.style.top = `${origTop}px`;
        }, 320);
    });

    function triggerAllCorrect() {
        if (!inStage) return;
        inStage = false;
        const stage = cfg.stages[stageIndex];
        const remainSec = Math.max(0, (stageEndsAt - performance.now()) / 1000);
        const timeBonus = Math.floor(remainSec) * stage.timeBonusPerSec;
        const total = stage.allCorrectBonus + timeBonus;
        score += total;
        updateScoreDisplay();

        const banner = el("div", { class: "cycle-banner",
            text: `🎉 모두 정리 완료! 보너스 +${stage.allCorrectBonus.toLocaleString()} | 시간 +${timeBonus.toLocaleString()}!` });
        screen.appendChild(banner);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 36, ["✨","⭐","🌟","💫","🎉","🎊","📁","🗂️"]);
        Audio.gameOver();
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1600);

        setTimeout(() => endStage(), 1800);
    }

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
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
        if (inStage) inStage = false;
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
        showIntroInstruction(screen, "파일을 종류대로 폴더에 정리하세요!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameSort")) {
        showTutorial("gameSort", startGame);
    } else {
        startGame();
    }
};
