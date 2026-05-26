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

    // 단원 선택 칩 (프로필 패널 바깥 위쪽에 배치)
    const unitSelector = el("div", { class: "unit-selector unit-selector--top" });
    UNITS.forEach(u => {
        const chip = el("button", {
            class: `unit-chip ${u.active ? "unit-chip--active" : "unit-chip--locked"}`,
            html: u.active
                ? `<span class="unit-chip__icon">${u.icon}</span><span>${u.num}단원</span>`
                : `<span class="unit-chip__num">${u.num}단원</span><span class="unit-chip__lock">🔒</span>`,
            on: {
                click: () => {
                    if (!u.active) {
                        Audio.wrong && Audio.wrong();
                        showToast(`📚 ${u.num}단원은 준비 중이에요!\n곧 만나요 ✨`);
                    }
                },
            },
        });
        unitSelector.appendChild(chip);
    });

    const profileInfo = el("div", { class: "profile-info" },
        el("div", { class: "profile-info__name",
            text: allPassed ? "🎓 모든 스텝 통과! 졸업할 수 있어요!" : CURRENT_UNIT_TITLE }),
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

    // 명예의 전당 게시판 (인라인)
    const hallList = el("div", { class: "hall-board__list" });
    hallList.appendChild(el("div", { class: "hall-board__loading", text: "🔄 불러오는 중..." }));

    const hallBoard = el("div", { class: "hall-board" },
        el("div", { class: "hall-board__header" },
            el("span", { class: "hall-board__icon", text: "🏆" }),
            el("h2", { class: "hall-board__title", text: "명예의 전당" }),
            el("span", { class: "hall-board__sub",
                text: isSharedHallEnabled() ? "🌐 전체 공유 Top 10" : "Top 10 (로컬)" }),
        ),
        hallList,
    );

    // 비동기 로딩
    fetchHallTop(10).then(list => {
        hallList.innerHTML = "";
        if (!list || list.length === 0) {
            hallList.appendChild(el("div", {
                class: "hall-board__empty",
                text: "🌟 아직 기록이 없어요! 첫 명예의 전당 주인공이 되어보세요!",
            }));
            return;
        }
        list.forEach((entry, i) => {
            const rank = i + 1;
            const rankBadge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
            const row = el("div", { class: `hall-board__row ${rank <= 3 ? `hall-board__row--top${rank}` : ""}` },
                el("div", { class: "hall-board__rank", text: rankBadge }),
                el("div", { class: "hall-board__name", text: entry.name }),
                el("div", { class: "hall-board__lvl",
                    text: `Lv.${entry.level || "?"} · ${getLevelName(entry.level || 1)}` }),
                el("div", { class: "hall-board__score",
                    text: `${Number(entry.score).toLocaleString()}점` }),
            );
            hallList.appendChild(row);
        });
    }).catch(e => {
        hallList.innerHTML = "";
        hallList.appendChild(el("div", {
            class: "hall-board__empty",
            text: "😢 기록을 불러오지 못했어요.",
        }));
        console.warn(e);
    });

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
        // 잠금 상태 텍스트의 "N단원" → "스텝 N"로 (lesson.num 사용)
        if (!isUnlocked && statusBadge) {
            statusBadge.textContent = `🔒 ${prevLesson.num} 통과 후 열림`;
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
                    const f = freshState();
                    for (const k of Object.keys(state)) delete state[k];
                    Object.assign(state, f);
                    navigate("home");
                }
            },
        },
    });

    screen.appendChild(unitSelector);
    screen.appendChild(top);
    if (graduateBtn) screen.appendChild(graduateBtn);
    screen.appendChild(hallBoard);
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
