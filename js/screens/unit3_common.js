/* ============================================================
   3단원 단축키편 — 공통 헬퍼
   가짜 바탕화면 / 폴더·파일 아이콘 / 우클릭 메뉴 / 단축키 카드
   ============================================================ */

// 폴더/파일 아이콘 만들기
function makeFolderIcon(label, opts = {}) {
    const wrap = el("div", { class: "fd-icon fd-icon--folder", "data-label": label },
        el("div", { class: "fd-icon__emoji", text: opts.emoji || "📁" }),
        el("div", { class: "fd-icon__label", text: label }),
    );
    return wrap;
}

function makeFileIcon(label, opts = {}) {
    const wrap = el("div", { class: "fd-icon fd-icon--file", "data-label": label },
        el("div", { class: "fd-icon__emoji", text: opts.emoji || "📄" }),
        el("div", { class: "fd-icon__label", text: label }),
    );
    return wrap;
}

// 단축키 카드 패널 (활성/비활성 표시 + 누르면 번쩍)
function makeShortcutCards(keys) {
    // keys: [{ combo: "Ctrl+C", label: "복사", icon: "📋", active: false }, ...]
    const wrap = el("div", { class: "shortcut-cards" });
    const cards = {};
    keys.forEach(k => {
        const card = el("div", { class: "shortcut-card" + (k.active ? " shortcut-card--active" : "") },
            el("div", { class: "shortcut-card__combo", text: k.combo }),
            el("div", { class: "shortcut-card__icon", text: k.icon }),
            el("div", { class: "shortcut-card__label", text: k.label }),
        );
        wrap.appendChild(card);
        cards[k.combo] = card;
    });
    return {
        el: wrap,
        cards,
        flash(combo) {
            const c = cards[combo];
            if (!c) return;
            c.classList.remove("shortcut-card--flash");
            void c.offsetWidth;
            c.classList.add("shortcut-card--flash");
        },
        setActive(combo, on) {
            const c = cards[combo];
            if (!c) return;
            c.classList.toggle("shortcut-card--active", !!on);
        },
    };
}

// 우클릭 컨텍스트 메뉴
function showContextMenu(x, y, items, parent) {
    // 기존 메뉴 제거
    const existing = document.querySelector(".fd-context-menu");
    if (existing) existing.remove();

    const menu = el("div", { class: "fd-context-menu" });
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    items.forEach(item => {
        const li = el("div", { class: "fd-context-menu__item" + (item.disabled ? " fd-context-menu__item--disabled" : "") },
            el("span", { class: "fd-context-menu__icon", text: item.icon || "" }),
            el("span", { text: item.label }),
        );
        if (!item.disabled) {
            li.addEventListener("click", (e) => {
                e.stopPropagation();
                menu.remove();
                item.onClick && item.onClick();
            });
        }
        menu.appendChild(li);
    });
    (parent || document.body).appendChild(menu);

    // 다른곳 클릭 시 메뉴 닫기
    setTimeout(() => {
        document.addEventListener("click", function close(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener("click", close);
            }
        });
    }, 0);

    return menu;
}

// 점수 플로팅 표시 (공통)
function showScoreFloat(x, y, text, klass = "") {
    const pf = el("div", {
        class: "points-float " + klass,
        text,
        style: { left: `${x}px`, top: `${y}px` },
    });
    fxLayer.appendChild(pf);
    setTimeout(() => pf.remove(), 1100);
}
