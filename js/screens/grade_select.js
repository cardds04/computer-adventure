/* ============================================================
   학년 선택 화면 (+ 비밀번호 게이트)
   - 1~6학년 중 선택 → 해당 학년 비밀번호 입력 → 통과 시 시작
   - 명예의 전당을 학년별로 분리하기 위해 학년을 state.grade에 저장
   ============================================================ */

SCREEN_RENDERERS.gradeSelect = function (root) {
    const screen = el("div", { class: "screen grade-select" });

    const header = el("div", { class: "grade-select__header" },
        el("div", { class: "grade-select__badge", text: "🎓" }),
        el("h1", { class: "grade-select__title", text: "학년을 선택하세요" }),
        el("div", { class: "grade-select__subtitle",
            text: "내 학년을 고르고 비밀번호를 입력하면 시작해요!" }),
    );
    screen.appendChild(header);

    const grid = el("div", { class: "grade-select__grid" });
    GRADES.forEach(g => {
        const card = el("button", {
            class: "grade-card",
            style: { "--grade-color": g.color },
            on: { click: () => openPasswordModal(g) },
        },
            el("span", { class: "grade-card__icon", text: g.icon }),
            el("span", { class: "grade-card__label", text: g.label }),
        );
        grid.appendChild(card);
    });
    screen.appendChild(grid);

    const footnote = el("div", { class: "grade-select__note",
        text: "🔒 비밀번호는 선생님께 물어보세요" });
    screen.appendChild(footnote);

    root.appendChild(screen);

    // ---------- 비밀번호 입력 모달 (숫자 키패드) ----------
    function openPasswordModal(g) {
        Audio.tick && Audio.tick();
        const correct = String(GRADE_PASSWORDS[g.num] || "");
        let entered = "";

        const modal = el("div", { class: "tutorial-modal grade-pw-modal" });
        const card = el("div", { class: "tutorial-card grade-pw-card",
            style: { textAlign: "center", "--grade-color": g.color } });

        const icon = el("div", { class: "grade-pw__icon", text: g.icon });
        const title = el("h2", { class: "grade-pw__title", text: `${g.label} 비밀번호` });
        const sub = el("div", { class: "grade-pw__sub", text: "4자리 숫자를 입력하세요" });

        // 4개 점
        const dots = el("div", { class: "grade-pw__dots" });
        const dotEls = [0,1,2,3].map(() => {
            const d = el("span", { class: "grade-pw__dot" });
            dots.appendChild(d);
            return d;
        });

        // 숫자 키패드
        const keypad = el("div", { class: "grade-pw__keypad" });
        const layout = ["1","2","3","4","5","6","7","8","9","clear","0","back"];
        layout.forEach(k => {
            let label = k, cls = "grade-pw__key";
            if (k === "clear") { label = "✕"; cls += " grade-pw__key--fn"; }
            else if (k === "back") { label = "⌫"; cls += " grade-pw__key--fn"; }
            const key = el("button", { class: cls, text: label,
                on: { click: () => onKey(k) } });
            keypad.appendChild(key);
        });

        const closeBtn = el("button", {
            class: "btn btn--ghost grade-pw__close",
            text: "← 다른 학년 선택",
            on: { click: closeModal },
        });

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(sub);
        card.appendChild(dots);
        card.appendChild(keypad);
        card.appendChild(closeBtn);
        modal.appendChild(card);
        document.body.appendChild(modal);

        function refreshDots() {
            dotEls.forEach((d, i) => {
                d.classList.toggle("grade-pw__dot--filled", i < entered.length);
            });
        }

        function onKey(k) {
            if (k === "clear") { entered = ""; refreshDots(); Audio.tick && Audio.tick(); return; }
            if (k === "back") { entered = entered.slice(0, -1); refreshDots(); Audio.tick && Audio.tick(); return; }
            if (entered.length >= 4) return;
            entered += k;
            refreshDots();
            Audio.tick && Audio.tick();
            if (entered.length === 4) setTimeout(check, 150);
        }

        function check() {
            if (entered === correct) {
                // 통과!
                Audio.bigCorrect && Audio.bigCorrect(8);
                card.classList.add("grade-pw-card--ok");
                state.grade = g.num;
                commit();
                setTimeout(() => {
                    modal.classList.add("fading-out");
                    setTimeout(() => { modal.remove(); navigate("home"); }, 250);
                }, 450);
            } else {
                // 틀림 — 흔들고 초기화
                Audio.wrong && Audio.wrong();
                card.classList.remove("grade-pw-card--shake");
                void card.offsetWidth;
                card.classList.add("grade-pw-card--shake");
                sub.textContent = "비밀번호가 틀렸어요! 다시 입력하세요";
                sub.classList.add("grade-pw__sub--error");
                entered = "";
                refreshDots();
            }
        }

        function closeModal() {
            modal.classList.add("fading-out");
            setTimeout(() => modal.remove(), 250);
        }

        // 물리 키보드도 지원 (선생님 PC용)
        function onPhysKey(e) {
            if (!document.body.contains(modal)) {
                document.removeEventListener("keydown", onPhysKey);
                return;
            }
            if (e.key >= "0" && e.key <= "9") { onKey(e.key); e.preventDefault(); }
            else if (e.key === "Backspace") { onKey("back"); e.preventDefault(); }
            else if (e.key === "Escape") { closeModal(); }
        }
        document.addEventListener("keydown", onPhysKey);
    }
};
