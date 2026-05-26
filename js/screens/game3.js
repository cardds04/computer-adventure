/* ============================================================
   3단원: 택배 마스터
   빈 트럭이 등장하고, 물건을 드래그해서 적재칸에 실으면 점수.
   모든 칸이 채워지면 트럭이 출발하며 보너스 점수.
   ============================================================ */

SCREEN_RENDERERS.game3 = function (root, params) {
    const screen = el("div", { class: "screen game" });
    const cfg = TRUCK_GAME_CONFIG;

    let roundIndex = 0;
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let trucksDelivered = 0;
    let bestStreak = 0;       // 연속 풀로딩 (사용 안 함, 결과에 0으로 전달)
    let itemsLoaded = 0;
    let items = [];
    let slots = [];           // DOM 슬롯 배열
    let truckEl = null;
    let truckArea = null;     // 트럭 hit-test 영역 element
    let warehouse = null;
    let inRound = false;
    let roundEndsAt = 0;
    let roundTimer = null;
    let rafId = null;

    // ----- HUD -----
    const goalScore = (LESSONS.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const roundEl = el("span", { text: `1 / ${cfg.rounds.length}` });
    const timerEl = el("span", { class: "hud-chip__big", text: "20.0", style: { color: "var(--secondary-dark)" } });
    const truckCountEl = el("span", { text: "0" });
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
            roundEl,
        ),
        el("span", { class: "hud-chip" },
            el("span", { text: "🚚" }),
            el("span", { class: "stat-chip__label", text: "배달" }),
            truckCountEl,
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

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + score);
    }

    // ----- 게임 영역 -----
    const playArea = el("div", {
        style: { position: "absolute", inset: "0", overflow: "hidden" },
    });
    screen.appendChild(playArea);

    // ----- 플레이어 캐릭터 (좌측 하단) -----
    const playerChar = el("div", {
        class: "player-character player-character--corner",
        text: getCurrentEmoji(),
    });
    screen.appendChild(playerChar);

    let promptBanner = null;

    function showPrompt(text) {
        if (promptBanner) promptBanner.remove();
        promptBanner = el("div", { class: "prompt-banner" },
            el("span", { text }),
        );
        screen.appendChild(promptBanner);
    }

    // ----- 트럭 만들기 -----
    function buildTruck(capacity) {
        // 트럭 컨테이너 (화면 우측)
        truckEl = el("div", { class: "truck" });

        // 트럭 모양 (캡 + 적재칸)
        const cab = el("div", { class: "truck-cab", text: "🚛" });

        // 적재 칸 (슬롯 그리드)
        const cargoBed = el("div", { class: "cargo-bed" });
        slots = [];

        // 8개 이하 = 1줄, 그 이상 = 2줄 그리드
        if (capacity > 4) {
            cargoBed.style.gridTemplateColumns = `repeat(${Math.ceil(capacity / 2)}, 1fr)`;
        } else {
            cargoBed.style.gridTemplateColumns = `repeat(${capacity}, 1fr)`;
        }

        for (let i = 0; i < capacity; i++) {
            const slot = el("div", { class: "cargo-slot" });
            slots.push(slot);
            cargoBed.appendChild(slot);
        }

        truckEl.appendChild(cab);
        truckEl.appendChild(cargoBed);

        // 트럭 드롭존 영역 = 적재칸 전체
        truckArea = cargoBed;
        truckArea.classList.add("drop-zone");

        // 트럭이 화면 오른쪽에서 슬라이드 인
        truckEl.style.animation = "truck-arrive 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)";
        playArea.appendChild(truckEl);
    }

    // ----- 물건 만들기 -----
    function spawnItems(count) {
        // 트럭이 화면 중앙(top 65%)에 있으므로, 아이템은 트럭 위쪽 영역에 배치
        const areaW = screen.clientWidth;
        const areaH = screen.clientHeight;

        // 트럭 영역 추정 (CSS의 top: 65%, 캡 높이 ~170px, 적재칸 ~120px)
        const truckCenterY = areaH * 0.65;
        const truckHalfH = 140;
        const truckTop = truckCenterY - truckHalfH;

        const startY = 150;                              // HUD 아래
        const endY = Math.max(startY + 100, truckTop - 30);
        const usableW = areaW - 200;                     // 좌우 100px 여백
        const usableH = endY - startY;

        items = [];

        // 격자: 최대 4열, 필요 시 2열
        const cols = Math.min(count, 4);
        const rows = Math.ceil(count / cols);
        const cellW = usableW / cols;
        const cellH = usableH / rows;

        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = 100 + cellW * (col + 0.5) + (Math.random() - 0.5) * 16;
            const cy = startY + cellH * (row + 0.5) + (Math.random() - 0.5) * 12;
            const type = TRUCK_ITEMS[Math.floor(Math.random() * TRUCK_ITEMS.length)];
            const isBonus = Math.random() < (1 / 30);

            const wrapper = el("div", {
                class: "truck-item" + (isBonus ? " truck-item--bonus" : ""),
                attrs: { "data-type": type },
                style: {
                    left: `${cx}px`,
                    top: `${cy}px`,
                    transform: "translate(-50%, -50%)",
                    animation: "target-in 0.3s ease-out",
                    animationDelay: `${i * 0.06}s`,
                    animationFillMode: "both",
                },
                html: `${type}${isBonus ? '<span class="truck-item-bonus-badge">×10</span>' : ''}`,
            });
            const itemObj = { el: wrapper, type, originLeft: cx, originTop: cy, loaded: false, isBonus };
            bindDrag(itemObj);
            items.push(itemObj);
            playArea.appendChild(wrapper);
        }
    }

    function bindDrag(itemObj) {
        const wrapper = itemObj.el;
        wrapper.addEventListener("pointerdown", (ev) => {
            if (!inRound || itemObj.loaded) return;
            ev.preventDefault();
            try { wrapper.setPointerCapture(ev.pointerId); } catch (_) {}

            const startPx = ev.clientX;
            const startPy = ev.clientY;
            wrapper.style.zIndex = "100";
            wrapper.style.cursor = "grabbing";
            wrapper.style.transition = "none";
            wrapper.style.animation = "none";
            wrapper.classList.add("dragging");

            const move = (e) => {
                const dx = e.clientX - startPx;
                const dy = e.clientY - startPy;
                wrapper.style.left = `${itemObj.originLeft + dx}px`;
                wrapper.style.top  = `${itemObj.originTop + dy}px`;
                // 드롭존 위인지 시각 피드백
                if (isOverTruck(wrapper)) {
                    truckArea.classList.add("highlight");
                } else {
                    truckArea.classList.remove("highlight");
                }
            };

            const up = (e) => {
                wrapper.removeEventListener("pointermove", move);
                wrapper.removeEventListener("pointerup", up);
                wrapper.removeEventListener("pointercancel", up);
                try { wrapper.releasePointerCapture(e.pointerId); } catch (_) {}
                truckArea.classList.remove("highlight");
                wrapper.classList.remove("dragging");

                if (isOverTruck(wrapper)) {
                    loadIntoTruck(itemObj);
                } else {
                    // 원위치로
                    wrapper.style.transition = "all 0.3s cubic-bezier(0.2, 1.4, 0.4, 1)";
                    wrapper.style.left = `${itemObj.originLeft}px`;
                    wrapper.style.top  = `${itemObj.originTop}px`;
                    wrapper.style.cursor = "grab";
                    wrapper.style.zIndex = "1";
                }
            };

            wrapper.addEventListener("pointermove", move);
            wrapper.addEventListener("pointerup", up);
            wrapper.addEventListener("pointercancel", up);
        });
    }

    function isOverTruck(itemEl) {
        const rect = itemEl.getBoundingClientRect();
        const tRect = truckArea.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return cx >= tRect.left && cx <= tRect.right && cy >= tRect.top && cy <= tRect.bottom;
    }

    function loadIntoTruck(itemObj) {
        const emptySlot = slots.find(s => !s.dataset.filled);
        if (!emptySlot) {
            // 이미 가득 — 원위치
            itemObj.el.style.transition = "all 0.3s cubic-bezier(0.2, 1.4, 0.4, 1)";
            itemObj.el.style.left = `${itemObj.originLeft}px`;
            itemObj.el.style.top  = `${itemObj.originTop}px`;
            return;
        }

        itemObj.loaded = true;

        // 아이템을 슬롯 위치로 날아가게
        const slotRect = emptySlot.getBoundingClientRect();
        const cx = slotRect.left + slotRect.width / 2;
        const cy = slotRect.top + slotRect.height / 2;

        itemObj.el.style.transition = "all 0.45s cubic-bezier(0.2, 1.4, 0.4, 1)";
        itemObj.el.style.left = `${cx}px`;
        itemObj.el.style.top  = `${cy}px`;
        itemObj.el.style.transform = "translate(-50%, -50%) scale(0.6)";
        itemObj.el.style.opacity = "0";

        setTimeout(() => itemObj.el.remove(), 460);

        // 슬롯에 표시
        emptySlot.dataset.filled = "1";
        emptySlot.textContent = itemObj.type;
        emptySlot.classList.add("filled");
        emptySlot.style.animation = "slot-pop 0.4s cubic-bezier(0.2, 1.4, 0.4, 1)";

        itemsLoaded++;
        const round = cfg.rounds[roundIndex];
        const gain = itemObj.isBonus ? round.perItem * 10 : round.perItem;
        score += gain;
        updateScoreDisplay();
        if (itemObj.isBonus) Audio.bigCorrect(8);
        else Audio.correct();

        // 점수 플로팅
        const pf = el("div", {
            class: "points-float" + (itemObj.isBonus ? " points-float--bonus" : ""),
            text: itemObj.isBonus ? `🎉 +${gain}!` : `+${gain}`,
            style: { left: `${cx}px`, top: `${cy}px` },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1100);

        emitParticles(cx, cy, itemObj.isBonus ? 12 : 4, ["✨", "⭐", "🌟", "🎉"]);

        // 모든 슬롯이 찼는지 확인
        const allFilled = slots.every(s => s.dataset.filled);
        if (allFilled) {
            setTimeout(deliverTruck, 600);
        }
    }

    function deliverTruck() {
        if (!inRound) return;
        trucksDelivered++;
        truckCountEl.textContent = trucksDelivered;

        // 보너스 점수 (라운드별로 다름)
        const round = cfg.rounds[roundIndex];
        const gain = round.fullBonus;
        score += gain;
        updateScoreDisplay();
        Audio.bigCorrect(5);

        // 보너스 플로팅
        const truckRect = truckEl.getBoundingClientRect();
        const cx = truckRect.left + truckRect.width / 2;
        const cy = truckRect.top + truckRect.height / 2;
        const pf = el("div", {
            class: "points-float",
            text: `🚚💨 +${gain}!`,
            style: { left: `${cx}px`, top: `${cy}px`, fontSize: "40px" },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1200);

        emitParticles(cx, cy, 12, ["✨", "⭐", "🌟", "💫", "🎉"]);

        // 트럭이 출발 (오른쪽으로 슬라이드)
        truckEl.style.animation = "truck-leave 0.9s cubic-bezier(0.4, 0, 0.6, 1) forwards";
        setTimeout(() => endRound(), 1000);
    }

    function startRound() {
        const round = cfg.rounds[roundIndex];
        roundEl.textContent = `${roundIndex + 1} / ${cfg.rounds.length}`;
        showPrompt(round.label);
        Audio.roundStart();

        setTimeout(() => {
            inRound = true;
            buildTruck(round.capacity);
            setTimeout(() => spawnItems(round.capacity), 400);
            roundEndsAt = performance.now() + cfg.roundDuration;
            roundTimer = setTimeout(endRound, cfg.roundDuration);
        }, 700);
    }

    function endRound() {
        if (!inRound) return;
        inRound = false;
        clearTimeout(roundTimer);
        roundTimer = null;

        // 잔여 아이템 정리
        items.forEach(i => {
            if (i.loaded) return;
            i.el.style.transition = "opacity 0.3s, transform 0.3s";
            i.el.style.opacity = "0";
            i.el.style.transform += " scale(0.5)";
            setTimeout(() => i.el.remove(), 320);
        });
        items = [];

        // 트럭이 안 떠나 있다면 제거
        if (truckEl && truckEl.parentNode) {
            truckEl.style.transition = "opacity 0.4s";
            truckEl.style.opacity = "0";
            setTimeout(() => truckEl && truckEl.remove(), 420);
        }

        if (promptBanner) {
            promptBanner.style.opacity = "0";
            setTimeout(() => promptBanner && promptBanner.remove(), 320);
        }

        roundIndex++;
        if (roundIndex >= cfg.rounds.length) {
            setTimeout(finishGame, 800);
        } else {
            setTimeout(startRound, 1000);
        }
    }

    function tick(t) {
        if (inRound) {
            const remain = Math.max(0, (roundEndsAt - t) / 1000);
            timerEl.textContent = remain.toFixed(1);
            timerEl.style.color = remain < 3 ? "#d63031" : "var(--secondary-dark)";
        }
        rafId = requestAnimationFrame(tick);
    }

    function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        if (roundTimer) clearTimeout(roundTimer);
        rafId = roundTimer = null;
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
            bestCombo: trucksDelivered,
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

    // 일시정지/재개
    let _pausedAt = null;
    let _wasInRound = false;
    const pauseHandler = {
        pause() {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
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
                const remaining = Math.max(0, roundEndsAt - performance.now());
                roundTimer = setTimeout(endRound, remaining);
            }
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

    if (!hasSeenTutorial("game3")) {
        showTutorial("game3", startGame);
    } else {
        startGame();
    }
};
