/* ============================================================
   3단원 스텝 5: 송양초 BBQ 보너스 — 트레이/화로/접시 드래그
   - 왼쪽 트레이: 생고기 진열
   - 가운데 화로: 자리 3개. 트레이에서 드래그해서 올려놓음
   - 오른쪽 접시: 화로에서 다 익은 고기를 드래그로 옮기면 점수
   - 캠핑장 분위기 + 지글지글 사운드
   ============================================================ */

SCREEN_RENDERERS.gameBbq = function (root, params) {
    const screen = el("div", { class: "screen game game--bbq game--unit3" });
    const cfg = BBQ_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let rafId = null;

    let trayMeats = [];        // [{ id, el, meatType, isGolden, served }]
    let grillSlots = [];        // [{ el, meat, startedAt, state, isGolden }]
    let perfectCombo = 0;
    let totalServed = 0;
    let nextMeatId = 0;

    // 드래그 상태
    let dragMeat = null;       // 드래그 중인 고기 객체
    let dragFrom = null;        // "tray" | "grill"
    let dragGhost = null;
    let dragHover = null;       // 현재 호버 중인 드롭존 (.bbq-slot, .bbq-plate)

    // HUD
    const goalScore = LESSONS_UNIT3.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "45.0", style: { color: "var(--secondary-dark)" } });
    const comboEl = el("span", { class: "hud-chip__big", text: "0" });
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
            el("span", { text: "🏕️" }),
            el("span", { class: "stat-chip__label", text: "단계" }),
            stageEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "🔥" }),
            el("span", { class: "stat-chip__label", text: "콤보" }),
            comboEl,
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

    // ----- 캠핑 배경 -----
    const sky = el("div", { class: "bbq-sky" },
        el("div", { class: "bbq-moon", text: "🌙" }),
        el("div", { class: "bbq-stars" },
            el("span", { class: "bbq-star s1", text: "✨" }),
            el("span", { class: "bbq-star s2", text: "⭐" }),
            el("span", { class: "bbq-star s3", text: "✨" }),
            el("span", { class: "bbq-star s4", text: "💫" }),
            el("span", { class: "bbq-star s5", text: "⭐" }),
            el("span", { class: "bbq-star s6", text: "✨" }),
        ),
    );
    screen.appendChild(sky);
    const camp = el("div", { class: "bbq-camp" },
        el("div", { class: "bbq-tent bbq-tent--left", text: "⛺" }),
        el("div", { class: "bbq-tree bbq-tree--left", text: "🌲" }),
        el("div", { class: "bbq-tree bbq-tree--right", text: "🌲" }),
        el("div", { class: "bbq-tent bbq-tent--right", text: "🏕️" }),
    );
    screen.appendChild(camp);

    // ----- 메인 영역: 트레이 | 화로 | 접시 -----
    const layout = el("div", { class: "bbq-layout" });

    // 트레이
    const trayPanel = el("div", { class: "bbq-tray-panel" },
        el("div", { class: "bbq-panel__title", text: "🍱 고기 트레이" }),
    );
    const tray = el("div", { class: "bbq-tray" });
    trayPanel.appendChild(tray);

    // 화로
    const grillPanel = el("div", { class: "bbq-grill-panel" },
        el("div", { class: "bbq-panel__title", text: "🔥 화로" }),
    );
    const grill = el("div", { class: "bbq-grill-row" });
    grillPanel.appendChild(grill);
    const flames = el("div", { class: "bbq-grill__flames" },
        el("span", { class: "bbq-flame f1", text: "🔥" }),
        el("span", { class: "bbq-flame f2", text: "🔥" }),
        el("span", { class: "bbq-flame f3", text: "🔥" }),
    );
    grillPanel.appendChild(flames);

    // 접시
    const platePanel = el("div", { class: "bbq-plate-panel" },
        el("div", { class: "bbq-panel__title", text: "🍽️ 접시" }),
    );
    const plate = el("div", { class: "bbq-plate" },
        el("div", { class: "bbq-plate__icon", text: "🍽️" }),
        el("div", { class: "bbq-plate__hint", text: "여기에 드롭" }),
    );
    platePanel.appendChild(plate);

    layout.appendChild(trayPanel);
    layout.appendChild(grillPanel);
    layout.appendChild(platePanel);
    screen.appendChild(layout);

    const cards = makeShortcutCards([
        { combo: "드래그", label: "트레이→화로", icon: "🥩➡️🔥", active: true },
        { combo: "드래그", label: "화로→접시", icon: "🥓➡️🍽️" },
    ]);
    screen.appendChild(cards.el);

    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 트레이의 생고기 → 화로로 드래그! 완벽하게 익으면 → 접시로 드래그! 🍽️" });
    screen.appendChild(bottomHelp);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        comboEl.textContent = perfectCombo;
        comboEl.style.color = perfectCombo >= 3 ? "#d63031" : "var(--text-dark)";
    }

    // ----- 트레이 생성 -----
    function buildTray() {
        tray.innerHTML = "";
        trayMeats = [];
        const stage = cfg.stages[stageIndex];
        for (let i = 0; i < stage.trayCount; i++) {
            const meatType = cfg.meatTypes[Math.floor(Math.random() * cfg.meatTypes.length)];
            const isGolden = Math.random() < cfg.goldenChance;
            const meatEl = el("div", {
                class: "bbq-meat bbq-meat--raw" + (isGolden ? " bbq-meat--golden" : ""),
                text: meatType.emoji,
            });
            gfxify(meatEl);
            const meat = {
                id: nextMeatId++,
                el: meatEl,
                meatType,
                isGolden,
                served: false,
                location: "tray",
            };
            wireMeatDrag(meat);
            tray.appendChild(meatEl);
            trayMeats.push(meat);
        }
    }

    // ----- 화로 자리 생성 -----
    function buildGrillSlots() {
        grill.innerHTML = "";
        grillSlots = [];
        const stage = cfg.stages[stageIndex];
        for (let i = 0; i < stage.grillSlots; i++) {
            const slotEl = el("div", { class: "bbq-slot" },
                el("div", { class: "bbq-slot__hint", text: "올려놓기" }),
            );
            grill.appendChild(slotEl);
            grillSlots.push({ el: slotEl, meat: null, startedAt: 0, state: "empty" });
        }
    }

    // ----- 드래그 와이어링 -----
    function wireMeatDrag(meat) {
        meat.el.addEventListener("pointerdown", (e) => {
            if (!inStage || finished) return;
            if (e.button !== 0) return;
            if (meat.served) return;
            // 트레이에서 시작? 화로에서 시작?
            if (meat.location === "tray") {
                dragFrom = "tray";
            } else if (meat.location === "grill") {
                dragFrom = "grill";
            } else return;
            dragMeat = meat;

            // 고스트 만들기
            dragGhost = el("div", { class: "bbq-drag-ghost", text: meat.el.textContent });
            gfxify(dragGhost);
            if (meat.isGolden) dragGhost.classList.add("bbq-meat--golden");
            document.body.appendChild(dragGhost);
            moveGhost(e.clientX, e.clientY);

            meat.el.classList.add("bbq-meat--dragging");
            e.preventDefault();
        });
    }

    function moveGhost(x, y) {
        if (!dragGhost) return;
        dragGhost.style.left = `${x}px`;
        dragGhost.style.top = `${y}px`;
    }

    document.addEventListener("pointermove", (e) => {
        if (!dragMeat) return;
        moveGhost(e.clientX, e.clientY);
        // 드롭존 호버 표시
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const dropEl = under && under.closest(".bbq-slot, .bbq-plate");
        if (dragHover && dragHover !== dropEl) {
            dragHover.classList.remove("bbq-drop-hover");
        }
        if (dropEl && dropEl !== dragHover) {
            // 유효성 검사
            const validForFrom = (dragFrom === "tray" && dropEl.classList.contains("bbq-slot"))
                || (dragFrom === "grill" && dropEl.classList.contains("bbq-plate"));
            if (validForFrom) {
                dropEl.classList.add("bbq-drop-hover");
                dragHover = dropEl;
            } else {
                dragHover = null;
            }
        } else if (!dropEl) {
            dragHover = null;
        }
    });

    document.addEventListener("pointerup", (e) => {
        if (!dragMeat) return;
        const meat = dragMeat;
        const from = dragFrom;
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const dropEl = under && under.closest(".bbq-slot, .bbq-plate");

        // 정리
        meat.el.classList.remove("bbq-meat--dragging");
        if (dragHover) dragHover.classList.remove("bbq-drop-hover");
        if (dragGhost) { dragGhost.remove(); dragGhost = null; }
        dragMeat = null;
        dragFrom = null;
        dragHover = null;

        if (!dropEl) return;

        // 트레이 → 화로 자리
        if (from === "tray" && dropEl.classList.contains("bbq-slot")) {
            const slot = grillSlots.find(s => s.el === dropEl);
            if (!slot || slot.meat) return;     // 이미 자리에 고기 있음
            placeOnGrill(meat, slot);
        }
        // 화로 → 접시
        else if (from === "grill" && dropEl.classList.contains("bbq-plate")) {
            servePlate(meat);
        }
    });

    function placeOnGrill(meat, slot) {
        // 트레이에서 빼고 슬롯에 넣기
        const trayIdx = trayMeats.indexOf(meat);
        if (trayIdx >= 0) trayMeats.splice(trayIdx, 1);
        // 트레이의 옛 element를 별도 참조로 잡아둠 (setTimeout 닫힘 함수가 meat.el을 늦게 읽지 못하도록)
        const oldTrayEl = meat.el;
        oldTrayEl.classList.add("bbq-meat--leaving-tray");
        setTimeout(() => oldTrayEl.remove(), 220);

        // 새 element를 slot에 만들기 (시작은 raw)
        const newEl = el("div", {
            class: "bbq-meat bbq-meat--raw" + (meat.isGolden ? " bbq-meat--golden" : ""),
            text: meat.meatType.emoji,
        });
        gfxify(newEl);
        // 이전 hint 가리기
        const hint = slot.el.querySelector(".bbq-slot__hint");
        if (hint) hint.style.display = "none";
        slot.el.appendChild(newEl);
        // meat 객체 업데이트
        meat.el = newEl;
        meat.location = "grill";
        slot.meat = meat;
        slot.startedAt = performance.now();
        slot.state = "raw";
        wireMeatDrag(meat);

        // 게이지 추가
        const gauge = el("div", { class: "bbq-slot__gauge" },
            el("div", { class: "bbq-slot__gauge-fill" }),
            el("div", { class: "bbq-slot__gauge-perfect" }),
        );
        slot.el.appendChild(gauge);
        slot.gaugeFill = gauge.querySelector(".bbq-slot__gauge-fill");
        slot.perfectZone = gauge.querySelector(".bbq-slot__gauge-perfect");
        renderPerfectZone(slot);

        // 지글지글
        Audio.sizzleStart && Audio.sizzleStart(0.12);
    }

    function renderPerfectZone(slot) {
        const stage = cfg.stages[stageIndex];
        const totalMs = stage.burnAfterMs;
        const startPct = (stage.cookTimeMs / totalMs) * 100;
        const widthPct = (stage.perfectWindowMs / totalMs) * 100;
        slot.perfectZone.style.left = `${startPct}%`;
        slot.perfectZone.style.width = `${widthPct}%`;
    }

    function servePlate(meat) {
        // 어느 슬롯에 있었는지 찾기
        const slot = grillSlots.find(s => s.meat === meat);
        if (!slot) return;

        const stage = cfg.stages[stageIndex];
        const sm = stage.scoreMult || 1;
        const elapsed = performance.now() - slot.startedAt;
        let gain = 0;
        let label = "";
        let cls = "good";
        let isPerfect = false;
        let burntFlag = false;

        if (elapsed < stage.cookTimeMs * 0.5) {
            gain = Math.floor(cfg.points.raw * sm);
            label = `🩸 생고기 +${gain}`;
            cls = "bad";
            perfectCombo = 0;
        } else if (elapsed < stage.cookTimeMs) {
            gain = Math.floor(cfg.points.cooking * sm);
            label = `덜 익음 +${gain.toLocaleString()}`;
            cls = "good";
            perfectCombo = 0;
        } else if (elapsed < stage.cookTimeMs + stage.perfectWindowMs) {
            isPerfect = true;
            perfectCombo++;
            const comboMult = 1 + (perfectCombo - 1) * 0.5;
            gain = Math.floor(cfg.points.perfect * comboMult * sm);
            if (meat.isGolden) gain *= cfg.goldenMultiplier;
            gain += Math.floor(cfg.comboBonus * (perfectCombo - 1) * sm);
            label = meat.isGolden ? `🌟 황금 완벽! +${gain.toLocaleString()}` : `🎉 완벽! +${gain.toLocaleString()}`;
            cls = "rainbow";
            Audio.perfectBell && Audio.perfectBell();
        } else if (elapsed < stage.burnAfterMs) {
            gain = Math.floor(cfg.points.overcook * sm);
            label = `좀 탔어 +${gain.toLocaleString()}`;
            cls = "good";
            perfectCombo = 0;
        } else {
            gain = Math.floor(cfg.points.burnt * sm);
            label = `🔥 탔어 ${gain.toLocaleString()}`;
            cls = "bad";
            perfectCombo = 0;
            burntFlag = true;
            Audio.burnt && Audio.burnt();
        }

        meat.served = true;
        score = Math.max(0, score + gain);
        totalServed++;
        updateScoreDisplay();

        const r = plate.getBoundingClientRect();
        showScoreFloat(r.left + r.width / 2, r.top - 10, label, cls);
        if (isPerfect) {
            emitParticles(r.left + r.width / 2, r.top + r.height / 2,
                meat.isGolden ? 22 : 14, ["✨","⭐","🌟","💫","🎉","🎊"]);
            Audio.bigCorrect(meat.isGolden ? 8 : 6);
        } else if (!burntFlag) {
            Audio.correct();
        }

        // 접시에 작은 표시 (1초)
        const placed = el("div", { class: "bbq-plate__placed" + (burntFlag ? " bbq-plate__placed--burnt" : ""),
            text: burntFlag ? "🌶️" : meat.meatType.emoji });
        if (!burntFlag) gfxify(placed);
        plate.appendChild(placed);
        setTimeout(() => placed.remove(), 1500);

        // 화로에서 제거 → 트레이에 다른 슬롯들이 살았는지 확인 → 모두 비면 사운드 끝
        if (slot.gaugeFill && slot.gaugeFill.parentNode) slot.gaugeFill.parentNode.remove();
        slot.el.querySelector(".bbq-meat")?.remove();
        const hint = slot.el.querySelector(".bbq-slot__hint");
        if (hint) hint.style.display = "";
        slot.meat = null;
        slot.state = "empty";
        if (!grillSlots.some(s => s.meat)) {
            Audio.sizzleStop && Audio.sizzleStop();
        }

        // 모두 서빙되었는지 체크 (시간 보너스)
        const remainTray = trayMeats.length;
        const onGrill = grillSlots.filter(s => s.meat).length;
        if (remainTray === 0 && onGrill === 0) {
            const remainSec = Math.max(0, (stageEndsAt - performance.now()) / 1000);
            const bonus = Math.floor(remainSec) * stage.timeBonusPerSec;
            if (bonus > 0) {
                score += bonus;
                updateScoreDisplay();
                showTimeBonus(remainSec, bonus);
            }
            setTimeout(() => endStage(), 1400);
        }
    }

    function autoBurn(slot) {
        // 슬롯에서 자동으로 타기 처리 (시각만 — 점수는 서빙시점에 결정)
        slot.state = "burnt";
        const meatEl = slot.el.querySelector(".bbq-meat");
        if (meatEl) {
            meatEl.classList.add("bbq-meat--burnt");
            meatEl.textContent = "🌶️";
        }
        // 연기 5개
        const r = slot.el.getBoundingClientRect();
        for (let i = 0; i < 5; i++) {
            const puff = el("div", { class: "bbq-smoke", text: "💨" });
            puff.style.left = `${r.left + r.width / 2 + (Math.random() - 0.5) * 40}px`;
            puff.style.top = `${r.top + 10}px`;
            puff.style.animationDelay = `${i * 0.1}s`;
            document.body.appendChild(puff);
            setTimeout(() => puff.remove(), 1500);
        }
        Audio.burnt && Audio.burnt();
    }

    function showTimeBonus(secLeft, bonus) {
        const banner = el("div", { class: "cycle-banner",
            text: `⚡ 다 구웠어요! ${Math.floor(secLeft)}초 보너스 +${bonus.toLocaleString()}!` });
        screen.appendChild(banner);
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 28, ["✨","⭐","🌟","💫","🎉","🎊","🥩","🍖"]);
        setTimeout(() => {
            banner.style.transition = "opacity 0.4s, transform 0.4s";
            banner.style.opacity = "0";
            banner.style.transform = "translateX(-50%) translateY(-20px)";
            setTimeout(() => banner.remove(), 420);
        }, 1500);
    }

    // ----- 루프 -----
    function tick() {
        if (finished) { rafId = requestAnimationFrame(tick); return; }
        const now = performance.now();
        if (inStage) {
            const stage = cfg.stages[stageIndex];
            const remain = Math.max(0, (stageEndsAt - now) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 5 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) { endStage(); rafId = requestAnimationFrame(tick); return; }

            grillSlots.forEach(slot => {
                if (!slot.meat || slot.state === "burnt") return;
                const elapsed = now - slot.startedAt;
                const ratio = Math.min(1, elapsed / stage.burnAfterMs);
                if (slot.gaugeFill) slot.gaugeFill.style.width = `${ratio * 100}%`;

                let newState = slot.state;
                if (elapsed < stage.cookTimeMs * 0.5) newState = "raw";
                else if (elapsed < stage.cookTimeMs) newState = "cooking";
                else if (elapsed < stage.cookTimeMs + stage.perfectWindowMs) newState = "perfect";
                else if (elapsed < stage.burnAfterMs) newState = "overcook";
                else newState = "burnt";

                if (newState !== slot.state) {
                    slot.state = newState;
                    const meatEl = slot.meat.el;
                    meatEl.className = "bbq-meat bbq-meat--" + newState
                        + (slot.meat.isGolden ? " bbq-meat--golden" : "");
                    if (newState === "perfect") meatEl.textContent = "🥓";
                    if (newState === "burnt") {
                        autoBurn(slot);
                    }
                }
            });
        }
        rafId = requestAnimationFrame(tick);
    }

    function startStage(idx) {
        stageIndex = idx;
        const stage = cfg.stages[idx];
        stageEl.textContent = `${idx + 1} / ${cfg.stages.length}`;
        timerEl.textContent = (stage.duration / 1000).toFixed(1);
        showStageBanner(stage.label);
        Audio.roundStart();
        perfectCombo = 0;
        Audio.sizzleStop && Audio.sizzleStop();

        buildTray();
        buildGrillSlots();

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
        Audio.sizzleStop && Audio.sizzleStop();
        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 1000);
        } else {
            setTimeout(() => startStage(stageIndex), 1400);
        }
    }

    function cleanup() {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        Audio.sizzleStop && Audio.sizzleStop();
        if (dragGhost) { dragGhost.remove(); dragGhost = null; }
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
            bestCombo: totalServed,
            leveledUp: newLevel > prevLevel,
            newLevel,
        });
    }

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "고기를 🔥화로에 드래그! 완벽하게 익으면 🍽️접시로!");
        startStage(0);
    };
    if (!hasSeenTutorial("gameBbq")) {
        showTutorial("gameBbq", startGame);
    } else {
        startGame();
    }
};
