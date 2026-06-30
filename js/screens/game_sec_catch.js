/* ============================================================
   7단원 스텝 3: 피싱 판별 (YES/NO)
   전쟁 승리 후 수상한 문자들이 도착! 링크를 누를까? 정보를 줄까?
   YES/NO로 피싱을 가려내는 게임. (예전 받기게임 → 판단게임으로 교체)
   ============================================================ */

SCREEN_RENDERERS.gameSecCatch = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-phish" });

    const STORY = [
        { img: "assets/security/phish_story1.jpeg", text: "드디어 대장 바이러스 OVERSEER를 물리쳤다! 모두가 환호한다 — 우리가 지켜냈어! 🎉" },
        { img: "assets/security/phish_story2.jpeg", text: "평화로운 일상으로 돌아왔어. 그런데 ‘딩동!’ 휴대폰에 문자가 하나 도착했다. 📱" },
        { img: "assets/security/phish_story3.jpeg", text: "그 뒤로 수상한 문자가 계속 와… 진짜일까, 가짜(피싱)일까? 잘 판단해야 해!" },
    ];
    const GAME_BG = "assets/security/phish_bg.jpeg";
    const PTS = 40000;

    const QUESTIONS = [
        { cat: "💰 당첨 문자", from: "[광고] 이벤트당첨",
          msg: "🎉 축하합니다! 고객님은 100만 원에 당첨되었습니다!\n아래 링크를 눌러 상품을 받아가세요.",
          q: "링크를 누를까요?", answer: "NO",
          explain: "공짜로 큰돈을 준다는 문자는 거의 다 가짜예요! 링크를 누르면 개인정보가 빠져나가거나 돈을 잃을 수 있어요." },
        { cat: "📦 택배 문자", from: "택배 배송안내",
          msg: "📦 택배 주소가 잘못되어 배송이 중단되었습니다.\n아래 링크에서 주소를 다시 입력해주세요.",
          q: "링크를 눌러 개인정보를 입력할까요?", answer: "NO",
          explain: "진짜 택배사는 문자 링크로 주소·개인정보를 다시 받지 않아요. 택배는 공식 앱이나 고객센터에서 확인해요." },
        { cat: "💬 친구 사칭", from: "친구?",
          msg: "나 휴대폰이 고장 났어. 급하게 인증번호 하나만 보내줘!",
          q: "인증번호를 보내줄까요?", answer: "NO",
          explain: "인증번호는 누구에게도 절대 알려주면 안 돼요! 친구를 사칭한 사기일 수 있어요. 진짜인지 전화로 확인해요." },
        { cat: "🎮 무료 아이템", from: "[광고] 게임이벤트",
          msg: "오늘만 한정! 인기 게임 다이아 10,000개 무료 지급!\n지금 로그인하세요.",
          q: "아이디와 비밀번호를 입력할까요?", answer: "NO",
          explain: "공짜 아이템으로 아이디·비밀번호를 입력하게 하는 건 계정을 훔치려는 수법이에요. 절대 입력하지 마요!" },
        { cat: "🏦 계좌 정지", from: "○○은행",
          msg: "고객님의 계좌가 잠금 처리되었습니다.\n본인 확인을 위해 아래 링크에서 비밀번호를 입력해주세요.",
          q: "비밀번호를 입력할까요?", answer: "NO",
          explain: "은행은 문자 링크로 비밀번호를 묻지 않아요! 놀라게 해서 누르게 만드는 피싱이에요. 은행 앱이나 직접 방문으로 확인해요." },
    ];
    const TOTAL = QUESTIONS.length;

    const startingScore = getStartingScore(params.lessonId);
    let score = startingScore, qIdx = 0, correctCount = 0, finished = false, locked = false;
    const goalScore = (LESSONS_UNIT7.find(l => l.id === params.lessonId) || {}).goalScore || 0;
    root.appendChild(screen);

    let scoreEl, stageEl, lvlChip, card;

    function startPlay() {
        screen.innerHTML = "";
        const bg = el("div", { class: "sec-phish-bg" });
        bg.style.background = `linear-gradient(rgba(8,10,22,.55),rgba(8,10,22,.62)), url('${GAME_BG}') center/cover no-repeat`;
        screen.appendChild(bg);

        scoreEl = el("span", { class: "hud-chip__big", text: `${score}` });
        stageEl = el("span", { text: `1 / ${TOTAL}` });
        lvlChip = makeLevelChip(); lvlChip.update(state.points + (score - startingScore));
        const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
            style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
        screen.appendChild(el("div", { class: "game__hud" },
            exitBtn,
            el("span", { class: "hud-chip" }, el("span", { text: "📱" }), el("span", { class: "stat-chip__label", text: "문자" }), stageEl),
            lvlChip.chip,
            el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
                el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
        ));
        screen.appendChild(el("div", { class: "sec-title", text: "📱 수상한 문자! 시키는 대로 해도 될까? 예 / 아니오 로 판단!" }));
        card = el("div", { class: "phish-card" });
        screen.appendChild(card);
        showCarryOverBanner(startingScore);
        loadQuestion();
    }

    function updateScore() { scoreEl.textContent = score; scoreEl.classList.toggle("passed", score >= goalScore);
        lvlChip.update(state.points + (score - startingScore)); }

    function loadQuestion() {
        const it = QUESTIONS[qIdx], n = qIdx + 1;
        stageEl.textContent = `${n} / ${TOTAL}`;
        locked = false; card.innerHTML = "";
        card.appendChild(el("div", { class: "phish-tag", text: `문자 ${n} · ${it.cat}` }));
        // 휴대폰 메시지
        const phone = el("div", { class: "phish-phone" },
            el("div", { class: "phish-phone__head", text: `📨 ${it.from}` }),
            el("div", { class: "phish-msg", text: it.msg }),
        );
        card.appendChild(phone);
        card.appendChild(el("div", { class: "phish-q", text: "❓ " + it.q }));
        const btns = el("div", { class: "phish-btns" });
        const yes = el("button", { class: "phish-btn phish-btn--yes" }, el("b", { text: "✅" }), el("span", { text: "예 (한다)" }));
        const no = el("button", { class: "phish-btn phish-btn--no" }, el("b", { text: "❌" }), el("span", { text: "아니오 (안 한다)" }));
        yes.addEventListener("click", () => answer("YES", yes, no));
        no.addEventListener("click", () => answer("NO", no, yes));
        btns.appendChild(yes); btns.appendChild(no);
        card.appendChild(btns);
    }

    function answer(choice, picked, other) {
        if (finished || locked) return;
        locked = true;
        const it = QUESTIONS[qIdx];
        const correct = choice === it.answer;
        picked.classList.add(correct ? "correct" : "wrong");
        other.classList.add("dim");
        if (correct) {
            score += PTS; correctCount++; updateScore();
            Audio.bigCorrect && Audio.bigCorrect(6);
            const r = picked.getBoundingClientRect();
            emitParticles(r.left + r.width / 2, r.top + r.height / 2, 12, ["🛡️", "✨", "⭐", "🎉"]);
        } else { Audio.wrong && Audio.wrong(); }

        const res = el("div", { class: "phish-result " + (correct ? "phish-result--ok" : "phish-result--no") },
            el("div", { class: "phish-result__head",
                text: correct ? "🛡️ 잘했어요! 피싱을 피했어요!" : "⚠️ 앗! 피싱에 속을 뻔했어요!" }),
            el("div", { class: "phish-result__explain", text: it.explain }),
        );
        const next = el("button", { class: "btn btn--big phish-next",
            text: qIdx >= TOTAL - 1 ? "결과 보기 🏁" : "다음 문자 ▶",
            on: { click: () => { if (qIdx >= TOTAL - 1) finishGame(); else { qIdx++; loadQuestion(); } } } });
        res.appendChild(next); card.appendChild(res);
        requestAnimationFrame(() => res.classList.add("show"));
    }

    function cleanup() { finished = true; }

    function finishGame() {
        if (finished) return; finished = true; cleanup(); Audio.gameOver && Audio.gameOver();
        const prevLevel = getLevelFromPoints(state.points);
        finishLesson(params.lessonId, score);
        const newLevel = getLevelFromPoints(state.points);
        navigate("results", { lessonId: params.lessonId, score, bestCombo: correctCount, leveledUp: newLevel > prevLevel, newLevel });
    }

    secStoryIntro(screen, STORY, startPlay);
};
