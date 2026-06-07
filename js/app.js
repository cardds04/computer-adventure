/* ============================================================
   app.js — 엔트리포인트
   로그인/캐릭터 선택 없이 홈으로 바로 진입
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    // 학년을 먼저 선택해야 시작 (명예의 전당을 학년별로 분리하기 위함)
    if (!state.grade) {
        navigate("gradeSelect");
    } else {
        navigate("home");
    }
});
