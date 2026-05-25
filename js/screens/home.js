/* ============================================================
   홈 / 단원 허브 — 순차 잠금 시스템 + 졸업
   ============================================================ */

SCREEN_RENDERERS.home = function (root) {
    const screen = el("div", { class: "screen home" });
    const progress = getLevelProgress(state.points);
    const emoji = getCurrentEmoji();
    const allPassed = areAllLessonsPassed();

    // ----- 상단: 캐릭터 패널 -----
    const avatar = el("div", { class: "profile-avatar profile-avatar--big" },
        el("span", { text: emoji }),
        el("span", { class: "profile-avatar__sparkle s1", text: "✨" }),
        el("span", { class: "profile-avatar__sparkle s2", text: "⭐" }),
    );

    const xpBar = el("div", { class: "xp-bar" },
        el("div", {
            class: "xp-bar__fill",
            style: { width: `${Math.min(100, progress.ratio * 100)}%` },
        }),
    );

    const xpLabel = el("div", {
        style: { color: "var(--text-mid)", fontSize: "13px", marginTop: "4px" },
        text: progress.atMax
            ? "최고 레벨 달성! 🎉"
            : `${getLevelName(progress.nextLevel)}까지 ${progress.needed - progress.current}점`,
    });

    const stats = el("div", { class: "profile-stats" },
        el("span", { class: "stat-chip" },
            el("span", { class: "stat-chip__label", text: "레벨" }),
            el("span", { text: `Lv. ${progress.level} · ${getCurrentLevelName()}` }),
        ),
        el("span", { class: "stat-chip" },
            el("span", { class: "stat-chip__label", text: "포인트" }),
            el("span", { text: `${state.points}점` }),
        ),
    );

    const profileInfo = el("div", { class: "profile-info" },
        el("div", { class: "profile-info__name",
            text: allPassed ? "🎓 모든 단원 통과! 졸업할 수 있어요!" : "오늘도 화이팅! 🌟" }),
        stats,
        xpBar,
        xpLabel,
    );

    const top = el("div", { class: "home__top" }, avatar, profileInfo);

    // 졸업장 받기 버튼 (모두 통과 시)
    let graduateBtn = null;
    if (allPassed) {
        graduateBtn = el("button", {
            class: "btn btn--big graduate-btn",
            text: "🎓 졸업장 받기!",
            style: { marginTop: "12px" },
            on: { click: () => navigate("graduation") },
        });
    }

    // 테스트 모드 안내
    if (BYPASS_LESSON_LOCKS) {
        const testBanner = el("div", { class: "test-mode-banner",
            text: "🎮 테스트 모드: 모든 단원 잠금 해제됨" });
        screen.appendChild(testBanner);
    }

    // ----- 단원 카드들 -----
    const grid = el("div", { class: "lessons-grid" });
    LESSONS.forEach((lesson, idx) => {
        const isUnlocked = isLessonUnlocked(idx);
        const passed = isLessonPassed(lesson.id);
        const best = state.bestScores[lesson.id] || 0;
        const prevLesson = idx > 0 ? LESSONS[idx - 1] : null;

        // 상태 뱃지
        let statusBadge;
        if (passed) {
            statusBadge = el("div", { class: "level-req level-req--passed",
                text: `🏆 통과! (목표 ${lesson.goalScore}점)` });
        } else if (isUnlocked) {
            statusBadge = el("div", { class: "level-req level-req--ok",
                text: `🎯 목표 ${lesson.goalScore}점` });
        } else {
            statusBadge = el("div", { class: "level-req level-req--locked",
                text: `🔒 ${prevLesson.num} 통과 후 열림` });
        }

        // 최고 점수 + 목표 점수 (한 줄에 비교)
        const bestChip = best > 0 ? el("div", {
            class: "stat-chip stat-chip--score",
            style: { marginTop: "10px" },
        },
            el("span", { class: "stat-chip__label", text: "최고" }),
            el("span", {
                class: passed ? "score-current score-current--passed" : "score-current",
                text: `${best.toLocaleString()}`,
            }),
            el("span", { class: "score-divider", text: "/" }),
            el("span", { class: "stat-chip__label", text: "목표" }),
            el("span", { class: "score-goal", text: `${lesson.goalScore.toLocaleString()}점` }),
        ) : null;

        // 진행 바 (목표 대비)
        const goalProgress = Math.min(1, best / lesson.goalScore);
        const goalBar = best > 0 ? el("div", {
            class: "goal-bar",
            style: { marginTop: "8px" },
        },
            el("div", {
                class: "goal-bar__fill",
                style: {
                    width: `${goalProgress * 100}%`,
                    background: passed ? "var(--secondary)" : "var(--accent)",
                },
            }),
        ) : null;

        const card = el("div", { class: `lesson-card ${isUnlocked ? "" : "locked"} ${passed ? "passed" : ""}` },
            el("div", { class: "lesson-card__icon", text: lesson.icon }),
            el("div", { class: "lesson-card__num", text: lesson.num }),
            el("div", { class: "lesson-card__title", text: lesson.title }),
            el("div", { class: "lesson-card__desc", text: lesson.desc }),
            statusBadge,
            bestChip,
            goalBar,
        );

        if (isUnlocked && lesson.game) {
            card.addEventListener("click", () => navigate(lesson.game, { lessonId: lesson.id }));
        } else if (!isUnlocked) {
            card.addEventListener("click", () => {
                Audio.wrong();
                showToast(`🔒 먼저 ${prevLesson.num}을(를) ${prevLesson.goalScore}점 이상으로 통과해야 해요!`);
            });
        }
        grid.appendChild(card);
    });

    // ----- 하단: 처음부터 다시 -----
    const resetBtn = el("button", {
        class: "btn btn--ghost",
        text: "처음부터 다시",
        style: { marginTop: "12px", fontSize: "14px", padding: "8px 18px" },
        on: {
            click: () => {
                if (confirm("점수와 진행 상황을 모두 초기화할까요?")) {
                    resetState();
                    Object.assign(state, DEFAULT_STATE);
                    navigate("home");
                }
            },
        },
    });

    screen.appendChild(top);
    if (graduateBtn) screen.appendChild(graduateBtn);
    screen.appendChild(grid);
    screen.appendChild(resetBtn);
    root.appendChild(screen);
};

// ----- 작은 토스트 알림 -----
function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = el("div", {
        class: "toast",
        style: { whiteSpace: "pre-line" },
        text: message,
    });
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translate(-50%, 20px)";
        setTimeout(() => toast.remove(), 320);
    }, 2400);
}
