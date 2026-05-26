/* ============================================================
   ui.js — 화면 라우팅 + 공통 UI 헬퍼
   ============================================================ */

const app = document.getElementById("app");
const fxLayer = document.getElementById("fx-layer");

const SCREEN_RENDERERS = {
    // 각 screens/*.js 가 자기 이름으로 등록 (예: SCREEN_RENDERERS.login)
};

function navigate(screenName, params) {
    const renderer = SCREEN_RENDERERS[screenName];
    if (!renderer) {
        console.error("unknown screen:", screenName);
        return;
    }
    // 이전 화면에서 남은 도움말 버튼/모달 정리
    document.querySelectorAll(".help-btn, .tutorial-modal, .carry-over-banner, .lvl-up-burst").forEach(n => n.remove());
    app.innerHTML = "";
    renderer(app, params || {});
}

// ----- 작은 헬퍼들 -----

function el(tag, opts = {}, ...children) {
    const e = document.createElement(tag);
    if (opts.class) e.className = opts.class;
    if (opts.id) e.id = opts.id;
    if (opts.style) Object.assign(e.style, opts.style);
    if (opts.attrs) {
        for (const [k, v] of Object.entries(opts.attrs)) {
            e.setAttribute(k, v);
        }
    }
    if (opts.text !== undefined) e.textContent = opts.text;
    if (opts.html !== undefined) e.innerHTML = opts.html;
    if (opts.on) {
        for (const [evt, fn] of Object.entries(opts.on)) {
            e.addEventListener(evt, fn);
        }
    }
    for (const child of children) {
        if (child == null) continue;
        if (typeof child === "string") e.appendChild(document.createTextNode(child));
        else e.appendChild(child);
    }
    return e;
}

// 게임 HUD용 레벨 칩 (실시간 갱신 + 레벨업 감지)
function makeLevelChip() {
    const lvlNum = el("span", { class: "hud-chip__lvl", text: "Lv.1" });
    const lvlName = el("span", { class: "hud-chip__lvlname", text: "" });
    const lvlNext = el("span", { class: "hud-chip__lvlnext", text: "" });
    const chip = el("span", { class: "hud-chip" },
        el("span", { text: "👑" }),
        lvlNum,
        lvlName,
        el("span", { class: "hud-chip__sep", text: "·" }),
        lvlNext,
    );

    let lastLevel = null;

    function update(realtimePoints) {
        const lvl = getLevelFromPoints(realtimePoints);
        const progress = getLevelProgress(realtimePoints);
        lvlNum.textContent = `Lv.${lvl}`;
        lvlName.textContent = getLevelName(lvl);
        if (progress.atMax) {
            lvlNext.textContent = "MAX!";
        } else {
            const needed = progress.needed - progress.current;
            lvlNext.textContent = `다음 +${needed}`;
        }

        const leveledUp = lastLevel !== null && lvl > lastLevel;
        lastLevel = lvl;
        if (leveledUp) showLevelUpBurst(lvl);
        return { leveledUp, level: lvl };
    }
    return { chip, update };
}

// 레벨업 시 화면 중앙에 큰 캐릭터 + 텍스트 펑! + 하단 캐릭터도 새 모습으로 변신
function showLevelUpBurst(level) {
    const emoji = getEmojiForLevel(level);
    const levelName = getLevelName(level);

    const burst = el("div", { class: "lvl-up-burst" },
        el("div", { class: "lvl-up-burst__text", text: `레벨 ${level} 달성!` }),
        el("div", { class: "lvl-up-burst__emoji", text: emoji }),
        el("div", { class: "lvl-up-burst__name", text: levelName }),
    );
    document.body.appendChild(burst);

    if (typeof Audio !== "undefined" && Audio.levelUp) Audio.levelUp();

    // 파티클도 분출
    setTimeout(() => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        emitParticles(cx, cy, 20, ["✨", "⭐", "🌟", "💫", "🎉", "🎊"]);
    }, 200);

    // 화면 하단 (또는 코너) 플레이어 캐릭터를 새 레벨 이모지로 교체 + 변신 효과
    updatePlayerCharacters(level);

    setTimeout(() => burst.remove(), 2200);
}

// 화면 캐릭터들의 이모지를 새 레벨에 맞춰 갱신
function updatePlayerCharacters(level) {
    const emoji = getEmojiForLevel(level);
    // 배경 캐릭터 (큰 워터마크) — translate 기반 애니메이션
    document.querySelectorAll(".player-character").forEach(node => {
        node.textContent = emoji;
        node.classList.add("level-up-morph");
        setTimeout(() => node.classList.remove("level-up-morph"), 900);
    });
    // 미로 안 캐릭터 — left/top 기반이라 별도 애니메이션
    document.querySelectorAll(".maze-player").forEach(node => {
        node.textContent = emoji;
        node.classList.add("maze-player--morph");
        setTimeout(() => node.classList.remove("maze-player--morph"), 900);
    });
}

// ----- 튜토리얼 (게임 방법 팝업) -----

function hasSeenTutorial(gameId) {
    try { return sessionStorage.getItem(`tut_${gameId}`) === "1"; }
    catch (e) { return false; }
}

function markTutorialSeen(gameId) {
    try { sessionStorage.setItem(`tut_${gameId}`, "1"); }
    catch (e) {}
}

function showTutorial(gameId, onClose, pauseHandler) {
    const tut = TUTORIALS[gameId];
    if (!tut) { onClose && onClose(); return; }

    // 게임 일시정지
    if (pauseHandler && pauseHandler.pause) pauseHandler.pause();

    const closeModal = () => {
        modal.classList.add("fading-out");
        setTimeout(() => {
            modal.remove();
            markTutorialSeen(gameId);
            if (pauseHandler && pauseHandler.resume) pauseHandler.resume();
            onClose && onClose();
        }, 280);
    };

    const modal = el("div", { class: "tutorial-modal" });
    const card = el("div", { class: "tutorial-card" },
        el("div", { class: "tutorial-card__header" },
            el("div", { class: "tutorial-card__icon", text: tut.icon }),
            el("div", { class: "tutorial-card__title-wrap" },
                el("div", { class: "tutorial-card__overtitle", text: "게임 방법" }),
                el("h2", { class: "tutorial-card__title", text: tut.title }),
            ),
        ),
        el("div", { class: "tutorial-card__steps" },
            ...tut.steps.map((step, i) => el("div", { class: "tutorial-step" },
                el("div", { class: "tutorial-step__num", text: `${i + 1}` }),
                el("div", { class: "tutorial-step__illu", text: step.illu }),
                el("div", { class: "tutorial-step__text", text: step.text }),
            )),
        ),
        el("button", {
            class: "btn btn--big tutorial-card__cta",
            text: "이해했어요! 다시 시작! 🚀",
            on: { click: closeModal },
        }),
    );
    modal.appendChild(card);

    // 모달 배경 클릭 시에도 닫기
    modal.addEventListener("click", (ev) => {
        if (ev.target === modal) closeModal();
    });

    document.body.appendChild(modal);
}

// 게임 화면에 우측 하단 도움말 버튼 추가 (document.body에 직접 부착해 z-index/스택 문제 회피)
function addHelpButton(screen, gameId, pauseHandler) {
    // 이전 게임에서 남은 버튼 제거
    document.querySelectorAll(".help-btn").forEach(b => b.remove());

    const btn = document.createElement("button");
    btn.className = "help-btn";
    btn.title = "게임 방법 다시 보기";
    btn.innerHTML = '<span class="help-btn__icon">❓</span><span class="help-btn__label">게임방법 다시 보기</span>';
    btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        showTutorial(gameId, null, pauseHandler);
    });
    document.body.appendChild(btn);
}

// 게임 시작 시 한 줄 안내 (예: "방향키로 미로를 통과하세요!")
// 카운트다운과 함께 화면 가운데에 투명한 큰 글씨로 잠깐 떴다가 사라짐
function showIntroInstruction(parent, text, durationMs = 2200) {
    if (!text) return;
    const banner = el("div", { class: "intro-instruction", text });
    parent.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = "0";
        banner.style.transform = "translate(-50%, -50%) scale(0.95)";
        setTimeout(() => banner.remove(), 420);
    }, durationMs);
    return banner;
}

// 게임 시작 시 이전 점수가 있으면 안내 배너 표시
function showCarryOverBanner(prevScore) {
    if (prevScore <= 0) return;
    const banner = el("div", { class: "carry-over-banner" },
        el("span", { text: `🔥 이전 점수 ` }),
        el("span", { class: "carry-over-banner__score", text: `${prevScore.toLocaleString()}점` }),
        el("span", { text: `부터 이어서!` }),
    );
    document.body.appendChild(banner);
    setTimeout(() => {
        banner.style.opacity = "0";
        banner.style.transform = "translate(-50%, -20px)";
        setTimeout(() => banner.remove(), 400);
    }, 2200);
}

function emitParticles(x, y, count, emojis) {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const distance = 60 + Math.random() * 60;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 30;
        const p = el("div", {
            class: "particle",
            style: {
                left: `${x}px`,
                top: `${y}px`,
                "--dx": `${dx}px`,
                "--dy": `${dy}px`,
            },
            text: emojis[i % emojis.length],
        });
        fxLayer.appendChild(p);
        setTimeout(() => p.remove(), 1100);
    }
}
