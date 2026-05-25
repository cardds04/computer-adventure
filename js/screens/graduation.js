/* ============================================================
   🎓 졸업장 화면
   모든 단원 통과 시 보여주는 축하 화면 + 인증서
   ============================================================ */

SCREEN_RENDERERS.graduation = function (root) {
    const screen = el("div", { class: "screen graduation" });
    const emoji = getCurrentEmoji();
    const levelName = getCurrentLevelName();
    const total = totalScoreFromBestScores();
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    // 단원별 점수 행
    const scoreRows = LESSONS.map(l => {
        const best = state.bestScores[l.id] || 0;
        return el("div", { class: "diploma-row" },
            el("span", { class: "diploma-row__icon", text: l.icon }),
            el("span", { class: "diploma-row__title", text: `${l.num} ${l.title}` }),
            el("span", { class: "diploma-row__score", text: `${best}점` }),
        );
    });

    const totalRow = el("div", { class: "diploma-row diploma-row--total" },
        el("span", { class: "diploma-row__icon", text: "⭐" }),
        el("span", { class: "diploma-row__title", text: "총 점수" }),
        el("span", { class: "diploma-row__score", text: `${total}점` }),
    );

    const diploma = el("div", { class: "diploma" },
        el("div", { class: "diploma__corner diploma__corner--tl", text: "✦" }),
        el("div", { class: "diploma__corner diploma__corner--tr", text: "✦" }),
        el("div", { class: "diploma__corner diploma__corner--bl", text: "✦" }),
        el("div", { class: "diploma__corner diploma__corner--br", text: "✦" }),

        el("div", { class: "diploma__header" },
            el("div", { class: "diploma__badge", text: "🎓" }),
            el("h1", { class: "diploma__title", text: "졸 업 장" }),
            el("div", { class: "diploma__subtitle", text: "컴퓨터 어드벤처" }),
        ),

        el("div", { class: "diploma__body" },
            el("div", { class: "diploma__intro",
                text: "위 학생은 컴퓨터 어드벤처의 모든 단원을\n성실히 마치고 우수한 성적을 거두었으므로\n이에 졸업장을 수여합니다." }),

            el("div", { class: "diploma__avatar" },
                el("div", { class: "diploma__char", text: emoji }),
                el("div", { class: "diploma__level", text: `Lv. ${getLevelFromPoints(state.points)} · ${levelName}` }),
            ),

            el("div", { class: "diploma__scores" }, ...scoreRows, totalRow),

            el("div", { class: "diploma__date", text: dateStr }),
            el("div", { class: "diploma__seal", text: "컴퓨터 어드벤처 🏛️" }),
        ),
    );

    const actions = el("div", { class: "graduation__actions" },
        el("button", {
            class: "btn btn--big",
            text: "🏠 홈으로",
            on: { click: () => navigate("home") },
        }),
        el("button", {
            class: "btn btn--secondary btn--big",
            text: "🔄 처음부터 다시",
            on: {
                click: () => {
                    if (confirm("점수와 진행 상황을 모두 초기화하고 다시 도전할까요?")) {
                        resetState();
                        Object.assign(state, DEFAULT_STATE);
                        navigate("home");
                    }
                },
            },
        }),
    );

    screen.appendChild(diploma);
    screen.appendChild(actions);
    root.appendChild(screen);

    // 축하 효과
    Audio.gameOver();
    setTimeout(() => Audio.levelUp(), 300);

    // 종이꽃 (confetti) 흩뿌리기
    const confettiEmojis = ["🎉", "🎊", "✨", "⭐", "🌟", "💫", "🌸", "🎀"];
    const spawnConfetti = () => {
        const x = Math.random() * window.innerWidth;
        const startY = -30;
        const cf = el("div", {
            class: "confetti",
            text: confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)],
            style: {
                left: `${x}px`,
                top: `${startY}px`,
                fontSize: `${20 + Math.random() * 16}px`,
                animationDuration: `${3 + Math.random() * 3}s`,
            },
        });
        document.body.appendChild(cf);
        setTimeout(() => cf.remove(), 6000);
    };
    for (let i = 0; i < 40; i++) {
        setTimeout(spawnConfetti, i * 80);
    }
    // 지속 확산
    const confettiInterval = setInterval(spawnConfetti, 400);
    setTimeout(() => clearInterval(confettiInterval), 8000);
};
