/* ============================================================
   5단원 타자편 — 타자 원정대 : 공주 구출 작전
   하나의 연속 어드벤처: 인트로 → 4단계(타자) → 보스 액션전 → 엔딩
   - 한글 입력: 실제 <input> (IME 안전)
   - 각 단계 타자 성적 → 무기 등급(B/A/S) → 보스전 위력
   ============================================================ */

SCREEN_RENDERERS.gameTypingAdv = function (root, params) {
    const cfg = TYPING_ADV_CONFIG;
    const screen = el("div", { class: "screen game game--typingadv game--unit5" });

    // ----- 전체 상태 -----
    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore;          // 이 관문(레슨)의 점수
    let knightHp = cfg.knightMaxHp;
    // 이 레슨이 담당할 단계 (각 관문 = 별도 스텝)
    const STAGE_BY_LESSON = { u5_lesson1: 0, u5_lesson2: 1, u5_lesson3: 2, u5_lesson4: 3, u5_scroll: 4 };
    const myStage = (params.debugStage != null) ? params.debugStage
        : (STAGE_BY_LESSON[params.lessonId] != null ? STAGE_BY_LESSON[params.lessonId] : 0);
    let stageIndex = myStage;
    // 무기 등급은 state에 저장 — 1~3관문에서 모아 최종장 보스전에서 사용
    let weapons = Object.assign({ sword: "B", bow: "B", gun: "B" }, state.taWeapons || {});
    let finished = false;
    let rafId = null, spawnTimer = null;
    let inStage = false;
    // 단계별 타자 정확도 측정
    let stClears = 0, stMisses = 0;

    const goalScore = LESSONS_UNIT5.find(l => l.id === params.lessonId)?.goalScore || 0;

    // ----- HUD -----
    const stageEl = el("span", { text: "마법의 숲" });
    const scoreEl = el("span", { class: "hud-chip__big", text: `${startingScore}` });
    const hpFill = el("div", { class: "ta-hp__fill" });
    const hpText = el("div", { class: "ta-hp__text", text: `${knightHp}` });
    const lvlChip = makeLevelChip(); lvlChip.update(state.points);
    const exitBtn = el("button", {
        class: "btn btn--ghost", text: "← 그만",
        style: { fontSize: "14px", padding: "6px 14px" },
        on: { click: () => { cleanup(); navigate("home"); } },
    });
    const hud = el("div", { class: "game__hud game__hud--unit5" }, exitBtn);
    screen.appendChild(hud);

    // 스테이지 라벨 (좌상단, 게임 내 오버레이)
    const u5StageLabel = el("div", { class: "u5-stagelabel" },
        el("span", { class: "u5-stagelabel__ico", text: "🗺️" }),
        el("span", { class: "u5-stagelabel__t", text: "스테이지" }),
        stageEl);
    screen.appendChild(u5StageLabel);

    // 레벨 (좌하단, 게임 내 오버레이 — 점수와 대칭)
    const u5LevelBox = el("div", { class: "u5-levelbox" }, lvlChip.chip);
    screen.appendChild(u5LevelBox);

    // ----- 게임 화면 내 점수 (오른쪽 아래, 큰 글씨 + 오를 때 애니메이션) -----
    const u5ScoreNum = el("span", { class: "u5-score__num", text: `${startingScore}` });
    const u5ScoreEl = el("div", { class: "u5-score" },
        el("span", { class: "u5-score__star", text: "⭐" }),
        u5ScoreNum,
        el("span", { class: "u5-score__goal", text: `/ ${goalScore}` }),
    );
    screen.appendChild(u5ScoreEl);
    let displayedScore = startingScore;
    let scoreRaf = null;
    function bumpScore() {
        // 팝 효과
        u5ScoreEl.classList.remove("u5-score--pop"); void u5ScoreEl.offsetWidth; u5ScoreEl.classList.add("u5-score--pop");
        u5ScoreEl.classList.toggle("u5-score--passed", score >= goalScore);
        // 카운트업 트윈
        if (scoreRaf) cancelAnimationFrame(scoreRaf);
        const from = displayedScore, to = score, t0 = performance.now(), dur = 450;
        function step(t) {
            const p = Math.min(1, (t - t0) / dur);
            displayedScore = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
            u5ScoreNum.textContent = displayedScore;
            if (p < 1) scoreRaf = requestAnimationFrame(step);
            else { displayedScore = to; u5ScoreNum.textContent = to; }
        }
        scoreRaf = requestAnimationFrame(step);
    }

    const playerChar = el("div", { class: "player-character player-character--topleft", text: getCurrentEmoji() });
    screen.appendChild(playerChar);

    // ----- 무대 (배경 + 액터) -----
    const stage = el("div", { class: "ta-stage" });
    screen.appendChild(stage);

    // ----- 하단 입력바 -----
    const wpmEl = el("span", { class: "ta-stat", text: "정확도 100%" });
    const input = el("input", {
        class: "ta-input",
        attrs: { type: "text", placeholder: "여기에 단어를 입력하세요!", autocomplete: "off", spellcheck: "false" },
    });
    const inputBar = el("div", { class: "ta-inputbar" },
        el("span", { class: "ta-inputbar__icon", text: "⌨️" }),
        input,
        wpmEl,
    );
    screen.appendChild(inputBar);

    // 화면 아무 곳이나 누르면 입력칸으로 포커스 복구 (중간에 포커스 잃어도 타자 계속 가능)
    screen.addEventListener("pointerdown", () => {
        if (inStage && !finished && !input.disabled) setTimeout(() => input.focus(), 0);
    });

    function updateHud() {
        scoreEl.textContent = score;
        scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore));
        const pct = Math.max(0, Math.min(100, (knightHp / cfg.knightMaxHp) * 100));
        hpFill.style.width = `${pct}%`;
        hpFill.style.background = pct < 30 ? "#e8362f" : pct < 60 ? "#ffb300" : "#4caf50";
        hpText.textContent = Math.max(0, Math.round(knightHp));
    }
    function updateAccuracy() {
        const tot = stClears + stMisses;
        const acc = tot === 0 ? 100 : Math.round((stClears / tot) * 100);
        wpmEl.textContent = `정확도 ${acc}%`;
        return acc;
    }
    function gradeFromAcc(acc) {
        if (acc >= cfg.gradeCut.S) return "S";
        if (acc >= cfg.gradeCut.A) return "A";
        return "B";
    }

    function damageKnight(dmg) {
        knightHp -= dmg;
        updateHud();
        screen.classList.remove("ta-shake"); void screen.offsetWidth; screen.classList.add("ta-shake");
        Audio.wrong && Audio.wrong();
        if (knightHp <= 0) { knightHp = 0; updateHud(); gameOver(); }
    }
    function addScore(n) { score += n; updateHud(); bumpScore(); }

    // NFC 정규화 필수: macOS 한글 IME는 분해형(NFD)을 내보내 화면은 같아 보여도
    // 데이터(조합형 NFC)와 === 비교가 실패한다. 양쪽 모두 NFC로 맞춘 뒤 비교.
    function normalize(s) { return String(s || "").normalize("NFC").replace(/\s+/g, ""); }
    function clearInput() {
        // 한글 IME: 조합(composition) 중에 자동 처치되어 코드로 값을 비우면
        // 조합 상태가 꼬여 다음 타자가 먹통이 된다. blur 로 조합을 먼저 강제 종료한
        // 뒤, 잔여물까지 비우고 다시 포커스해서 IME 상태를 리셋한다.
        if (document.activeElement === input) {
            input.blur();                         // 조합 강제 종료(commit)
            setTimeout(() => {
                input.value = "";                 // 커밋된 잔여 글자 제거
                if (!finished) input.focus();
            }, 0);
        } else {
            input.value = "";
        }
    }
    function focusInput() { setTimeout(() => input.focus(), 50); }

    // ============================================================
    //  배너 / 스토리 / 보상 컷신
    // ============================================================
    function showBanner(title, sub, cb, ms) {
        const b = el("div", { class: "ta-banner" },
            el("div", { class: "ta-banner__title", text: title }),
            sub ? el("div", { class: "ta-banner__sub", text: sub }) : null,
        );
        screen.appendChild(b);
        Audio.roundStart && Audio.roundStart();
        setTimeout(() => {
            b.classList.add("ta-banner--out");
            setTimeout(() => { b.remove(); cb && cb(); }, 450);
        }, ms || 1500);
    }

    // 스토리 인트로 — 픽셀 톤, 한 장 요약 후 바로 게임 시작
    function showStoryIntro(cb) {
        const modal = el("div", { class: "ta-story ta-story--pixel" },
            el("div", { class: "ta-story__scene" },
                el("div", { class: "u5-story-actor u5-story-actor--knight gfx-sprite",
                    style: { backgroundImage: "url('assets/retro/sprites/hero_knight.png')" } }),
                el("div", { class: "ta-story__heart", text: "💖" }),
                el("div", { class: "u5-story-actor u5-story-actor--princess gfx-sprite",
                    style: { backgroundImage: "url('assets/unit5/princess.svg')" } }),
            ),
            el("h1", { class: "ta-story__title", text: "타자 원정대" }),
            el("div", { class: "ta-story__sub", text: "공주 구출 작전" }),
            el("p", { class: "ta-story__text", text:
                "평화로운 송양 왕국에 어둠의 마왕이 나타나\n공주님을 납치해 갔어요!\n용감한 기사가 검을 뽑아 외칩니다.\n\"내가 반드시 공주님을 구하겠어!\" ⚔️" }),
        );
        const btn = el("button", { class: "btn btn--big ta-story__cta", text: "⚔️ 모험 시작!",
            on: { click: () => { modal.classList.add("ta-story--out"); setTimeout(() => { modal.remove(); cb && cb(); }, 350); } } });
        modal.appendChild(btn);
        screen.appendChild(modal);
        Audio.roundStart && Audio.roundStart();
    }

    function showWeaponReward(stCfg, grade, cb) {
        const modal = el("div", { class: "ta-reward" },
            el("div", { class: "ta-reward__burst" }),
            el("div", { class: `ta-reward__grade ta-reward__grade--${grade}`, text: grade }),
            el("div", { class: "ta-reward__weapon", text: stCfg.weaponName }),
            el("div", { class: "ta-reward__label", text: `${grade}등급 ${stCfg.weaponName} 획득!` }),
        );
        screen.appendChild(modal);
        Audio.bigCorrect && Audio.bigCorrect(10);
        if (grade === "S" && Audio.perfectBell) Audio.perfectBell();
        setTimeout(() => {
            modal.classList.add("ta-reward--out");
            setTimeout(() => { modal.remove(); cb && cb(); }, 400);
        }, 1800);
    }

    // ============================================================
    //  공통: 타이핑 대상(approaching) 엔진 — 단계 1, 3 공용
    // ============================================================
    function runApproachStage(stCfg, onClear) {
        let actors = [];   // {el, wordEl, x, word, alive}
        let cleared = 0;
        stClears = 0; stMisses = 0;
        const isMonster = stCfg.type === "monsters";

        // 기사 (왼쪽) — 레트로 픽셀 기사
        const knight = el("div", { class: "ta-knight gfx-sprite",
            style: { backgroundImage: "url('assets/retro/sprites/hero_knight.png')" } });
        stage.appendChild(knight);

        // 1관문(마법의 숲): 늪 분위기 데코 — 반딧불 + 미니맵 (stage 교체 시 자동 제거)
        if (stCfg.id === 1) {
            for (let i = 0; i < 14; i++) {
                const ff = el("div", { class: "u5-firefly" });
                ff.style.left = (6 + Math.random() * 88) + "%";
                ff.style.top = (12 + Math.random() * 74) + "%";
                ff.style.animationDelay = (Math.random() * 6) + "s, " + (Math.random() * 1.8) + "s";
                ff.style.animationDuration = (5 + Math.random() * 4) + "s, " + (1.4 + Math.random() * 1.2) + "s";
                stage.appendChild(ff);
            }
            const mm = el("div", { class: "u5-minimap" },
                el("div", { class: "u5-minimap__title", text: "안개의 늪 · 1층" }),
                el("div", { class: "u5-minimap__grid" }),
                el("div", { class: "u5-minimap__you" }),
            );
            stage.appendChild(mm);
        }

        function spawn() {
            if (!inStage || finished) return;
            if (cleared + actors.length >= stCfg.clearCount && actors.length > 0) return;
            if (cleared >= stCfg.clearCount) return;
            const word = stCfg.words[Math.floor(Math.random() * stCfg.words.length)];
            // 같은 단어가 화면에 둘 이상 안 뜨게
            if (actors.some(a => a.alive && a.word === word)) return;
            const a = el("div", { class: "ta-foe" + (isMonster ? " ta-foe--monster" : " ta-foe--obstacle") });
            // 레트로 픽셀 몬스터 (숲·늪): 슬라임·뱀·개구리·박쥐·독버섯
            const RETRO_MONS = ["slime", "slime2", "snake", "frog", "bat", "mushroom"];
            const monKey = RETRO_MONS[Math.floor(Math.random() * RETRO_MONS.length)];
            const sprite = el("div", { class: "ta-foe__sprite gfx-sprite",
                style: { backgroundImage: `url('assets/retro/mon/${monKey}.png')` } });
            const wordEl = el("div", { class: "ta-foe__word", text: word });
            a.appendChild(wordEl); a.appendChild(sprite);
            const areaW = stage.clientWidth;
            const topPct = isMonster ? (20 + Math.random() * 50) : (30 + Math.random() * 40);
            a.style.left = `${areaW + 40}px`;
            a.style.top = `${topPct}%`;
            stage.appendChild(a);
            actors.push({ el: a, wordEl, x: areaW + 40, word, alive: true, born: performance.now() });
        }

        function onTypeCheck() {
            const v = normalize(input.value);
            if (!v) { actors.forEach(a => a.wordEl.classList.remove("ta-foe__word--active")); return; }
            // 진행중 강조
            actors.forEach(a => a.wordEl.classList.toggle("ta-foe__word--active", a.alive && normalize(a.word).startsWith(v)));
            // 정확히 일치하는 가장 가까운 적
            const hit = actors.filter(a => a.alive && normalize(a.word) === v).sort((x, y) => x.x - y.x)[0];
            if (hit) killFoe(hit);
        }
        function killFoe(a) {
            a.alive = false;
            a.el.classList.add("ta-foe--dead");
            knight.classList.remove("ta-knight--attack"); void knight.offsetWidth; knight.classList.add("ta-knight--attack");
            const r = a.el.getBoundingClientRect();
            emitParticles(r.left + r.width / 2, r.top + r.height / 2, 12, isMonster ? ["💥","⭐","✨","🔥"] : ["💥","🪵","✨"]);
            // 무기 발사 연출
            fireSlash(knight, a.el);
            setTimeout(() => a.el.remove(), 350);
            stClears++; cleared++;
            addScore(isMonster ? 20 : 12);
            updateAccuracy();
            clearInput();
            Audio.bigCorrect && Audio.bigCorrect(4);
            if (cleared >= stCfg.clearCount && actors.every(x => !x.alive)) {
                setTimeout(() => onClear(updateAccuracy()), 500);
            }
        }
        function fireSlash(from, to) {
            const fr = from.getBoundingClientRect(), tr = to.getBoundingClientRect();
            const beam = el("div", { class: "ta-slash" });
            const sr = stage.getBoundingClientRect();
            beam.style.left = `${fr.right - sr.left}px`;
            beam.style.top = `${fr.top + fr.height / 2 - sr.top}px`;
            beam.style.width = `${Math.max(20, tr.left - fr.right)}px`;
            stage.appendChild(beam);
            setTimeout(() => beam.remove(), 240);
        }

        input.oninput = () => { if (inStage) onTypeCheck(); };
        input.onkeydown = (e) => {
            if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); onTypeCheck(); }
        };

        // 루프
        let last = performance.now();
        function tick(t) {
            if (finished) return;
            const dt = Math.min(50, t - last) / 1000; last = t;
            if (inStage) {
                const speed = (stage.clientWidth) / (stCfg.approachMs / 1000);
                const knightRight = 110;
                actors = actors.filter(a => {
                    if (!a.alive) return false;
                    a.x -= speed * dt;
                    a.el.style.left = `${a.x}px`;
                    if (a.x <= knightRight) {
                        a.alive = false; a.el.remove();
                        stMisses++; cleared++;
                        damageKnight(stCfg.hpDamage);
                        updateAccuracy();
                        if (cleared >= stCfg.clearCount && actors.every(x => !x.alive)) {
                            setTimeout(() => onClear(updateAccuracy()), 400);
                        }
                        return false;
                    }
                    return true;
                });
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        inStage = true;
        spawn();
        spawnTimer = setInterval(spawn, stCfg.spawnIntervalMs);
        focusInput();
    }

    // ============================================================
    //  단계 1 (신규): 마법의 늪 — 곳곳에 출몰하는 몬스터를 마법으로 처치
    //  · 좌→우 이동 없음. 고정 지점에 나타났다 처치하면 사라지고 다른 곳에 재등장
    //  · 기사는 좌하단 바닥 위에서 마법(투사체)으로 공격
    // ============================================================
    function runSwampStage(stCfg, onClear) {
        let actors = [];   // {el, wordEl, word, alive, spot, born}
        let cleared = 0;
        stClears = 0; stMisses = 0;
        const RETRO_MONS = ["slime", "slime2", "snake", "frog", "bat", "mushroom"];
        const MAX_ON_SCREEN = 5;
        const lifeMs = stCfg.approachMs;   // 방치 허용 시간(이후 공격)
        // 몬스터 출몰 지점 (배경의 설 수 있는 곳, %)
        const SPOTS = [
            { x: 50, y: 44 }, { x: 50, y: 64 }, { x: 18, y: 38 }, { x: 34, y: 47 },
            { x: 86, y: 60 }, { x: 88, y: 44 }, { x: 78, y: 30 }, { x: 52, y: 26 },
            { x: 58, y: 84 }, { x: 82, y: 80 }, { x: 92, y: 54 },
        ];

        // 마법사 기사 (좌하단 평평한 바닥 위)
        const knight = el("div", { class: "ta-knight u5-mage gfx-sprite",
            style: { backgroundImage: "url('assets/retro/sprites/hero_knight.png')" } });
        stage.appendChild(knight);

        // 분위기 데코: 반딧불 + 미니맵
        for (let i = 0; i < 10; i++) {
            const ff = el("div", { class: "u5-firefly" });
            ff.style.left = (8 + Math.random() * 84) + "%";
            ff.style.top = (14 + Math.random() * 66) + "%";
            ff.style.animationDelay = (Math.random() * 6) + "s, " + (Math.random() * 1.8) + "s";
            ff.style.animationDuration = (5 + Math.random() * 4) + "s, " + (1.4 + Math.random() * 1.2) + "s";
            stage.appendChild(ff);
        }
        const mm = el("div", { class: "u5-minimap" },
            el("div", { class: "u5-minimap__title", text: "안개의 늪 · 1층" }),
            el("div", { class: "u5-minimap__grid" }), el("div", { class: "u5-minimap__you" }));
        stage.appendChild(mm);

        // ----- 시간 제한 카운트다운 -----
        const TIME_LIMIT = 30;   // 초
        let secsLeft = TIME_LIMIT;
        const timerEl = el("div", { class: "u5-timer" });
        function updateTimer() {
            timerEl.innerHTML = `⏱ <b>${Math.max(0, secsLeft)}</b>초`;
            timerEl.classList.toggle("u5-timer--low", secsLeft <= 10);
        }
        stage.appendChild(timerEl); updateTimer();
        const countdown = setInterval(() => {
            if (finished || !inStage) { clearInterval(countdown); return; }
            secsLeft--; updateTimer();
            if (secsLeft <= 0) { clearInterval(countdown); endByTime(); }
        }, 1000);
        function endByTime() {
            if (finished || !inStage) return;
            inStage = false;
            onClear(updateAccuracy());   // 시간 종료 → 결과 화면(다른 단원 스텝과 동일)
        }

        // ----- 처치 점수 팝업 ("+15") -----
        function floatScore(amount, fromEl) {
            const sr = stage.getBoundingClientRect(), r = fromEl.getBoundingClientRect();
            const p = el("div", { class: "u5-scorepop", text: "+" + amount });
            p.style.left = (r.left + r.width / 2 - sr.left) + "px";
            p.style.top = (r.top + r.height * 0.3 - sr.top) + "px";
            stage.appendChild(p);
            setTimeout(() => p.remove(), 850);
        }

        function spawn() {
            if (!inStage || finished) return;
            const aliveCount = actors.filter(a => a.alive).length;
            if (aliveCount >= MAX_ON_SCREEN) return;
            const usedWords = new Set(actors.filter(a => a.alive).map(a => a.word));
            const wordPool = stCfg.words.filter(w => !usedWords.has(w));
            const usedSpots = actors.filter(a => a.alive).map(a => a.spot);
            const spotPool = SPOTS.filter(s => !usedSpots.includes(s));
            if (!wordPool.length || !spotPool.length) return;
            const word = wordPool[Math.floor(Math.random() * wordPool.length)];
            const spot = spotPool[Math.floor(Math.random() * spotPool.length)];
            const monKey = RETRO_MONS[Math.floor(Math.random() * RETRO_MONS.length)];
            const a = el("div", { class: "ta-foe ta-foe--monster u5-foe" });
            const wordEl = el("div", { class: "ta-foe__word", text: word });
            const sprite = el("div", { class: "ta-foe__sprite gfx-sprite",
                style: { backgroundImage: `url('assets/retro/mon/${monKey}.png')` } });
            a.appendChild(wordEl); a.appendChild(sprite);
            a.style.left = spot.x + "%"; a.style.top = spot.y + "%";
            stage.appendChild(a);
            setTimeout(() => a.classList.add("u5-foe--shown"), 30);   // 등장 연출
            actors.push({ el: a, wordEl, word, alive: true, spot, born: performance.now() });
        }

        // 마법 투사체 (기사 → 몬스터)
        function castMagic(toEl, cb) {
            const sr = stage.getBoundingClientRect();
            const kr = knight.getBoundingClientRect(), tr = toEl.getBoundingClientRect();
            const sx = kr.left + kr.width * 0.7 - sr.left, sy = kr.top + kr.height * 0.32 - sr.top;
            const tx = tr.left + tr.width / 2 - sr.left, ty = tr.top + tr.height * 0.5 - sr.top;
            const bolt = el("div", { class: "u5-bolt" });
            bolt.style.left = sx + "px"; bolt.style.top = sy + "px";
            stage.appendChild(bolt);
            bolt.animate([{ left: sx + "px", top: sy + "px", opacity: 0.5 },
                          { left: tx + "px", top: ty + "px", opacity: 1 }],
                { duration: 240, easing: "ease-in", fill: "forwards" });
            setTimeout(() => { bolt.remove(); cb && cb(); }, 250);
        }

        // 입력 중에는 강조만 (처치는 엔터로만 — 무조건 엔터 방식)
        function highlight() {
            const v = normalize(input.value);
            actors.forEach(a => a.wordEl.classList.toggle("ta-foe__word--active", !!v && a.alive && normalize(a.word).startsWith(v)));
        }
        // 엔터 = 공격: 입력 단어와 일치하는 몬스터 처치
        function attack() {
            const v = normalize(input.value);
            if (!v) return false;
            const hit = actors.filter(a => a.alive && normalize(a.word) === v)[0];
            if (hit) { killFoe(hit); return true; }
            return false;
        }
        function killFoe(a) {
            a.alive = false;
            knight.classList.remove("u5-mage--cast"); void knight.offsetWidth; knight.classList.add("u5-mage--cast");
            Audio.bigCorrect && Audio.bigCorrect(4);
            clearInput();
            castMagic(a.el, () => {
                a.el.classList.add("ta-foe--dead");
                const r = a.el.getBoundingClientRect();
                emitParticles(r.left + r.width / 2, r.top + r.height / 2, 14, ["💥", "⭐", "✨", "🔥", "🟢"]);
                setTimeout(() => a.el.remove(), 350);
            });
            stClears++; cleared++;
            const gained = 20000;
            addScore(gained);
            floatScore(gained, a.el);     // +점수 팝업
            updateAccuracy();
            setTimeout(spawn, 500);       // 또 다른 곳에 재등장 (종료는 시간 제한으로만)
        }

        input.oninput = () => { if (inStage) { highlight(); attack(); } };   // 완성 즉시 자동 처치(엔터 불필요)
        // 엔터 = 공격. 한글 IME는 엔터 시 마지막 글자가 조합 중이므로
        // setTimeout(0)으로 조합이 확정된 뒤 값을 읽어 처치한다. 매칭 없으면 입력 비움.
        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                setTimeout(() => { if (inStage) { if (!attack()) clearInput(); } }, 0);
            }
        };

        // 수명 루프: 방치된 몬스터는 공격(데미지) 후 사라지고 재등장
        function tick() {
            if (finished) return;
            if (inStage) {
                const now = performance.now();
                const expired = actors.filter(a => a.alive && now - a.born >= lifeMs);
                expired.forEach(a => {
                    a.alive = false;
                    a.el.classList.add("u5-foe--attack");
                    setTimeout(() => a.el.remove(), 320);
                    // 1관문은 시간제한 방식 — 방치되면 도망(놓침)만, HP 죽음 없음
                    stMisses++; cleared++;
                    updateAccuracy();
                });
                actors = actors.filter(a => a.alive || document.body.contains(a.el));
                if (expired.length) setTimeout(spawn, 400);   // 빈자리 재등장 (종료는 시간 제한으로만)
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        inStage = true;
        spawn(); spawn(); spawn(); spawn();   // 시작 시 여러 마리 출몰
        spawnTimer = setInterval(spawn, stCfg.spawnIntervalMs);
        focusInput();
    }

    // ============================================================
    //  단계 4 (신규): 잠든 공주 — 마법주문서(긴 문장)를 30초 안에 작성
    //  · 시작 전 필수 안내 모달 → 타이핑 → 완성하면 공주 깨어남, 시간초과 실패
    // ============================================================
    function runScrollStage(stCfg, onClear) {
        input.disabled = true; inputBar.style.display = "none";   // 전용 입력칸 사용
        stClears = 0; stMisses = 0;
        const SPELL = stCfg.spell;
        const tgtN = normalize(SPELL);
        const TIME_LIMIT = stCfg.timeLimit || 30;

        // ----- 필수 안내 모달 -----
        function showIntro(cb) {
            const modal = el("div", { class: "ta-story ta-story--pixel u5-scroll-intro" },
                el("div", { class: "ta-story__scene" },
                    el("div", { class: "u5-story-actor u5-story-actor--princess gfx-sprite",
                        style: { backgroundImage: "url('assets/unit5/princess.svg')" } })),
                el("h1", { class: "ta-story__title", text: "잠든 공주" }),
                el("div", { class: "ta-story__sub", text: "4관문 · 마법주문서" }),
                el("p", { class: "ta-story__text", text:
                    `괴물의 마법에 공주가 깊은 잠에 빠졌어요!\n공주를 깨우려면 마법주문서를 완성해야 해요.\n⏱ ${TIME_LIMIT}초 안에 주문서를 정확히 입력하세요.\n괴물이 오기 전에 끝내야 합니다!` }),
            );
            const btn = el("button", { class: "btn btn--big ta-story__cta", text: "📜 주문서 작성 시작!",
                on: { click: () => { modal.classList.add("ta-story--out"); setTimeout(() => { modal.remove(); cb && cb(); }, 350); } } });
            modal.appendChild(btn);
            screen.appendChild(modal);
            Audio.roundStart && Audio.roundStart();
        }

        // ----- 주문서 작성 -----
        function startWriting() {
            const board = el("div", { class: "u5-scroll" });
            const head = el("div", { class: "u5-scroll__head", text: "📜 마법주문서를 정확히 작성하라" });
            const textBox = el("div", { class: "u5-scroll__text" });
            const progWrap = el("div", { class: "u5-scroll__prog" });
            const progFill = el("div", { class: "u5-scroll__progfill" });
            progWrap.appendChild(progFill);
            const inp = el("input", { class: "u5-scroll__input",
                attrs: { type: "text", placeholder: "여기에 주문서를 입력하세요…", autocomplete: "off", spellcheck: "false" } });
            board.appendChild(head); board.appendChild(textBox); board.appendChild(progWrap); board.appendChild(inp);
            stage.appendChild(board);

            // 다가오는 괴물 (시간이 줄수록 공주에게 접근)
            const foe = el("div", { class: "u5-scroll__foe gfx-sprite",
                style: { backgroundImage: "url('assets/retro/mon/bat.png')" } });
            stage.appendChild(foe);

            let secsLeft = TIME_LIMIT;
            const timerEl = el("div", { class: "u5-timer" });
            function updateTimer() { timerEl.innerHTML = `⏱ <b>${Math.max(0, secsLeft)}</b>초`; timerEl.classList.toggle("u5-timer--low", secsLeft <= 10); }
            stage.appendChild(timerEl); updateTimer();

            function renderText(matched, errorAt) {
                textBox.innerHTML = "";
                let ns = 0;
                for (const c of SPELL) {
                    const isSpace = /\s/.test(c);
                    let cls = "u5-ch";
                    if (isSpace) {
                        if (ns < matched) cls += " u5-ch--done";
                    } else {
                        if (ns < matched) cls += " u5-ch--done";
                        else if (ns === errorAt) cls += " u5-ch--wrong";
                        ns++;
                    }
                    textBox.appendChild(el("span", { class: cls, text: c }));
                }
            }
            renderText(0, -1);

            let doneFlag = false;
            inp.oninput = () => {
                if (doneFlag) return;
                const valN = normalize(inp.value);
                let matched = 0;
                while (matched < valN.length && matched < tgtN.length && valN[matched] === tgtN[matched]) matched++;
                const hasError = valN.length > matched && matched < tgtN.length;   // 틀린 글자 입력
                renderText(matched, hasError ? matched : -1);
                inp.classList.toggle("u5-scroll__input--err", hasError);
                progFill.style.width = Math.round(matched / tgtN.length * 100) + "%";
                if (valN === tgtN) { doneFlag = true; succeed(secsLeft); }
            };

            const countdown = setInterval(() => {
                if (finished || doneFlag) { clearInterval(countdown); return; }
                secsLeft--; updateTimer();
                foe.style.right = (8 + (TIME_LIMIT - secsLeft) / TIME_LIMIT * 58) + "%";
                if (secsLeft <= 0) { clearInterval(countdown); fail(); }
            }, 1000);

            function succeed(left) {
                clearInterval(countdown); inp.disabled = true;
                stClears = 1; stMisses = 0;
                const base = 650000, timeBonus = Math.max(0, left) * 4000;   // 완성 점수 + 남은 1초당 4000점
                addScore(base + timeBonus);
                showBanner("✨ 공주가 깨어났다!", `완성 +${base}점  ·  ⏱ 남은 ${left}초 보너스 +${timeBonus}점`, () => onClear(100), 2400);
            }
            function fail() {
                if (finished) return;
                inp.disabled = true;
                const over = el("div", { class: "ta-gameover" },
                    el("div", { class: "ta-gameover__icon", text: "😴" }),
                    el("h1", { class: "ta-gameover__title", text: "시간 초과…" }),
                    el("p", { class: "ta-gameover__text", text: "주문서를 완성하지 못해 공주가 깨어나지 못했어요. 다시 도전!" }),
                );
                over.appendChild(el("button", { class: "btn btn--big", text: "🔄 다시 도전", on: { click: () => { over.remove(); restart(); } } }));
                over.appendChild(el("button", { class: "btn btn--ghost", text: "🏠 홈으로", style: { marginTop: "8px" }, on: { click: () => finishToResults() } }));
                screen.appendChild(over);
                Audio.wrong && Audio.wrong();
            }

            setTimeout(() => inp.focus(), 120);
        }

        inStage = true;
        showIntro(() => startWriting());
    }

    // ============================================================
    //  단계 3 (신규): 성 내부 난전 — 통로·하늘 곳곳에 다수 출몰, 타자로 처치
    //  · 캐릭터는 가운데 뒷모습(1인칭 느낌)으로 마법을 쏨
    // ============================================================
    function runHallStage(stCfg, onClear) {
        let actors = [];
        stClears = 0; stMisses = 0;
        const GROUND_MONS = ["slime", "slime2", "snake", "frog", "mushroom"];   // 지상형
        const AIR_MONS = ["bat"];                                               // 공중형(박쥐)
        const MAX_ON_SCREEN = 10;
        const lifeMs = 12000;
        // 통로(지상) + 하늘/천장(공중) 출몰 지점 — air:true = 공중(박쥐만)
        const SPOTS = [
            { x: 8, y: 63 }, { x: 16, y: 59 }, { x: 24, y: 63 },
            { x: 38, y: 61 }, { x: 50, y: 59 }, { x: 62, y: 61 },
            { x: 76, y: 63 }, { x: 84, y: 59 }, { x: 92, y: 63 },
            { x: 20, y: 22, air: true }, { x: 32, y: 16, air: true }, { x: 44, y: 20, air: true }, { x: 56, y: 18, air: true },
            { x: 68, y: 22, air: true }, { x: 80, y: 16, air: true }, { x: 50, y: 28, air: true },
        ];

        // 캐릭터 (가운데 뒷모습)
        const knight = el("div", { class: "u5-hallmage gfx-sprite",
            style: { backgroundImage: "url('assets/retro/sprites/hero_back.png')" } });
        stage.appendChild(knight);

        // 큰 타이머
        const TIME_LIMIT = 30; let secsLeft = TIME_LIMIT;
        const timerEl = el("div", { class: "u5-timer" });
        function updateTimer() { timerEl.innerHTML = `⏱ <b>${Math.max(0, secsLeft)}</b>초`; timerEl.classList.toggle("u5-timer--low", secsLeft <= 10); }
        stage.appendChild(timerEl); updateTimer();
        const countdown = setInterval(() => {
            if (finished || !inStage) { clearInterval(countdown); return; }
            secsLeft--; updateTimer();
            if (secsLeft <= 0) { clearInterval(countdown); endByTime(); }
        }, 1000);
        function endByTime() { if (finished || !inStage) return; inStage = false; onClear(updateAccuracy()); }

        function floatScore(amount, fromEl) {
            const sr = stage.getBoundingClientRect(), r = fromEl.getBoundingClientRect();
            const p = el("div", { class: "u5-scorepop", text: "+" + amount });
            p.style.left = (r.left + r.width / 2 - sr.left) + "px"; p.style.top = (r.top + r.height * 0.3 - sr.top) + "px";
            stage.appendChild(p); setTimeout(() => p.remove(), 850);
        }

        function spawn() {
            if (!inStage || finished) return;
            if (actors.filter(a => a.alive).length >= MAX_ON_SCREEN) return;
            const usedWords = new Set(actors.filter(a => a.alive).map(a => a.word));
            const wordPool = stCfg.words.filter(w => !usedWords.has(w));
            const usedSpots = actors.filter(a => a.alive).map(a => a.spot);
            const spotPool = SPOTS.filter(s => !usedSpots.includes(s));
            if (!wordPool.length || !spotPool.length) return;
            const word = wordPool[Math.floor(Math.random() * wordPool.length)];
            const spot = spotPool[Math.floor(Math.random() * spotPool.length)];
            const pool = spot.air ? AIR_MONS : GROUND_MONS;   // 공중=박쥐, 지상=슬라임/개구리/버섯/뱀
            const monKey = pool[Math.floor(Math.random() * pool.length)];
            const a = el("div", { class: "ta-foe ta-foe--monster u5-foe" + (spot.air ? " u5-foe--air" : "") });
            const wordEl = el("div", { class: "ta-foe__word", text: word });
            const sprite = el("div", { class: "ta-foe__sprite gfx-sprite",
                style: { backgroundImage: `url('assets/retro/mon/${monKey}.png')` } });
            a.appendChild(wordEl); a.appendChild(sprite);
            a.style.left = spot.x + "%"; a.style.top = spot.y + "%";
            stage.appendChild(a);
            setTimeout(() => a.classList.add("u5-foe--shown"), 30);
            actors.push({ el: a, wordEl, word, alive: true, spot, born: performance.now() });
        }

        function castMagic(toEl, cb) {
            const sr = stage.getBoundingClientRect(), kr = knight.getBoundingClientRect(), tr = toEl.getBoundingClientRect();
            const sx = kr.left + kr.width * 0.5 - sr.left, sy = kr.top + kr.height * 0.2 - sr.top;
            const tx = tr.left + tr.width / 2 - sr.left, ty = tr.top + tr.height * 0.5 - sr.top;
            const bolt = el("div", { class: "u5-bolt" });
            bolt.style.left = sx + "px"; bolt.style.top = sy + "px"; stage.appendChild(bolt);
            bolt.animate([{ left: sx + "px", top: sy + "px", opacity: 0.5 }, { left: tx + "px", top: ty + "px", opacity: 1 }],
                { duration: 230, easing: "ease-in", fill: "forwards" });
            setTimeout(() => { bolt.remove(); cb && cb(); }, 240);
        }

        function highlight() {
            const v = normalize(input.value);
            actors.forEach(a => a.wordEl.classList.toggle("ta-foe__word--active", !!v && a.alive && normalize(a.word).startsWith(v)));
        }
        function attack() {
            const v = normalize(input.value);
            if (!v) return false;
            const hit = actors.filter(a => a.alive && normalize(a.word) === v)[0];
            if (hit) { killFoe(hit); return true; }
            return false;
        }
        function killFoe(a) {
            a.alive = false;
            knight.classList.remove("u5-hallmage--cast"); void knight.offsetWidth; knight.classList.add("u5-hallmage--cast");
            Audio.bigCorrect && Audio.bigCorrect(4);
            clearInput();
            castMagic(a.el, () => {
                a.el.classList.add("ta-foe--dead");
                const r = a.el.getBoundingClientRect();
                emitParticles(r.left + r.width / 2, r.top + r.height / 2, 12, ["💥", "⭐", "✨", "🔥"]);
                setTimeout(() => a.el.remove(), 350);
            });
            stClears++;
            const gained = 60000; addScore(gained); floatScore(gained, a.el);
            updateAccuracy();
            setTimeout(spawn, 300);
        }
        input.oninput = () => { if (inStage) { highlight(); attack(); } };   // 완성 즉시 자동 처치(엔터 불필요)
        input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); setTimeout(() => { if (inStage) { if (!attack()) clearInput(); } }, 0); } };

        function tick() {
            if (finished) return;
            if (inStage) {
                const now = performance.now();
                const expired = actors.filter(a => a.alive && now - a.born >= lifeMs);
                expired.forEach(a => { a.alive = false; a.el.classList.add("u5-foe--attack"); setTimeout(() => a.el.remove(), 320); stMisses++; updateAccuracy(); });
                actors = actors.filter(a => a.alive || document.body.contains(a.el));
                if (expired.length) setTimeout(spawn, 300);
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        inStage = true;
        for (let i = 0; i < 6; i++) spawn();      // 시작부터 다수
        spawnTimer = setInterval(spawn, 600);     // 엄청 많이
        focusInput();
    }

    // ============================================================
    //  단계 2 (신규): 성문 방어전 — 활 쏘기 (타자 아님)
    //  · 성문에서 괴물이 천천히 나와 궁수에게 접근
    //  · 방향키 ← → 조준, ↑(또는 Space) 발사. 화살로 맞히면 처치 +점수
    //  · 괴물이 궁수에 닿으면 하트 -1 (0이면 게임오버)
    //  · 60초 제한, 목표 점수 도달 시 클리어
    // ============================================================
    function runArcheryStage(stCfg, onClear) {
        input.disabled = true; inputBar.style.display = "none";
        stClears = 0; stMisses = 0;
        const W = () => stage.clientWidth, H = () => stage.clientHeight;
        const MIN = () => Math.min(W(), H());
        const RETRO_MONS = ["slime", "slime2", "snake", "frog", "bat", "mushroom"];

        let monsters = [];   // {el, x, y, alive}  (stage 기준 px)
        let arrows = [];     // {el, x, y, vx, vy, alive}
        let hearts = 5;
        let aimAngle = 0.35; // rad, 0 = 오른쪽. +면 위로 조준
        let upHeld = false, downHeld = false;
        let charging = false, chargeStart = 0;
        const MAX_CHARGE_MS = 850;   // 풀차지까지
        let earned = 0;      // 이 관문에서 번 점수 (목표 도달 판정)

        const archerPos = () => ({ x: W() * 0.12, y: H() * 0.72 });
        // 몬스터는 바닥(오른쪽 마당)에서 솟아남
        const floorSpawn = () => ({
            x: W() * (0.52 + Math.random() * 0.40),
            y: H() * (0.55 + Math.random() * 0.30),
        });

        // 궁수
        const archer = el("div", { class: "u5-archer gfx-sprite",
            style: { backgroundImage: "url('assets/retro/sprites/hero_knight.png')" } });
        stage.appendChild(archer);
        // 조준선
        const aim = el("div", { class: "u5-aim" });
        stage.appendChild(aim);
        // 활 (조준 방향으로 회전)
        const bow = el("div", { class: "u5-bow" });
        stage.appendChild(bow);
        // 파워 게이지 (스페이스 누르는 동안 충전)
        const chargeFill = el("div", { class: "u5-charge__fill" });
        const chargeWrap = el("div", { class: "u5-charge" }, chargeFill);
        stage.appendChild(chargeWrap);
        // 하트
        const heartsEl = el("div", { class: "u5-hearts" });
        stage.appendChild(heartsEl);
        function renderHearts() {
            heartsEl.innerHTML = "";
            for (let i = 0; i < 5; i++) heartsEl.appendChild(el("span", { class: "u5-heart" + (i < hearts ? "" : " u5-heart--empty"), text: "❤️" }));
        }
        renderHearts();
        // 조작 안내
        stage.appendChild(el("div", { class: "u5-archery-hint", text: "↑ ↓ 조준   ·   Space 꾹! 길게 누를수록 멀리" }));

        // 큰 타이머
        const TIME_LIMIT = 30;
        let secsLeft = TIME_LIMIT;
        const timerEl = el("div", { class: "u5-timer" });
        function updateTimer() {
            timerEl.innerHTML = `⏱ <b>${Math.max(0, secsLeft)}</b>초`;
            timerEl.classList.toggle("u5-timer--low", secsLeft <= 10);
        }
        stage.appendChild(timerEl); updateTimer();
        const countdown = setInterval(() => {
            if (finished || !inStage) { clearInterval(countdown); return; }
            secsLeft--; updateTimer();
            if (secsLeft <= 0) { clearInterval(countdown); endStage(); }
        }, 1000);

        function placeArcher() {
            const p = archerPos();
            archer.style.left = p.x + "px"; archer.style.top = p.y + "px";
            chargeWrap.style.left = p.x + "px"; chargeWrap.style.top = (p.y - 58) + "px";
        }
        function updateAim() {
            const p = archerPos();
            const deg = -aimAngle * 180 / Math.PI;
            aim.style.left = p.x + "px"; aim.style.top = p.y + "px";
            aim.style.transform = `rotate(${deg}deg)`;
            // 활: 궁수 앞쪽(조준 방향)으로 28px 띄워 배치 + 같은 각도 회전
            const fx = Math.cos(aimAngle), fy = -Math.sin(aimAngle);
            bow.style.left = (p.x + fx * 28) + "px"; bow.style.top = (p.y + fy * 28) + "px";
            bow.style.transform = `translate(-50%,-50%) rotate(${deg}deg)`;
        }
        placeArcher(); updateAim();

        function floatScore(amount, x, y) {
            const p = el("div", { class: "u5-scorepop", text: "+" + amount });
            p.style.left = x + "px"; p.style.top = y + "px";
            stage.appendChild(p); setTimeout(() => p.remove(), 850);
        }

        function spawn() {
            if (!inStage || finished) return;
            if (monsters.filter(m => m.alive).length >= 18) return;
            const g = floorSpawn();
            const monKey = RETRO_MONS[Math.floor(Math.random() * RETRO_MONS.length)];
            const m = el("div", { class: "ta-foe ta-foe--monster u5-foe u5-amon" });
            const sprite = el("div", { class: "ta-foe__sprite gfx-sprite",
                style: { backgroundImage: `url('assets/retro/mon/${monKey}.png')` } });
            m.appendChild(sprite);
            const sx = g.x, sy = g.y;
            m.style.left = sx + "px"; m.style.top = sy + "px";
            stage.appendChild(m);
            setTimeout(() => m.classList.add("u5-foe--shown"), 30);
            monsters.push({ el: m, x: sx, y: sy, alive: true });
        }

        function shoot(power) {
            const p = archerPos();
            const dx = Math.cos(aimAngle), dy = -Math.sin(aimAngle);
            const minS = Math.max(W(), H()) * 0.55, maxS = Math.max(W(), H()) * 1.3;
            const speed = minS + Math.max(0, Math.min(1, power)) * (maxS - minS);
            const a = el("div", { class: "u5-arrow" });
            a.style.left = p.x + "px"; a.style.top = p.y + "px";
            a.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
            stage.appendChild(a);
            arrows.push({ el: a, x: p.x, y: p.y, vx: dx * speed, vy: dy * speed, alive: true });
            archer.classList.remove("u5-archer--shoot"); void archer.offsetWidth; archer.classList.add("u5-archer--shoot");
            bow.classList.remove("u5-bow--shoot"); void bow.offsetWidth; bow.classList.add("u5-bow--shoot");
            Audio.tick && Audio.tick();
        }

        function killMonster(m) {
            m.alive = false;
            m.el.classList.add("ta-foe--dead");
            const r = m.el.getBoundingClientRect();
            emitParticles(r.left + r.width / 2, r.top + r.height / 2, 12, ["💥", "⭐", "✨", "🏹"]);
            setTimeout(() => m.el.remove(), 350);
            stClears++;
            const gained = 30000;
            earned += gained; addScore(gained);
            const sr = stage.getBoundingClientRect();
            floatScore(gained, r.left + r.width / 2 - sr.left, r.top - sr.top);
            Audio.bigCorrect && Audio.bigCorrect(4);
            if (earned >= goalScore) winStage();
        }

        // 키 입력 (방향키)
        function onKey(e) {
            if (!document.body.contains(stage)) { stopInputs(); return; }
            if (!inStage || finished) return;
            if (e.key === "ArrowUp") { upHeld = true; e.preventDefault(); }
            else if (e.key === "ArrowDown") { downHeld = true; e.preventDefault(); }
            else if (e.key === " " || e.key === "Spacebar") { if (!charging) { charging = true; chargeStart = performance.now(); } e.preventDefault(); }
        }
        function onKeyUp(e) {
            if (e.key === "ArrowUp") upHeld = false;
            else if (e.key === "ArrowDown") downHeld = false;
            else if (e.key === " " || e.key === "Spacebar") {
                if (charging) { shoot(Math.min(1, (performance.now() - chargeStart) / MAX_CHARGE_MS)); charging = false; }
                e.preventDefault();
            }
        }
        function stopInputs() { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); }
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKeyUp);

        function accuracy() { const tot = stClears + stMisses; return tot === 0 ? 100 : Math.round(stClears / tot * 100); }
        function endStage() { if (finished || !inStage) return; inStage = false; stopInputs(); onClear(accuracy()); }
        function winStage() {
            if (finished || !inStage) return;
            inStage = false; stopInputs();
            // 목표 점수 조기 달성 → 남은 시간만큼 보너스 (1초당 10점)
            const left = Math.max(0, secsLeft);
            const bonus = left * 5000;
            if (bonus > 0) {
                addScore(bonus);
                showBanner(`⏱ 시간 보너스 +${bonus}점!`, `남은 ${left}초 × 5000점`, () => onClear(accuracy()), 1900);
            } else {
                onClear(accuracy());
            }
        }

        // 루프
        let last = performance.now();
        function tick(t) {
            if (finished) return;
            const dt = Math.min(50, t - last) / 1000; last = t;
            if (inStage) {
                // 조준 회전
                const rot = 2.2;
                if (upHeld) aimAngle = Math.min(1.2, aimAngle + rot * dt);
                if (downHeld) aimAngle = Math.max(-0.5, aimAngle - rot * dt);
                placeArcher();   // 매 프레임 재배치 → 창 크기 바뀌어도 궁수·조준·활 같이 이동
                updateAim();
                // 파워 게이지 (충전 중)
                if (charging) {
                    const pw = Math.min(1, (performance.now() - chargeStart) / MAX_CHARGE_MS);
                    chargeWrap.style.opacity = "1";
                    chargeFill.style.width = (pw * 100) + "%";
                    chargeFill.style.background = pw >= 1 ? "#ff5a5a" : "linear-gradient(90deg,#9be08a,#ffe06a)";
                } else if (chargeWrap.style.opacity !== "0") {
                    chargeWrap.style.opacity = "0"; chargeFill.style.width = "0%";
                }
                // 몬스터 이동 (궁수쪽으로 아주 천천히)
                const ap = archerPos();
                const mspeed = MIN() * 0.10125;   // 또 1.5배 (총 2.25배)
                const touchR = MIN() * 0.075;
                monsters.forEach(m => {
                    if (!m.alive) return;
                    const dx = ap.x - m.x, dy = ap.y - m.y, d = Math.hypot(dx, dy) || 1;
                    m.x += dx / d * mspeed * dt; m.y += dy / d * mspeed * dt;
                    m.el.style.left = m.x + "px"; m.el.style.top = m.y + "px";
                    if (d < touchR) {   // 궁수에 붙음 — 데미지 표시만, 게임오버 없음(종료는 시간/목표로만)
                        m.alive = false; m.el.remove();
                        if (hearts > 0) { hearts--; renderHearts(); }
                        archer.classList.remove("u5-archer--hurt"); void archer.offsetWidth; archer.classList.add("u5-archer--hurt");
                        Audio.wrong && Audio.wrong();
                    }
                });
                monsters = monsters.filter(m => m.alive || document.body.contains(m.el));
                // 화살 이동 + 충돌
                const hitR = MIN() * 0.06;
                const grav = H() * 1.9;   // 중력 ↑ → 포물선이 더 둥그스름하게(직선X)
                arrows.forEach(a => {
                    if (!a.alive) return;
                    a.vy += grav * dt;
                    a.x += a.vx * dt; a.y += a.vy * dt;
                    a.el.style.left = a.x + "px"; a.el.style.top = a.y + "px";
                    a.el.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(a.vy, a.vx) * 180 / Math.PI}deg)`;
                    if (a.x < -50 || a.x > W() + 50 || a.y > H() + 60) { a.alive = false; a.el.remove(); stMisses++; return; }
                    for (const m of monsters) {
                        if (!m.alive) continue;
                        if (Math.hypot(a.x - m.x, a.y - m.y) < hitR) { a.alive = false; a.el.remove(); killMonster(m); break; }
                    }
                });
                arrows = arrows.filter(a => a.alive);
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        inStage = true;
        spawn();
        spawnTimer = setInterval(spawn, 870);   // 몬스터 3배 (동시 18 / 스폰 빠르게)
    }

    // ============================================================
    //  단계 2: 통곡의 성벽 — 떨어지는 단어로 성벽 파괴
    // ============================================================
    function runWallStage(stCfg, onClear) {
        let words = [];   // {el, y, word, alive}
        let wallHp = stCfg.wallHp;
        let combo = 0;
        stClears = 0; stMisses = 0;

        const wall = el("div", { class: "ta-wall" },
            el("div", { class: "ta-wall__hpbar" }, el("div", { class: "ta-wall__hpfill" })),
            el("div", { class: "ta-wall__label", text: "성벽 내구도" }),
        );
        stage.appendChild(wall);
        const wallFill = wall.querySelector(".ta-wall__hpfill");
        const comboBadge = el("div", { class: "ta-combo" });
        stage.appendChild(comboBadge);

        function updateWall() {
            const pct = Math.max(0, (wallHp / stCfg.wallHp) * 100);
            wallFill.style.width = `${pct}%`;
        }
        function showCombo() {
            if (combo >= 2) { comboBadge.textContent = `🔥 ${combo} 콤보! (×2 데미지)`; comboBadge.classList.add("ta-combo--on"); }
            else comboBadge.classList.remove("ta-combo--on");
        }

        function spawn() {
            if (!inStage || finished) return;
            const word = stCfg.words[Math.floor(Math.random() * stCfg.words.length)];
            if (words.some(w => w.alive && w.word === word)) return;
            const w = el("div", { class: "ta-fallword", text: word });
            const areaW = stage.clientWidth;
            w.style.left = `${30 + Math.random() * Math.max(20, areaW - 220)}px`;
            w.style.top = `-40px`;
            stage.appendChild(w);
            words.push({ el: w, y: -40, word, alive: true });
        }
        function check() {
            const v = normalize(input.value);
            if (!v) { words.forEach(w => w.el.classList.remove("ta-fallword--active")); return; }
            words.forEach(w => w.el.classList.toggle("ta-fallword--active", w.alive && normalize(w.word).startsWith(v)));
            const hit = words.filter(w => w.alive && normalize(w.word) === v).sort((a, b) => b.y - a.y)[0];
            if (hit) {
                hit.alive = false; hit.el.classList.add("ta-fallword--hit");
                const r = hit.el.getBoundingClientRect();
                emitParticles(r.left + r.width / 2, r.top, 10, ["💥","🧱","✨"]);
                setTimeout(() => hit.el.remove(), 300);
                combo++; showCombo();
                const dmg = 100 * (combo >= 2 ? stCfg.comboMult : 1);
                wallHp -= dmg; updateWall();
                stClears++; addScore(15);
                updateAccuracy(); clearInput();
                Audio.bigCorrect && Audio.bigCorrect(Math.min(8, 3 + combo));
                wall.classList.remove("ta-wall--hit"); void wall.offsetWidth; wall.classList.add("ta-wall--hit");
                if (wallHp <= 0) { wallHp = 0; updateWall(); setTimeout(() => onClear(updateAccuracy()), 500); }
            }
        }
        input.oninput = () => { if (inStage) check(); };
        input.onkeydown = (e) => { if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); check(); } };

        let last = performance.now();
        function tick(t) {
            if (finished) return;
            const dt = Math.min(50, t - last) / 1000; last = t;
            if (inStage) {
                const speed = stage.clientHeight / (stCfg.fallMs / 1000);
                const floor = stage.clientHeight - 70;
                words = words.filter(w => {
                    if (!w.alive) return false;
                    w.y += speed * dt; w.el.style.top = `${w.y}px`;
                    if (w.y >= floor) {
                        w.alive = false; w.el.remove();
                        combo = 0; showCombo(); stMisses++; updateAccuracy();
                        return false;
                    }
                    return true;
                });
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);
        updateWall();
        inStage = true;
        spawn(); spawnTimer = setInterval(spawn, stCfg.spawnIntervalMs);
        focusInput();
    }

    // ============================================================
    //  단계 4: 최종 보스전 (액션 — 타이핑 없음)
    // ============================================================
    function runBossStage(stCfg, onWin) {
        input.disabled = true; inputBar.style.display = "none";

        // 무기 10종 — 위로 갈수록 강해짐 (cd↓ 발사빠름, arrows↑ 갯수, dmg↑ 위력)
        const WEAPONS = [
            { name: "화살",             icon: "🏹", cd: 300, arrows: 1, lasers: 0, big: false, dmg: 3,  color: "#ffe9b0" },
            { name: "화살 2발",         icon: "🏹", cd: 300, arrows: 2, lasers: 0, big: false, dmg: 3,  color: "#ffe9b0" },
            { name: "화살 3발",         icon: "🏹", cd: 300, arrows: 3, lasers: 0, big: false, dmg: 3,  color: "#ffe9b0" },
            { name: "레이저",           icon: "🔦", cd: 380, arrows: 0, lasers: 1, big: false, dmg: 5,  color: "#8fd0ff" },
            { name: "레이저 2단",       icon: "🔦", cd: 380, arrows: 0, lasers: 2, big: false, dmg: 5,  color: "#8fd0ff" },
            { name: "레이저 3단",       icon: "🔦", cd: 360, arrows: 0, lasers: 3, big: false, dmg: 6,  color: "#8fd0ff" },
            { name: "레이저3단+화살3",  icon: "✨", cd: 340, arrows: 3, lasers: 3, big: false, dmg: 6,  color: "#b8a0ff" },
            { name: "대형 레이저",      icon: "💥", cd: 460, arrows: 0, lasers: 1, big: true,  dmg: 12, color: "#ff5aa0" },
            { name: "대형레이저+화살3", icon: "💥", cd: 440, arrows: 3, lasers: 1, big: true,  dmg: 13, color: "#ff5aa0" },
            { name: "대형레이저+화살5", icon: "🌟", cd: 420, arrows: 5, lasers: 1, big: true,  dmg: 16, color: "#ff5aa0" },
            { name: "대형레이저2+화살6", icon: "🌟", cd: 400, arrows: 6, lasers: 2, big: true,  dmg: 18, color: "#ff5aa0" },                 // L11
            { name: "대형레이저2+화살7", icon: "🌟", cd: 360, arrows: 7, lasers: 2, big: true,  dmg: 19, color: "#ffcf5a" },                 // L12
            { name: "대형레이저3+화살7", icon: "🌟", cd: 340, arrows: 7, lasers: 3, big: true,  dmg: 21, color: "#ffcf5a" },                 // L13
            { name: "대형레이저3+화살8", icon: "🌟", cd: 320, arrows: 8, lasers: 3, big: true,  dmg: 24, color: "#ff8af0" },                 // L14
            { name: "대형레이저4+화살8", icon: "👑", cd: 300, arrows: 8, lasers: 4, big: true,  dmg: 28, color: "#ff8af0" },                 // L15
        ];
        const RETRO_MONS = ["slime", "slime2", "snake", "frog", "bat", "mushroom"];

        const attempt = state.taFinalAttempt || 0;          // 완료한 판 수 (영구)
        const runStages = [1, 2, 3].map(n => attempt * 3 + n); // 이번 판 단계 번호 (1~3 / 4~6 / 7~9 ...)
        let weaponLv = Math.min(WEAPONS.length - 1, state.taWeaponLv || 0); // 현재 무기 (영구)
        let runIdx = 0, globalStage = runStages[0];

        const lane = el("div", { class: "u5-lane u5-lane--wide" });
        stage.appendChild(lane);

        const stageBadge = el("div", { class: "u5-stagecount" });
        const weaponBadge = el("div", { class: "u5-weapon" });
        const heartsEl = el("div", { class: "u5-hearts" });
        const timerEl = el("div", { class: "u5-timer" });
        stage.appendChild(stageBadge); stage.appendChild(weaponBadge);
        stage.appendChild(heartsEl); stage.appendChild(timerEl);
        stage.appendChild(el("div", { class: "u5-archery-hint", text: "← → 이동 · Space 발사! 무기상자 🎁 부수면 더 센 무기" }));

        let hearts = 5;
        function renderHearts() { heartsEl.innerHTML = ""; for (let i = 0; i < 5; i++) heartsEl.appendChild(el("span", { class: "u5-heart" + (i < hearts ? "" : " u5-heart--empty"), text: "❤️" })); }
        function renderWeapon() {
            const w = WEAPONS[weaponLv]; weaponBadge.innerHTML = "";
            weaponBadge.appendChild(el("span", { class: "u5-weapon__ico", text: w.icon }));
            weaponBadge.appendChild(el("span", { class: "u5-weapon__lv", text: `Lv.${weaponLv + 1}` }));
            weaponBadge.appendChild(el("span", { class: "u5-weapon__name", text: w.name }));
            weaponBadge.style.borderColor = w.color;
        }
        renderHearts(); renderWeapon();

        const archer = el("div", { class: "u5-laancher gfx-sprite", style: { backgroundImage: "url('assets/retro/sprites/hero_back.png')" } });
        lane.appendChild(archer);
        let archerX = 0.5;
        function placeArcher() { archer.style.left = (archerX * 100) + "%"; }
        placeArcher();

        let arrows = [], things = [], volleyId = 0;   // volleyId: 한 번 발사(스페이스)마다 +1 → 탱크는 1발사당 1회만 피격
        let leftHeld = false, rightHeld = false, lastFire = 0, lastSpawn = 0;
        let secsLeft = 20, stageActive = false, countdown = null;

        function updateTimer() { timerEl.innerHTML = `⏱ <b>${Math.max(0, secsLeft)}</b>초`; timerEl.classList.toggle("u5-timer--low", secsLeft <= 5); }
        function clearThings() { things.forEach(t => t.el.remove()); things = []; arrows.forEach(a => a.el.remove()); arrows = []; }

        function startSubStage() {
            globalStage = runStages[runIdx];
            stageBadge.textContent = `${globalStage}단계  (${runIdx + 1}/3)`;
            secsLeft = 20; updateTimer(); stageActive = true; lastSpawn = performance.now();
            if (countdown) clearInterval(countdown);
            countdown = setInterval(() => {
                if (finished || !stageActive) { clearInterval(countdown); return; }
                secsLeft--; updateTimer();
                if (secsLeft <= 0) { clearInterval(countdown); clearSubStage(); }
            }, 1000);
        }
        function clearSubStage() {
            stageActive = false;
            if (runIdx < runStages.length - 1) {
                runIdx++;
                showBanner(`${runStages[runIdx]}단계 돌입!`, "더 강해진 적이 몰려온다!", () => { if (!finished) { clearThings(); startSubStage(); } }, 1500);
            } else {
                state.taFinalAttempt = attempt + 1; state.taWeaponLv = weaponLv; commit();   // 다음 판 + 무기 유지
                inStage = false; stopK(); if (countdown) clearInterval(countdown); onWin();
            }
        }

        function spawnWave() {
            const canChest = weaponLv < WEAPONS.length - 1;
            if (canChest && Math.random() < 0.14) {
                const c = el("div", { class: "u5-chest", text: "🎁" });
                const x = 0.12 + Math.random() * 0.76; c.style.left = (x * 100) + "%"; c.style.top = "-9%";
                lane.appendChild(c);
                things.push({ el: c, x, y: -0.09, alive: true, chest: true, hp: 4 });
            } else {
                // 단단한 몬스터: 2번/3번 맞아야 죽고 점수도 많이 줌 (모든 단계 등장, 4단계+는 점수 대폭↑)
                let mult = 1, needHits = 1;
                const rr = Math.random();
                if (rr < 0.22) { needHits = 3; mult = globalStage >= 4 ? 20 : 5; }       // 3번 맞아야 죽음
                else if (rr < 0.52) { needHits = 2; mult = globalStage >= 4 ? 10 : 3; }  // 2번 맞아야 죽음
                const cls = "u5-fallmon gfx-sprite" + (needHits === 3 ? " u5-fallmon--x20" : needHits === 2 ? " u5-fallmon--x10" : "");
                const m = el("div", { class: cls, style: { backgroundImage: `url('assets/retro/mon/${RETRO_MONS[Math.floor(Math.random() * RETRO_MONS.length)]}.png')` } });
                if (needHits > 1) m.appendChild(el("span", { class: "u5-multbadge", text: needHits + "번!" }));
                const x = 0.08 + Math.random() * 0.84; m.style.left = (x * 100) + "%"; m.style.top = "-9%";
                lane.appendChild(m);
                things.push({ el: m, x, y: -0.09, alive: true, chest: false, mult: mult, tank: needHits > 1, hitsLeft: needHits, hp: 1 });
            }
        }

        function fireWeapon() {
            const w = WEAPONS[weaponLv];
            volleyId++;                                  // 이번 발사 식별 — 탱크 몬스터는 한 발사당 1회만 피격
            if (w.arrows > 0) {                          // 화살 (퍼지게)
                const n = w.arrows, spread = 0.09;
                for (let i = 0; i < n; i++) {
                    const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
                    const a = el("div", { class: "u5-uparrow" });
                    a.style.left = ((archerX + off) * 100) + "%"; a.style.top = "85%";
                    a.style.background = `linear-gradient(180deg,#fff,${w.color})`;
                    lane.appendChild(a);
                    arrows.push({ el: a, x: archerX + off, y: 0.85, vx: off * 0.7, dmg: w.dmg, alive: true, vol: volleyId });
                }
            }
            if (w.lasers > 0) {                          // 레이저 (즉발 빔)
                const n = w.lasers, spread = w.big ? 0.26 : 0.18;
                for (let i = 0; i < n; i++) {
                    const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
                    fireLaser(archerX + off, w.big, w.dmg, volleyId);
                }
            }
            Audio.tick && Audio.tick();
        }
        function fireLaser(x, big, dmg, vol) {
            x = Math.max(0.03, Math.min(0.97, x));
            const beam = el("div", { class: "u5-laser" + (big ? " u5-laser--big" : "") });
            beam.style.left = (x * 100) + "%";
            lane.appendChild(beam);
            setTimeout(() => beam.remove(), 200);
            const halfW = (big ? 0.13 : 0.05) + 0.045;   // 빔 폭 + 몬스터 반폭
            things.forEach(th => {
                if (!th.alive) return;
                if (Math.abs(th.x - x) < halfW) {
                    th.el.classList.remove("u5-hit"); void th.el.offsetWidth; th.el.classList.add("u5-hit");
                    if (damageThing(th, dmg, vol)) killThing(th);
                }
            });
        }
        // 한 발 맞을 때 데미지 처리 — 단단한 몬스터(tank)는 무기 위력과 무관하게 정해진 횟수만큼 "발사"를 맞아야 죽음
        // (레이저 여러 줄기·화살 여러 발이 같은 발사(vol)에 동시에 맞아도 1회로만 친다)
        function damageThing(th, dmg, vol) {
            if (th.tank) {
                if (vol != null && th.lastVol === vol) return false;   // 같은 발사로는 중복 피격 안 함
                th.lastVol = vol; th.hitsLeft -= 1; return th.hitsLeft <= 0;
            }
            th.hp -= dmg; return th.hp <= 0;
        }

        function killThing(t) {
            t.alive = false;
            const r = t.el.getBoundingClientRect();
            if (t.chest) {
                weaponLv = Math.min(WEAPONS.length - 1, weaponLv + 1);
                state.taWeaponLv = weaponLv; commit();   // 무기 획득 즉시 영구 저장
                renderWeapon();
                emitParticles(r.left + r.width / 2, r.top + r.height / 2, 16, ["🎁", "✨", "⭐", "💫"]);
                const get = el("div", { class: "u5-weaponget", text: `🎉 ${WEAPONS[weaponLv].name} 획득!` });
                stage.appendChild(get); setTimeout(() => get.remove(), 1500);
                Audio.bigCorrect && Audio.bigCorrect(8);
            } else {
                emitParticles(r.left + r.width / 2, r.top + r.height / 2, 10, ["💥", "⭐", "✨", "🔥"]);
                const stageMult = globalStage >= 7 ? 3 : 1;   // 7단계부터 획득 점수 3배
                addScore(30000 * (t.mult || 1) * stageMult); Audio.bigCorrect && Audio.bigCorrect(3);
            }
            t.el.classList.add("u5-fallmon--dead");
            setTimeout(() => t.el.remove(), 280);
        }

        function onKey(e) {
            if (!document.body.contains(lane)) { stopK(); return; }
            if (!inStage || finished) return;
            if (e.key === "ArrowLeft") { leftHeld = true; e.preventDefault(); }
            else if (e.key === "ArrowRight") { rightHeld = true; e.preventDefault(); }
            else if (e.key === " " || e.key === "Spacebar") {   // Space로 발사 (자동발사 X)
                e.preventDefault();
                const w = WEAPONS[weaponLv], now = performance.now();
                if (now - lastFire >= w.cd) { fireWeapon(); lastFire = now; }
            }
        }
        function onKeyUp(e) { if (e.key === "ArrowLeft") leftHeld = false; else if (e.key === "ArrowRight") rightHeld = false; }
        function stopK() { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); }
        window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp);

        let last = performance.now();
        function tick(t) {
            if (finished) return;
            const dt = Math.min(50, t - last) / 1000; last = t;
            if (inStage && stageActive) {
                const mv = 1.0;
                if (leftHeld) archerX = Math.max(0.05, archerX - mv * dt);
                if (rightHeld) archerX = Math.min(0.95, archerX + mv * dt);
                placeArcher();
                const spawnCd = Math.max(360, 820 - globalStage * 55);
                if (t - lastSpawn >= spawnCd) { spawnWave(); if (globalStage >= 7) spawnWave(); lastSpawn = t; }   // 7단계+ 2배
                const fallSpd = 0.17 + globalStage * 0.011;
                arrows.forEach(a => {
                    if (!a.alive) return;
                    a.y -= 1.5 * dt; a.x += a.vx * dt;
                    a.el.style.top = (a.y * 100) + "%"; a.el.style.left = (a.x * 100) + "%";
                    if (a.y < -0.05 || a.x < -0.05 || a.x > 1.05) { a.alive = false; a.el.remove(); }
                });
                things.forEach(th => {
                    if (!th.alive) return;
                    th.y += fallSpd * dt; th.el.style.top = (th.y * 100) + "%";
                    for (const a of arrows) {
                        if (a.alive && Math.abs(a.x - th.x) < 0.07 && Math.abs(a.y - th.y) < 0.06) {
                            a.alive = false; a.el.remove();
                            th.el.classList.remove("u5-hit"); void th.el.offsetWidth; th.el.classList.add("u5-hit");
                            if (damageThing(th, a.dmg, a.vol)) { killThing(th); break; }
                        }
                    }
                    if (th.alive && th.y > 0.92) {
                        th.alive = false; th.el.remove();
                        if (!th.chest) {
                            if (hearts > 0) { hearts--; renderHearts(); }
                            archer.classList.remove("u5-laancher--hurt"); void archer.offsetWidth; archer.classList.add("u5-laancher--hurt");
                            Audio.wrong && Audio.wrong();
                            if (hearts <= 0) { stageActive = false; inStage = false; stopK(); if (countdown) clearInterval(countdown); gameOver(); }
                        }
                    }
                });
                arrows = arrows.filter(a => a.alive);
                things = things.filter(th => th.alive || document.body.contains(th.el));
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        inStage = true;
        startSubStage();
    }

    // ============================================================
    //  진행 제어
    // ============================================================
    function startStage(idx) {
        stageIndex = idx;
        const st = cfg.stages[idx];
        stageEl.textContent = st.name;
        stage.className = "ta-stage ta-stage--" + st.type;
        stage.innerHTML = "";
        input.disabled = false; input.value = "";
        clearTimers();
        // 보스(최종장)는 cfg.stages 인덱스(4단계)가 아니라 실제 진행 중인 서브단계(1~9)를 표기
        let bannerTitle = `${idx + 1}단계 — ${st.name}`;
        if (st.type === "boss") {
            const s0 = (state.taFinalAttempt || 0) * 3 + 1;
            bannerTitle = `${st.name}  (${s0}~${s0 + 2}단계)`;
        }
        showBanner(bannerTitle, st.story, () => {
            if (st.type === "boss") {
                runBossStage(st, () => onStageDone(st, 100));
            } else if (st.id === 1) {
                runSwampStage(st, (acc) => onStageDone(st, acc));
            } else if (st.id === 2) {
                runArcheryStage(st, (acc) => onStageDone(st, acc));
            } else if (st.id === 3) {
                runHallStage(st, (acc) => onStageDone(st, acc));
            } else if (st.type === "scroll") {
                runScrollStage(st, (acc) => onStageDone(st, acc));
            } else if (st.type === "wall") {
                runWallStage(st, (acc) => onStageDone(st, acc));
            } else {
                runApproachStage(st, (acc) => onStageDone(st, acc));
            }
        }, 2200);
    }

    function onStageDone(st, acc) {
        inStage = false;
        clearTimers();
        if (st.type === "boss") { winAdventure(); return; }
        if (st.type === "scroll") { finishToResults(); return; }   // 주문서 관문 — 보상 없이 결과로
        const grade = gradeFromAcc(acc);
        weapons[st.weapon] = grade;
        // 무기 등급을 state에 저장 → 다음 관문/보스전에서 사용
        state.taWeapons = Object.assign({}, weapons);
        commit();
        // 정확도/속도 보너스
        addScore(acc * 800 + (grade === "S" ? 150000 : grade === "A" ? 75000 : 0));
        showWeaponReward(st, grade, () => finishToResults());   // 이 관문만 끝 → 결과로
    }

    function winAdventure() {
        if (finished) return;
        finished = true;
        clearTimers();
        addScore(800000);   // 보스 처치 보너스
        const ending = el("div", { class: "ta-ending" },
            el("div", { class: "ta-ending__scene" },
                el("div", { class: "ta-actor ta-actor--knight gfx-sprite", style: { backgroundImage: "url('assets/unit5/knight.svg')" } }),
                el("div", { class: "ta-ending__heart", text: "💖" }),
                el("div", { class: "ta-actor ta-actor--princess gfx-sprite", style: { backgroundImage: "url('assets/unit5/princess.svg')" } }),
            ),
            el("h1", { class: "ta-ending__title", text: "🎉 공주 구출 성공!" }),
            el("p", { class: "ta-ending__text", text: `획득 무기 — 검 ${weapons.sword}등급 · 활 ${weapons.bow}등급 · 총 ${weapons.gun}등급\n타자 원정대의 위대한 승리!` }),
        );
        const btn = el("button", { class: "btn btn--big", text: "🏆 결과 보기",
            on: { click: () => finishToResults() } });
        ending.appendChild(btn);
        screen.appendChild(ending);
        Audio.gameOver && Audio.gameOver();
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        for (let i = 0; i < 5; i++) setTimeout(() => emitParticles(cx + (Math.random()-0.5)*200, cy, 16, ["✨","⭐","🌟","💖","🎉","👑"]), i * 200);
    }

    function gameOver() {
        if (finished) return;
        finished = true;
        clearTimers();
        const over = el("div", { class: "ta-gameover" },
            el("div", { class: "ta-gameover__icon", text: "💀" }),
            el("h1", { class: "ta-gameover__title", text: "기사가 쓰러졌다…" }),
            el("p", { class: "ta-gameover__text", text: "공주를 구하지 못했어요. 다시 도전해보세요!" }),
        );
        const retry = el("button", { class: "btn btn--big", text: "🔄 다시 도전",
            on: { click: () => { over.remove(); restart(); } } });
        const home = el("button", { class: "btn btn--ghost", text: "🏠 홈으로", style: { marginTop: "8px" },
            on: { click: () => finishToResults() } });
        over.appendChild(retry); over.appendChild(home);
        screen.appendChild(over);
        Audio.wrong && Audio.wrong();
    }

    function restart() {
        finished = false; inStage = false;
        score = startingScore; knightHp = cfg.knightMaxHp;
        weapons = Object.assign({ sword: "B", bow: "B", gun: "B" }, state.taWeapons || {});
        input.disabled = false; inputBar.style.display = "";
        updateHud();
        startStage(myStage);   // 이 관문만 다시
    }

    function finishToResults() {
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        cleanup();
        navigate("results", { lessonId: params.lessonId, score, bestCombo: 0,
            leveledUp: newLevel > prevLevel, newLevel });
    }

    function clearTimers() {
        if (rafId) cancelAnimationFrame(rafId); rafId = null;
        if (spawnTimer) clearInterval(spawnTimer); spawnTimer = null;
    }
    function cleanup() {
        finished = true; inStage = false;
        clearTimers();
        input.oninput = null; input.onkeydown = null;
    }

    root.appendChild(screen);
    updateHud();

    // 디버그: 특정 단계 바로 시작 (테스트용 — params.debugStage)
    if (params.debugStage != null) {
        if (!state.taWeapons) weapons = { sword: "A", bow: "A", gun: "A" };
        startStage(myStage);
        return;
    }

    // 무기 요약 화면 (보스전 입장 전)
    function showWeaponRecap(cb) {
        const modal = el("div", { class: "ta-story" },
            el("h1", { class: "ta-story__title", text: "최종장 — 마왕 보스전" }),
            el("div", { class: "ta-story__sub", text: "획득한 무기로 마왕을 처치하라!" }),
            el("div", { class: "ta-recap" },
                el("div", { class: "ta-recap__item" }, el("div", { class: "ta-recap__icon", text: "⚔️" }),
                    el("div", { class: `ta-recap__grade ta-recap__grade--${weapons.sword}`, text: weapons.sword }), el("div", { class: "ta-recap__name", text: "검" })),
                el("div", { class: "ta-recap__item" }, el("div", { class: "ta-recap__icon", text: "🏹" }),
                    el("div", { class: `ta-recap__grade ta-recap__grade--${weapons.bow}`, text: weapons.bow }), el("div", { class: "ta-recap__name", text: "활" })),
                el("div", { class: "ta-recap__item" }, el("div", { class: "ta-recap__icon", text: "🔫" }),
                    el("div", { class: `ta-recap__grade ta-recap__grade--${weapons.gun}`, text: weapons.gun }), el("div", { class: "ta-recap__name", text: "총" })),
            ),
            el("p", { class: "ta-story__text", text: "방향키 ← → 로 움직이며 자동으로 화살을 쏜다!\n하늘에서 떨어지는 괴물을 모두 맞혀 드래곤을 쓰러뜨려라!" }),
        );
        const btn = el("button", { class: "btn btn--big ta-story__cta", text: "⚔️ 결전 시작!",
            on: { click: () => { modal.classList.add("ta-story--out"); setTimeout(() => { modal.remove(); cb && cb(); }, 350); } } });
        modal.appendChild(btn);
        screen.appendChild(modal);
    }

    // 관문별 시작 연출
    const begin = () => {
        if (myStage === 0) showStoryIntro(() => startStage(0));       // 1관문: 풀 스토리
        else if (myStage === 3) showWeaponRecap(() => startStage(3)); // 최종장: 무기 요약
        else startStage(myStage);                                     // 2·3관문: 배너만
    };
    if (!hasSeenTutorial("gameTypingAdv")) {
        showTutorial("gameTypingAdv", begin);
    } else {
        begin();
    }
};
