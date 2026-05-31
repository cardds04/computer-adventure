/* ============================================================
   audio.js — Web Audio API 효과음 (외부 파일 없이 합성)
   ============================================================ */

const Audio = (() => {
    let ctx = null;
    let masterGain = null;
    let enabled = true;

    function init() {
        if (ctx) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.35;  // 전체 볼륨
            masterGain.connect(ctx.destination);
        } catch (e) {
            console.warn("audio init failed", e);
            enabled = false;
        }
    }

    function resume() {
        if (!ctx) init();
        if (ctx && ctx.state === "suspended") ctx.resume();
    }

    /** 한 개의 톤을 잠깐 울리고 끄기 */
    function tone(freq, dur, type = "sine", attack = 0.005, vol = 1) {
        if (!enabled) return;
        init();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    /** 주파수 빠르게 변하는 글라이드 톤 (정답 효과 등) */
    function glide(freqFrom, freqTo, dur, type = "triangle", vol = 1) {
        if (!enabled) return;
        init();
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqFrom, t);
        osc.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    // ---- 효과음 프리셋 ----

    function correct() {
        // 밝은 두 톤 (E5 → A5)
        tone(659, 0.08, "triangle", 0.003, 0.7);
        setTimeout(() => tone(880, 0.12, "triangle", 0.003, 0.7), 70);
    }

    function bigCorrect(comboLevel = 1) {
        // 콤보가 높을수록 더 화려
        const base = 659 + comboLevel * 30;
        tone(base, 0.06, "triangle", 0.003, 0.6);
        setTimeout(() => tone(base * 1.3, 0.08, "triangle", 0.003, 0.7), 50);
        setTimeout(() => tone(base * 1.6, 0.15, "triangle", 0.003, 0.7), 110);
    }

    function wrong() {
        // 낮은 톱니파
        glide(220, 110, 0.18, "sawtooth", 0.5);
    }

    function tick() {
        tone(880, 0.04, "square", 0.001, 0.3);
    }

    function tickGo() {
        // 카운트다운 끝 — 출발!
        glide(440, 880, 0.25, "triangle", 0.6);
    }

    function roundStart() {
        tone(523, 0.08, "triangle", 0.003, 0.5);
        setTimeout(() => tone(659, 0.08, "triangle", 0.003, 0.5), 70);
        setTimeout(() => tone(784, 0.12, "triangle", 0.003, 0.5), 140);
    }

    function gameOver() {
        // 승리 팡파레
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.005, 0.7), i * 100));
    }

    function levelUp() {
        const notes = [523, 659, 784, 1047, 1319, 1568];
        notes.forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.003, 0.6), i * 70));
    }

    // ---- 고기 굽는 지글지글 사운드 (필터된 노이즈) ----
    let sizzleSource = null;
    let sizzleGain = null;
    function sizzleStart(volume = 0.18) {
        if (!enabled) return;
        init();
        if (!ctx) return;
        if (sizzleSource) return;   // 이미 재생 중
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        // 고주파 필터로 지글지글한 느낌
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 2800;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 7000;
        const g = ctx.createGain();
        g.gain.value = 0;
        g.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.15);
        source.connect(hp).connect(lp).connect(g).connect(masterGain);
        source.start();
        sizzleSource = source;
        sizzleGain = g;
    }
    function sizzleStop() {
        if (!sizzleSource || !ctx) return;
        const g = sizzleGain;
        const s = sizzleSource;
        sizzleSource = null;
        sizzleGain = null;
        try {
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
            setTimeout(() => { try { s.stop(); } catch (e) {} }, 180);
        } catch (e) {}
    }

    // 완벽 타이밍 종 소리
    function perfectBell() {
        tone(1568, 0.1, "sine", 0.003, 0.8);
        setTimeout(() => tone(2093, 0.18, "sine", 0.003, 0.8), 60);
    }

    // 탔을 때 칙~ 하는 노이즈 (짧게)
    function burnt() {
        if (!enabled) return;
        init();
        if (!ctx) return;
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 800;
        const g = ctx.createGain();
        g.gain.value = 0.35;
        source.connect(lp).connect(g).connect(masterGain);
        source.start();
    }

    return {
        resume, correct, bigCorrect, wrong, tick, tickGo,
        roundStart, gameOver, levelUp,
        sizzleStart, sizzleStop, perfectBell, burnt,
        get enabled() { return enabled; },
        setEnabled(v) { enabled = v; },
    };
})();

// 첫 사용자 인터랙션 시 오디오 컨텍스트 깨우기 (브라우저 정책)
document.addEventListener("click", () => Audio.resume(), { once: false, capture: true });
document.addEventListener("keydown", () => Audio.resume(), { once: false, capture: true });
