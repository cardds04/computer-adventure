/* ============================================================
   7단원 스텝 4: 개인정보 지킴이 퀴즈 (4지선다)
   땅속 바이러스가 사람을 좀비로 만든다! 개인정보 문제를 풀어 좀비를 물리쳐라.
   (예전 뱀게임 → 4지선다 퀴즈로 교체)
   ============================================================ */

SCREEN_RENDERERS.gameSecSnake = function (root, params) {
    const screen = el("div", { class: "screen game game--sec game--sec-quiz" });

    const STORY = [
        { img: "assets/security/info_story1.jpeg", text: "OVERSEER를 물리치고 한숨 돌리는데… 시스템이 뭔가 이상해. 😰" },
        { img: "assets/security/info_story2.png", text: "땅속에서 바이러스가 스멀스멀 올라온다! 아직 끝난 게 아니야!" },
        { img: "assets/security/info_story3.jpeg", text: "바이러스가 사람들을 감염시켜 좀비로 만들었다! 개인정보 문제를 풀어 좀비를 물리쳐라! 🧟" },
    ];
    const GAME_BG = "assets/security/info_bg.png";
    const PTS = 25000;

    const QUESTIONS = [
        { q: "게임에서 처음 만난 사람이 “우리 친구하자! 전화번호 알려줘!”라고 했어요. 어떻게 할까요?",
          choices: ["바로 알려준다", "친구에게 대신 알려달라고 한다", "모르는 사람이므로 알려주지 않는다", "집 주소도 함께 알려준다"], answer: 2,
          explain: "인터넷에서 처음 만난 사람에게 전화번호 같은 개인정보를 알려주면 위험해요. 모르는 사람에겐 알려주지 않아요!" },
        { q: "다음 중 개인정보가 아닌 것은?",
          choices: ["집 주소", "비밀번호", "좋아하는 색깔", "전화번호"], answer: 2,
          explain: "집 주소·비밀번호·전화번호는 나를 알아낼 수 있는 개인정보예요. ‘좋아하는 색깔’은 개인정보가 아니에요." },
        { q: "비밀번호를 만들 때 가장 안전한 것은?",
          choices: ["123456", "birthday", "qwerty", "B3ar!2026"], answer: 3,
          explain: "쉬운 숫자·단어·생일은 금방 들켜요. 영어 대소문자·숫자·기호를 섞은 ‘B3ar!2026’ 같은 비밀번호가 안전해요." },
        { q: "친구와 찍은 사진을 인터넷에 올리려고 해요. 가장 먼저 해야 할 일은?",
          choices: ["그냥 올린다", "얼굴만 가리면 된다", "친구에게 먼저 허락을 받는다", "이름만 지우면 된다"], answer: 2,
          explain: "다른 사람이 나온 사진은 그 친구의 개인정보예요. 올리기 전에 꼭 허락을 받아야 해요." },
        { q: "다음 중 절대로 알려주면 안 되는 것은?",
          choices: ["좋아하는 음식", "좋아하는 운동", "게임 비밀번호", "좋아하는 계절"], answer: 2,
          explain: "비밀번호는 누구에게도 알려주면 안 돼요! 계정을 빼앗길 수 있어요." },
        { q: "학교 홈페이지에서 회원가입을 하려고 해요. 누구의 도움을 받는 게 가장 좋을까요?",
          choices: ["모르는 사람", "인터넷 친구", "부모님이나 선생님", "아무에게도 말하지 않는다"], answer: 2,
          explain: "회원가입처럼 개인정보를 적을 때는 믿을 수 있는 부모님·선생님께 도움을 받는 게 가장 안전해요." },
        { q: "SNS에 올리면 위험할 수 있는 사진은?",
          choices: ["풍경 사진", "반려동물 사진", "집 주소가 보이는 사진", "꽃 사진"], answer: 2,
          explain: "집 주소·학교 이름이 보이는 사진은 내가 어디 사는지 알려줘서 위험해요. 올리기 전에 꼭 확인해요!" },
        { q: "(보너스) 다음 중 가장 안전한 행동은?",
          choices: ["비밀번호를 친구에게 알려준다", "모든 사이트에서 같은 비밀번호를 쓴다", "모르는 링크는 누르지 않는다", "생일을 비밀번호로 만든다"], answer: 2,
          explain: "모르는 링크는 누르지 않는 게 안전해요. 비밀번호 공유·같은 비밀번호·생일 비밀번호는 모두 위험해요." },
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
        bg.style.background = `linear-gradient(rgba(8,10,14,.6),rgba(8,10,14,.68)), url('${GAME_BG}') center/cover no-repeat`;
        screen.appendChild(bg);

        scoreEl = el("span", { class: "hud-chip__big", text: `${score}` });
        stageEl = el("span", { text: `1 / ${TOTAL}` });
        lvlChip = makeLevelChip(); lvlChip.update(state.points + (score - startingScore));
        const exitBtn = el("button", { class: "btn btn--ghost", text: "← 그만",
            style: { fontSize: "14px", padding: "6px 14px" }, on: { click: () => { cleanup(); navigate("home"); } } });
        screen.appendChild(el("div", { class: "game__hud" },
            exitBtn,
            el("span", { class: "hud-chip" }, el("span", { text: "🧟" }), el("span", { class: "stat-chip__label", text: "문제" }), stageEl),
            lvlChip.chip,
            el("span", { class: "hud-chip" }, el("span", { text: "⭐" }), scoreEl,
                el("span", { class: "hud-chip__sep", text: "/" }), el("span", { class: "hud-chip__goal", text: `${goalScore}` })),
        ));
        screen.appendChild(el("div", { class: "sec-title", text: "🕵️ 개인정보 지킴이 퀴즈! 정답을 맞혀 좀비를 물리쳐라!" }));
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
        card.appendChild(el("div", { class: "phish-tag", text: `문제 ${n} / ${TOTAL}` }));
        card.appendChild(el("div", { class: "phish-q", text: it.q }));
        // 보기 섞기 (정답이 항상 같은 번호에 오지 않도록)
        const opts = it.choices.map((c, i) => ({ text: c, correct: i === it.answer }));
        for (let k = opts.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); const t = opts[k]; opts[k] = opts[j]; opts[j] = t; }
        const list = el("div", { class: "quiz-choices" });
        opts.forEach((o, i) => {
            const btn = el("button", { class: "quiz-choice" }, el("b", { text: `${i + 1}` }), el("span", { text: o.text }));
            btn.addEventListener("click", () => answer(o.correct, btn, list));
            list.appendChild(btn);
        });
        card.appendChild(list);
    }

    function answer(correct, btn, list) {
        if (finished || locked) return;
        locked = true;
        [...list.children].forEach(b => { if (b !== btn) b.classList.add("dim"); });
        const it = QUESTIONS[qIdx];
        if (correct) {
            btn.classList.add("correct"); score += PTS; correctCount++; updateScore();
            Audio.bigCorrect && Audio.bigCorrect(6);
            const r = btn.getBoundingClientRect();
            emitParticles(r.left + r.width / 2, r.top + r.height / 2, 12, ["🧟", "💥", "✨", "🛡️"]);
        } else {
            btn.classList.add("wrong"); Audio.wrong && Audio.wrong();
            // 정답 강조
            [...list.children].forEach(b => { if (b.querySelector("span").textContent === it.choices[it.answer]) { b.classList.remove("dim"); b.classList.add("correct"); } });
        }
        const res = el("div", { class: "phish-result " + (correct ? "phish-result--ok" : "phish-result--no") },
            el("div", { class: "phish-result__head", text: correct ? "🛡️ 정답! 좀비 격퇴!" : `⚠️ 아쉬워요! 정답은 ‘${it.choices[it.answer]}’` }),
            el("div", { class: "phish-result__explain", text: it.explain }),
        );
        const next = el("button", { class: "btn btn--big phish-next",
            text: qIdx >= TOTAL - 1 ? "결과 보기 🏁" : "다음 문제 ▶",
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
