/* ============================================================
   7단원 보안편 공용 — 스토리 인트로 (어두운 배경 + 가운데 카드)
   slides: [{ img, text }] 를 다음/다음/시작 으로 넘긴 뒤 onDone() 호출.
   스텝1~5 스토리 크기·모양을 모두 이걸로 통일.
   ============================================================ */
function secStoryIntro(screen, slides, onDone) {
    function finish() {
        const b = screen.querySelector(".sec-storyback");
        if (b) b.remove();
        onDone && onDone();
    }
    function show(idx) {
        const old = screen.querySelector(".sec-storyback");
        if (old) old.remove();
        const s = slides[idx];
        const card = el("div", { class: "sec-story" });
        if (s.img) card.style.backgroundImage = `url('${s.img}')`;
        const dots = el("div", { class: "sec-story__dots" });
        slides.forEach((_, i) => dots.appendChild(el("span", { class: "dot" + (i === idx ? " on" : "") })));
        const cap = el("div", { class: "sec-story__cap" },
            el("div", { class: "sec-story__text", text: s.text }),
            el("button", {
                class: "sec-story__btn",
                text: idx < slides.length - 1 ? "다음 ▶" : "게임 시작! ▶",
                on: { click: () => { if (idx < slides.length - 1) show(idx + 1); else finish(); } },
            }),
        );
        const skip = el("button", { class: "sec-story__skip", text: "건너뛰기 ⏭", on: { click: finish } });
        card.appendChild(dots); card.appendChild(skip); card.appendChild(cap);
        const back = el("div", { class: "sec-storyback" }, card);
        screen.appendChild(back);
        Audio.roundStart && Audio.roundStart();
    }
    show(0);
}
