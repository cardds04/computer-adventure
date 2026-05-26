/* ============================================================
   명예의 전당 — Top 10 순위 (Supabase 공유 또는 localStorage)
   ============================================================ */

SCREEN_RENDERERS.hall = function (root) {
    const screen = el("div", { class: "screen hall" });

    const header = el("div", { class: "hall__header" },
        el("div", { class: "hall__badge", text: "🏆" }),
        el("h1", { class: "hall__title", text: "명예의 전당" }),
        el("div", { class: "hall__subtitle", text: "송양초등학교 디지털수업 · 마우스편" }),
    );

    const tableWrap = el("div", { class: "hall__table-wrap" });
    tableWrap.appendChild(el("div", { class: "hall__loading", text: "🔄 불러오는 중..." }));

    const note = el("div", { class: "hall__note",
        text: isSharedHallEnabled()
            ? "🌐 전체 학생들의 순위입니다. (Supabase로 공유됨)"
            : "🔔 현재 이 기기에서만 저장돼요. Supabase 설정 시 모두 공유됩니다."
    });

    const backBtn = el("button", {
        class: "btn btn--big",
        text: "🏠 홈으로",
        on: { click: () => navigate("home") },
    });

    screen.appendChild(header);
    screen.appendChild(tableWrap);
    screen.appendChild(note);
    screen.appendChild(backBtn);
    root.appendChild(screen);

    // 비동기로 데이터 가져오기
    fetchHallTop(10).then(list => {
        tableWrap.innerHTML = "";
        if (!list || list.length === 0) {
            tableWrap.appendChild(el("div", {
                class: "hall__empty",
                text: "🌟 아직 기록이 없어요! 첫 명예의 전당 주인공이 되어보세요!",
            }));
            return;
        }
        list.forEach((entry, i) => {
            const rank = i + 1;
            const rankBadge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
            const row = el("div", { class: `hall__row hall__row--rank${rank <= 3 ? rank : ""}` },
                el("div", { class: "hall__rank", text: rankBadge }),
                el("div", { class: "hall__name", text: entry.name }),
                el("div", { class: "hall__lvl",
                    text: `Lv.${entry.level || "?"} · ${getLevelName(entry.level || 1)}` }),
                el("div", { class: "hall__score", text: `${Number(entry.score).toLocaleString()}점` }),
            );
            tableWrap.appendChild(row);
        });
    }).catch(e => {
        tableWrap.innerHTML = "";
        tableWrap.appendChild(el("div", {
            class: "hall__empty",
            text: "😢 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        }));
        console.warn(e);
    });
};

// 레벨 10 이상 도달 시 이름 입력 모달
function showHallNameEntry(currentScore, currentLevel, onSaved) {
    const modal = el("div", { class: "tutorial-modal" });
    const card = el("div", { class: "tutorial-card", style: { textAlign: "center" } },
        el("div", { class: "tutorial-card__icon", text: "🏆", style: { fontSize: "72px", margin: "0 auto 12px" } }),
        el("h2", { class: "tutorial-card__title", text: "명예의 전당!", style: { textAlign: "center" } }),
        el("p", {
            style: { color: "var(--text-mid)", fontSize: "16px", margin: "8px 0 16px", lineHeight: "1.5" },
            text: `🎉 레벨 ${currentLevel} 달성!\n${currentScore.toLocaleString()}점으로 기록을 남길 수 있어요.\n이름을 입력해 주세요!`,
        }),
    );

    const nameInput = el("input", {
        class: "input",
        attrs: { type: "text", placeholder: "내 이름 (최대 10자)", maxlength: "10" },
        style: { width: "min(360px, 80vw)", fontSize: "22px", textAlign: "center", marginBottom: "12px" },
    });

    const saveBtn = el("button", {
        class: "btn btn--big tutorial-card__cta",
        text: "📝 기록 저장!",
        on: {
            click: async () => {
                const name = nameInput.value.trim();
                if (!name) {
                    nameInput.focus();
                    nameInput.style.borderColor = "#d63031";
                    return;
                }
                saveBtn.disabled = true;
                saveBtn.textContent = "저장 중...";
                await addToHall(name, currentScore, currentLevel);
                state.playerName = name;
                commit();
                modal.classList.add("fading-out");
                setTimeout(() => {
                    modal.remove();
                    onSaved && onSaved();
                }, 280);
            },
        },
    });

    const skipBtn = el("button", {
        class: "btn btn--ghost",
        text: "나중에 할래요",
        style: { fontSize: "14px", marginTop: "8px" },
        on: {
            click: () => {
                modal.classList.add("fading-out");
                setTimeout(() => { modal.remove(); onSaved && onSaved(); }, 280);
            },
        },
    });

    card.appendChild(nameInput);
    card.appendChild(saveBtn);
    card.appendChild(skipBtn);
    modal.appendChild(card);
    document.body.appendChild(modal);
    setTimeout(() => nameInput.focus(), 200);

    nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveBtn.click();
    });
}
