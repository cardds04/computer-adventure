/* ============================================================
   결과 화면
   ============================================================ */

SCREEN_RENDERERS.results = function (root, params) {
    const screen = el("div", { class: "screen results" });
    const emoji = getCurrentEmoji();
    const progress = getLevelProgress(state.points);

    // 단원 통과/졸업 여부 확인
    const lesson = LESSONS.find(l => l.id === params.lessonId);
    const passed = isLessonPassed(params.lessonId);
    const justPassed = passed && params.score >= (lesson?.goalScore || 0);
    const allPassed = areAllLessonsPassed();

    const card = el("div", { class: "results__card" },
        el("h2", { class: "results__title", text: justPassed ? "🏆 단원 통과!" : "🎉 미션 완료!" }),
        passed ? el("div", {
            style: { color: "var(--secondary-dark)", fontSize: "16px", marginBottom: "8px" },
            text: `목표 ${lesson.goalScore}점 달성!`,
        }) : el("div", {
            style: { color: "var(--text-mid)", fontSize: "16px", marginBottom: "8px" },
            text: `목표 ${lesson.goalScore}점 — ${lesson.goalScore - params.score}점 더 필요해요!`,
        }),
        el("div", { class: "results__char", text: emoji }),
        el("div", { class: "results__points-row" },
            el("div", { class: "results__stat" },
                el("div", { class: "results__stat-label", text: "이번 점수" }),
                el("div", { class: "results__stat-value", text: `${params.score}점` }),
            ),
            el("div", { class: "results__stat" },
                el("div", { class: "results__stat-label", text: "최고 콤보" }),
                el("div", { class: "results__stat-value", text: `${params.bestCombo}🔥` }),
            ),
            el("div", { class: "results__stat" },
                el("div", { class: "results__stat-label", text: "현재" }),
                el("div", { class: "results__stat-value", text: `${getCurrentLevelName()}` }),
                el("div", { style: { fontSize: "12px", color: "var(--text-light)" }, text: `Lv. ${progress.level}` }),
            ),
        ),
        el("div", {
            style: { color: "var(--text-mid)", fontSize: "16px", marginBottom: "20px" },
            text: params.leveledUp
                ? `🌟 ${getCurrentLevelName()}(으)로 진화했어요!`
                : (progress.atMax
                    ? "최고 레벨! 🏆 우주를 정복했어요!"
                    : `${getLevelName(progress.nextLevel)}까지 ${progress.needed - progress.current}점 남았어요!`),
        }),
        el("button", {
            class: "btn btn--big",
            text: allPassed ? "🎓 졸업장 받기!" : "홈으로",
            on: { click: () => navigate(allPassed ? "graduation" : "home") },
        }),
    );

    screen.appendChild(card);
    root.appendChild(screen);

    // 레벨업 효과
    if (params.leveledUp) {
        Audio.levelUp();
        const burst = el("div", { class: "level-up-burst" },
            el("div", { class: "level-up-text", text: "LEVEL UP!" }),
        );
        document.body.appendChild(burst);

        setTimeout(() => {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            emitParticles(cx, cy, 24, ["✨", "⭐", "🌟", "💫", "🎉", "🎊"]);
        }, 300);

        setTimeout(() => burst.remove(), 2600);
    }
};
