/* ============================================================
   2단원 스텝 3: 한글 자음 모음 (떨어지는 글자 타이핑)
   1단계 자음 15초 → 2단계 모음 15초 → 3단계 글자(자모 조합) 15초
   ============================================================ */

SCREEN_RENDERERS.gameHangul = function (root, params) {
    const screen = el("div", { class: "screen game" });
    const cfg = HANGUL_GAME_CONFIG;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;
    let stageIndex = 0;
    let stageEndsAt = 0;
    let inStage = false;
    let finished = false;
    let letters = [];      // { el, char, type, targetKey, isBonus, multiplier, y, x, vy, handled }
    let lastTickAt = 0;
    let spawnTimer = null;
    let rafId = null;
    let keyBuffer = [];    // 음절 매칭용 키 버퍼

    // ----- HUD -----
    const goalScore = LESSONS_UNIT2.find(l => l.id === params.lessonId)?.goalScore || 0;
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const stageEl = el("span", { text: "1 / 3" });
    const timerEl = el("span", { class: "hud-chip__big", text: "15.0", style: { color: "var(--secondary-dark)" } });
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
            el("span", { text: "📚" }),
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

    // ----- 안내 배너 -----
    const helpBanner = el("div", {
        class: "prompt-banner",
        style: { top: "90px", fontSize: "20px" },
        html: `<span class="prompt-banner__hint">키보드로 떨어지는 한글을 타이핑!</span><span>ㄱ ㅏ 가</span>`,
    });
    screen.appendChild(helpBanner);
    setTimeout(() => {
        helpBanner.style.transition = "opacity 0.5s, transform 0.5s";
        helpBanner.style.opacity = "0";
        helpBanner.style.transform = "translateX(-50%) translateY(-20px)";
        setTimeout(() => helpBanner.remove(), 520);
    }, 3500);

    // ----- 게임 영역 -----
    const playArea = el("div", {
        style: { position: "absolute", inset: "0", overflow: "hidden" },
    });
    screen.appendChild(playArea);

    function updateScoreDisplay() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
    }

    function weightedPick(values, weights) {
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < values.length; i++) {
            r -= weights[i];
            if (r <= 0) return values[i];
        }
        return values[values.length - 1];
    }

    // ----- 글자 스폰 -----
    function spawnLetter() {
        if (!inStage || finished) return;
        const stage = cfg.stages[stageIndex];
        const char = stage.chars[Math.floor(Math.random() * stage.chars.length)];

        let targetKey;
        if (stage.type === "jamo") {
            targetKey = HANGUL_KEYS[char];
            if (targetKey) targetKey = targetKey.toLowerCase();
        } else {
            targetKey = syllableToKeySequence(char);
        }
        if (!targetKey) return;

        // 보너스 여부
        const isBonus = Math.random() < cfg.bonusChance;
        const multiplier = isBonus
            ? weightedPick(cfg.bonusMultipliers, cfg.bonusWeights)
            : 0;

        const areaW = screen.clientWidth;
        // 글자 박스 폭이 큰 음절(3단계)도 잘리지 않도록 충분한 여백
        const x = 90 + Math.random() * Math.max(60, areaW - 180);
        const y = -80;

        const wrap = el("div", {
            class: "hangul-letter" + (isBonus ? " hangul-letter--bonus" : ""),
        });
        const charEl = el("div", { class: "hangul-letter__char", text: char });
        const keyHint = el("div", { class: "hangul-letter__key", text: targetKey.toUpperCase() });
        wrap.appendChild(charEl);
        wrap.appendChild(keyHint);
        if (isBonus) {
            const bonusBadge = el("div", { class: "hangul-letter__bonus", text: `×${multiplier}` });
            wrap.appendChild(bonusBadge);
        }
        wrap.style.left = `${x}px`;
        wrap.style.top = `${y}px`;
        wrap.style.transform = "translateX(-50%)";

        playArea.appendChild(wrap);
        letters.push({
            el: wrap, char, type: stage.type, targetKey,
            isBonus, multiplier, x, y, vy: stage.fallSpeed, handled: false,
        });
    }

    function hitLetter(letter) {
        letter.handled = true;
        letter.el.classList.add("hangul-letter--hit");
        const stage = cfg.stages[stageIndex];
        const base = stage.pointsPerCorrect;
        const gain = letter.isBonus ? base * letter.multiplier : base;
        score += gain;
        updateScoreDisplay();

        const rect = letter.el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const pf = el("div", {
            class: "points-float" + (letter.isBonus ? " points-float--bonus" : ""),
            text: letter.isBonus ? `🎉 +${gain}!` : `+${gain}`,
            style: { left: `${cx}px`, top: `${cy}px` },
        });
        fxLayer.appendChild(pf);
        setTimeout(() => pf.remove(), 1100);

        emitParticles(cx, cy, letter.isBonus ? 14 : 6, ["✨", "⭐", "🌟", "💫"]);

        if (letter.isBonus) Audio.bigCorrect(8);
        else Audio.correct();

        setTimeout(() => letter.el.remove(), 400);
    }

    // ----- 키 입력 -----
    function onKey(e) {
        if (!inStage || finished) return;
        const rawKey = e.key;
        if (!rawKey || rawKey.length !== 1) return;

        e.preventDefault();

        // 한글 자모면 영문 키로 변환
        let normKey = HANGUL_KEYS[rawKey] || rawKey;
        normKey = normKey.toLowerCase();

        const now = performance.now();
        keyBuffer = keyBuffer.filter(k => now - k.time < 1500);
        keyBuffer.push({ key: normKey, time: now });

        const stage = cfg.stages[stageIndex];
        let hit = false;

        // 가장 아래에 있는 매칭 글자부터 검사
        const candidates = letters
            .filter(l => !l.handled)
            .sort((a, b) => b.y - a.y);   // 아래쪽 우선

        for (const letter of candidates) {
            if (letter.type === "jamo") {
                if (letter.targetKey === normKey) {
                    hitLetter(letter);
                    hit = true;
                    break;
                }
            } else if (letter.type === "syllable") {
                if (keyBuffer.length >= 2) {
                    const last2 = keyBuffer.slice(-2).map(k => k.key).join("");
                    if (last2 === letter.targetKey) {
                        hitLetter(letter);
                        keyBuffer = [];
                        hit = true;
                        break;
                    }
                }
            }
        }

        if (!hit) {
            score = Math.max(0, score - cfg.wrongPenalty);
            updateScoreDisplay();
        }
    }

    // ----- 메인 루프 -----
    function tick(t) {
        const dt = Math.min(50, t - (lastTickAt || t)) / 1000;
        lastTickAt = t;

        if (inStage) {
            const remain = (stageEndsAt - t) / 1000;
            timerEl.textContent = Math.max(0, remain).toFixed(1);
            timerEl.style.color = remain < 3 ? "#d63031" : "var(--secondary-dark)";
            if (remain <= 0) endStage();
        }

        // 하단 안내 배너(bottom 16px + ~36px 높이)와 겹치지 않도록 충분히 위에서 제거
        const screenH = screen.clientHeight - 130;
        letters = letters.filter(l => {
            if (l.handled) return true;
            l.y += l.vy * dt;
            l.el.style.top = `${l.y}px`;
            if (l.y > screenH) {
                l.el.remove();
                return false;
            }
            return true;
        });

        rafId = requestAnimationFrame(tick);
    }

    function startStage() {
        const stage = cfg.stages[stageIndex];
        stageEl.textContent = `${stageIndex + 1} / ${cfg.stages.length}`;
        showStageBanner(stage.label);
        Audio.roundStart();
        keyBuffer = [];

        setTimeout(() => {
            inStage = true;
            stageEndsAt = performance.now() + stage.duration;
            spawnLetter();
            spawnTimer = setInterval(spawnLetter, stage.spawnIntervalMs);
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
        }, 1100);
    }

    function endStage() {
        inStage = false;
        clearInterval(spawnTimer);
        spawnTimer = null;
        letters.forEach(l => {
            if (l.handled) return;
            l.el.style.transition = "opacity 0.4s";
            l.el.style.opacity = "0";
            setTimeout(() => l.el.remove(), 400);
        });
        letters = [];

        stageIndex++;
        if (stageIndex >= cfg.stages.length) {
            setTimeout(finishGame, 800);
        } else {
            setTimeout(startStage, 1500);
        }
    }

    function cleanup() {
        finished = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (spawnTimer) clearInterval(spawnTimer);
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

    function runCountdown(numbers, idx, cb) {
        if (idx >= numbers.length) { cb(); return; }
        const cd = el("div", { class: "countdown", text: numbers[idx] });
        screen.appendChild(cd);
        if (idx < numbers.length - 1) Audio.tick();
        else Audio.tickGo();
        setTimeout(() => { cd.remove(); runCountdown(numbers, idx + 1, cb); }, 800);
    }

    document.addEventListener("keydown", onKey);

    // ----- 좌상단 캐릭터 (레벨업 시 변신) -----
    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);

    // ----- 하단 게임방법 안내 -----
    const bottomHelp = el("div", { class: "game-bottom-help",
        text: "💡 떨어지는 한글 글자 아래 영문 키를 누르면 점수! (3단계: 두 키 연속 = 음절)" });
    screen.appendChild(bottomHelp);

    root.appendChild(screen);
    updateScoreDisplay();
    rafId = requestAnimationFrame(tick);

    const startGame = () => {
        showCarryOverBanner(startingScore);
        showIntroInstruction(screen, "키보드로 떨어지는 한글을 타이핑하세요!");
        runCountdown(["3", "2", "1", "출발!"], 0, () => {
            startStage();
        });
    };
    if (!hasSeenTutorial("gameHangul")) {
        showTutorial("gameHangul", startGame);
    } else {
        startGame();
    }
};
