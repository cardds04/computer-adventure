/* ============================================================
   홈 / 단원 허브 — 단원 전환 + 스텝 카드 + 명예의 전당
   ============================================================ */

SCREEN_RENDERERS.home = function (root) {
    const screen = el("div", { class: "screen home" });
    const progress = getLevelProgress(state.points);
    const emoji = getCurrentEmoji();
    const currentLessons = getLessonsForUnit(state.currentUnit);
    const allPassed = areAllLessonsPassed(state.currentUnit);

    // ----- 학년 배지 (탭하면 학년 변경 = 다시 비밀번호) -----
    const gMeta = (typeof GRADES !== "undefined" && state.grade)
        ? GRADES.find(g => g.num === state.grade) : null;
    const gradeBadge = gMeta ? el("button", {
        class: "home-grade-badge",
        style: { "--grade-color": gMeta.color },
        on: { click: () => {
            if (confirm("학년을 바꾸려면 새 학년의 비밀번호가 필요해요.\n학년 선택으로 갈까요?")) {
                state.grade = null;
                commit();
                navigate("gradeSelect");
            }
        } },
        text: `${gMeta.icon} ${gMeta.label} ▾`,
    }) : null;

    // ----- 단원 선택 -----
    const unitSelector = el("div", { class: "unit-selector unit-selector--top" });
    UNITS.forEach(u => {
        const isCurrent = u.num === state.currentUnit;
        const isAvailable = u.active;
        let cls = "unit-chip";
        if (isCurrent) cls += " unit-chip--active";
        else if (!isAvailable) cls += " unit-chip--locked";
        else cls += " unit-chip--available";

        const chip = el("button", {
            class: cls,
            html: (isCurrent || isAvailable)
                ? `<span class="unit-chip__icon">${u.icon}</span><span>${u.num}단원</span>`
                : `<span class="unit-chip__num">${u.num}단원</span><span class="unit-chip__lock">🔒</span>`,
            on: {
                click: () => {
                    if (!isAvailable) {
                        Audio.wrong && Audio.wrong();
                        showToast(`📚 ${u.num}단원은 준비 중이에요!\n곧 만나요 ✨`);
                        return;
                    }
                    if (state.currentUnit !== u.num) {
                        state.currentUnit = u.num;
                        commit();
                        navigate("home");
                    }
                },
            },
        });
        unitSelector.appendChild(chip);
    });

    // ----- 프로필 패널 -----
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
            text: allPassed ? "🎓 모든 스텝 통과! 졸업할 수 있어요!" : getCurrentUnitTitle(state.currentUnit) }),
        stats,
        xpBar,
        xpLabel,
    );

    const top = el("div", { class: "home__top" }, avatar, profileInfo);

    // 졸업장 받기 버튼
    let graduateBtn = null;
    if (allPassed) {
        graduateBtn = el("button", {
            class: "btn btn--big graduate-btn",
            text: "🎓 졸업장 받기!",
            style: { marginTop: "12px" },
            on: { click: () => navigate("graduation") },
        });
    }

    // ----- 명예의 전당 게시판 (인라인, Top 30 — 3열) -----
    const hallList = el("div", { class: "hall-board__list hall-board__list--3col" });
    hallList.appendChild(el("div", { class: "hall-board__loading", text: "🔄 불러오는 중..." }));

    const hallBoard = el("div", { class: "hall-board" },
        el("div", { class: "hall-board__header" },
            el("span", { class: "hall-board__icon", text: "🏆" }),
            el("h2", { class: "hall-board__title", text: "명예의 전당" }),
            el("span", { class: "hall-board__sub",
                text: isSharedHallEnabled() ? "🌐 전체 공유 Top 30" : "Top 30 (로컬)" }),
        ),
        hallList,
    );

    fetchHallTop(30).then(list => {
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
            // 저장된 level이 아니라 현재 임계점 기준으로 점수에서 다시 산출
            const lvl = getLevelFromPoints(Number(entry.score) || 0);
            const row = el("div", { class: `hall-board__row ${rank <= 3 ? `hall-board__row--top${rank}` : ""}` },
                el("div", { class: "hall-board__rank", text: rankBadge }),
                el("div", { class: "hall-board__name", text: entry.name }),
                el("div", { class: "hall-board__lvl" },
                    el("span", { class: "hall-board__lvl-num", text: `Lv.${lvl}` }),
                    el("span", { class: "hall-board__lvl-name", text: ` · ${getLevelName(lvl)}` }),
                ),
                el("div", { class: "hall-board__score",
                    text: `${Number(entry.score).toLocaleString()}점` }),
            );
            hallList.appendChild(row);
        });
    }).catch(e => {
        hallList.innerHTML = "";
        hallList.appendChild(el("div", { class: "hall-board__empty",
            text: "😢 기록을 불러오지 못했어요." }));
        console.warn(e);
    });

    // ----- 스텝 카드 -----
    const grid = el("div", { class: "lessons-grid" });
    currentLessons.forEach((lesson, idx) => {
        const isUnlocked = isLessonUnlocked(idx, currentLessons);
        const passed = isLessonPassed(lesson.id);
        const best = state.bestScores[lesson.id] || 0;
        const prevLesson = idx > 0 ? currentLessons[idx - 1] : null;

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
            card.addEventListener("click", () => {
                // 졸업 후 10분 자동 초기화 타이머가 살아있으면 취소
                // (학생이 다시 플레이를 시작했으므로 도중에 갑자기 리셋되면 안 됨)
                cancelGraduationReset();
                navigate(lesson.game, { lessonId: lesson.id });
            });
        } else if (!isUnlocked) {
            card.addEventListener("click", () => {
                Audio.wrong();
                showToast(`🔒 먼저 ${prevLesson.num}을(를) ${prevLesson.goalScore}점 이상으로 통과해야 해요!`);
            });
        }
        grid.appendChild(card);
    });

    // 하단: 처음부터 다시
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
                    navigate("gradeSelect");
                }
            },
        },
    });

    if (gradeBadge) {
        const gradeRow = el("div", {
            style: { display: "flex", justifyContent: "center", marginBottom: "6px" },
        }, gradeBadge);
        screen.appendChild(gradeRow);
    }
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
