const socket = io();
const app = document.getElementById("app");

const STORE_KEY = "qp_quiz_session";
let session = null; // { gameId, teamId, token }
try {
  session = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
} catch (e) {
  session = null;
}

let latestState = null;
let myTeamId = session ? session.teamId : null;
let joinError = null;
let joinPending = false;
let stopCountdown = null;
let lastRenderedKey = null; // avoid re-rendering options mid-question and losing selection UI
// Persisted across re-renders of the SAME question (the server broadcasts a
// fresh state to everyone whenever any team answers, which would otherwise
// wipe out this device's own "selected / locked" UI on every re-render).
let myAnswer = { key: null, choice: null, locked: false };

function saveSession(s) {
  session = s;
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

function clearSession() {
  session = null;
  myTeamId = null;
  localStorage.removeItem(STORE_KEY);
}

socket.on("connect", () => {
  if (session && session.teamId) {
    socket.emit("player:rejoin", session, (res) => {
      if (res.error) {
        clearSession();
        render();
      } else {
        myTeamId = res.teamId;
        render();
      }
    });
  }
});

socket.on("state", (state) => {
  latestState = state;
  // if my team got removed (kicked / new game), drop local session
  if (myTeamId && state.teams && !state.teams.some((t) => t.id === myTeamId)) {
    clearSession();
  }
  render();
});

function submitJoin(pin, name) {
  joinPending = true;
  joinError = null;
  render();
  socket.emit("player:join", { pin, name }, (res) => {
    joinPending = false;
    if (res.error) {
      joinError = res.error;
      render();
      return;
    }
    saveSession({ gameId: res.gameId, teamId: res.teamId, token: res.token });
    myTeamId = res.teamId;
    render();
  });
}

function myTeam() {
  if (!latestState || !myTeamId) return null;
  return latestState.teams.find((t) => t.id === myTeamId) || null;
}

function renderJoinScreen() {
  app.innerHTML = "";
  app.appendChild(logoBadge());
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Queen's Pub";
  app.appendChild(eyebrow);

  const h1 = document.createElement("h1");
  h1.textContent = "Kvíz";
  app.appendChild(h1);

  if (latestState && latestState.registrationLocked) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<p>Registrace týmů je pro tuto hru uzavřená. Počkej na moderátora nebo na další kolo kvízu.</p>`;
    app.appendChild(card);
    return;
  }

  const card = document.createElement("div");
  card.className = "card";

  const form = document.createElement("form");
  form.innerHTML = `
    ${joinError ? `<div class="error-msg">${escapeHtml(joinError)}</div>` : ""}
    <div class="field">
      <label>PIN hry</label>
      <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" class="pin-input" id="pin-input" placeholder="0000" autocomplete="off" />
    </div>
    <div class="field">
      <label>Název týmu</label>
      <input type="text" id="name-input" maxlength="24" placeholder="Např. Quiz Ninjas" autocomplete="off" />
    </div>
    <button type="submit" class="btn" id="join-btn">${joinPending ? "Připojuji…" : "Připojit se do hry"}</button>
  `;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const pin = document.getElementById("pin-input").value.trim();
    const name = document.getElementById("name-input").value.trim();
    if (!pin || !name) return;
    submitJoin(pin, name);
  });
  card.appendChild(form);
  app.appendChild(card);
}

function renderLobbyJoined() {
  app.innerHTML = "";
  app.appendChild(logoBadge());
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Jsi přihlášen jako";
  app.appendChild(eyebrow);
  const h1 = document.createElement("h1");
  h1.textContent = myTeam() ? myTeam().name : "…";
  app.appendChild(h1);
  const p = document.createElement("p");
  p.textContent = "Čekej, až moderátor spustí hru. Nezavírej tuhle stránku.";
  app.appendChild(p);

  const div = document.createElement("div");
  div.className = "divider";
  app.appendChild(div);

  const sub = document.createElement("div");
  sub.className = "muted";
  sub.textContent = `Přihlášeno týmů: ${latestState.teamCount}`;
  app.appendChild(sub);

  app.appendChild(teamListEl(latestState.teams, { compact: true }));
}

function renderRoundIntro() {
  app.innerHTML = "";
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `Kolo ${latestState.round} z ${latestState.totalRounds}`;
  app.appendChild(eyebrow);
  const h1 = document.createElement("h1");
  h1.textContent = latestState.roundTitle;
  app.appendChild(h1);
  const p = document.createElement("p");
  p.textContent = "Připrav se, otázky za chvíli začnou.";
  app.appendChild(p);
}

function renderQuestion() {
  const key = `${latestState.round}-${latestState.questionIndex}`;
  const isNewQuestion = key !== lastRenderedKey;
  lastRenderedKey = key;

  app.innerHTML = "";
  const idx = document.createElement("div");
  idx.className = "question-index";
  idx.textContent = `Otázka ${latestState.questionIndex + 1} / ${latestState.totalQuestions}`;
  app.appendChild(idx);

  const timerWrap = document.createElement("div");
  timerWrap.className = "timer-bar-wrap";
  const timerFill = document.createElement("div");
  timerFill.className = "timer-bar-fill";
  timerFill.style.width = "100%";
  timerWrap.appendChild(timerFill);
  app.appendChild(timerWrap);

  const q = document.createElement("div");
  q.className = "big-question";
  q.textContent = latestState.currentQuestion.text;
  app.appendChild(q);

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "options";
  app.appendChild(optionsWrap);

  const statusMsg = document.createElement("p");
  statusMsg.id = "answer-status";
  statusMsg.className = "muted";
  app.appendChild(statusMsg);

  if (isNewQuestion) {
    myAnswer = { key, choice: null, locked: false };
  }

  function renderOptions() {
    optionsWrap.innerHTML = "";
    latestState.currentQuestion.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn" + (myAnswer.choice === i ? " selected" : "");
      btn.disabled = myAnswer.locked;
      btn.innerHTML = `<span class="letter">${LETTERS[i]}</span><span>${escapeHtml(opt)}</span>`;
      btn.addEventListener("click", () => {
        if (myAnswer.locked) return;
        myAnswer.locked = true;
        myAnswer.choice = i;
        renderOptions();
        statusMsg.textContent = "Odesílám…";
        socket.emit("player:answer", i, (res) => {
          if (res.error) {
            statusMsg.textContent = res.error;
            myAnswer.locked = false;
            myAnswer.choice = null;
            renderOptions();
          } else {
            statusMsg.textContent = "Odpověď zaznamenána ✓ Čekej na vyhodnocení.";
          }
        });
      });
      optionsWrap.appendChild(btn);
    });
    if (myAnswer.locked && myAnswer.choice !== null) {
      statusMsg.textContent = "Odpověď zaznamenána ✓ Čekej na vyhodnocení.";
    }
  }

  if (isNewQuestion) {
    // check server in case of reconnect mid-question (fresh page load)
    socket.emit("player:myStatus", null, (res) => {
      if (res.answered && myAnswer.key === key) {
        myAnswer.choice = res.choice;
        myAnswer.locked = true;
      }
      renderOptions();
    });
  } else {
    renderOptions();
  }

  if (stopCountdown) stopCountdown();
  stopCountdown = startCountdown(
    latestState.questionEndsAt,
    latestState.questionDurationMs,
    (remaining, fraction) => {
      timerFill.style.width = `${fraction * 100}%`;
      if (fraction < 0.2) timerFill.classList.add("urgent");
    },
    () => {
      if (!myAnswer.locked) statusMsg.textContent = "Čas vypršel.";
    }
  );
}

function renderReveal() {
  app.innerHTML = "";
  const mine = latestState.lastResults
    ? latestState.lastResults.find((r) => r.teamId === myTeamId)
    : null;

  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `Otázka ${latestState.questionIndex + 1} / ${latestState.totalQuestions}`;
  app.appendChild(eyebrow);

  const h1 = document.createElement("h1");
  if (!mine || !mine.answered) {
    h1.textContent = "Nestihli jste odpovědět";
  } else if (mine.correct) {
    h1.textContent = mine.rank === 1 ? "Nejrychlejší správná odpověď! 🏆" : "Správně!";
  } else {
    h1.textContent = "Bohužel špatně";
  }
  app.appendChild(h1);

  if (mine && mine.answered) {
    const tag = document.createElement("div");
    tag.className = "tag " + (mine.correct ? "green" : "red");
    tag.textContent = mine.correct ? `+${mine.points} bodů` : "+0 bodů";
    app.appendChild(tag);
  }

  const correctIdx = latestState.currentQuestion.correct;
  const p = document.createElement("p");
  p.style.marginTop = "16px";
  p.innerHTML = `Správná odpověď: <strong>${LETTERS[correctIdx]}) ${escapeHtml(
    latestState.currentQuestion.options[correctIdx]
  )}</strong>`;
  app.appendChild(p);

  const div = document.createElement("div");
  div.className = "divider";
  app.appendChild(div);

  const scoreLine = document.createElement("div");
  scoreLine.className = "eyebrow";
  scoreLine.textContent = "Celkové skóre týmu";
  app.appendChild(scoreLine);
  const score = document.createElement("h1");
  score.textContent = myTeam() ? myTeam().score : "0";
  app.appendChild(score);

  app.appendChild(teamListEl(latestState.teams, { compact: true, highlight: myTeamId }));
}

function renderPause() {
  app.innerHTML = "";
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Pauza";
  app.appendChild(eyebrow);
  const h1 = document.createElement("h1");
  h1.textContent = "Konec kola 1";
  app.appendChild(h1);
  const p = document.createElement("p");
  p.textContent = "Doplňte energii, proberte skóre. Kolo 2 začne za chvíli.";
  app.appendChild(p);
  app.appendChild(teamListEl(latestState.teams, { highlight: myTeamId }));
}

function renderFinal() {
  app.innerHTML = "";
  const teams = latestState.teams;
  const myRank = teams.findIndex((t) => t.id === myTeamId) + 1;
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Konec hry";
  app.appendChild(eyebrow);
  const h1 = document.createElement("h1");
  if (myRank === 1) {
    h1.textContent = "Vyhráli jste! 🏆";
  } else if (myRank) {
    h1.textContent = `Skončili jste na ${myRank}. místě`;
  } else {
    h1.textContent = "Díky za hru!";
  }
  app.appendChild(h1);
  app.appendChild(teamListEl(teams, { highlight: myTeamId }));
}

function teamListEl(teams, opts = {}) {
  const ul = document.createElement("ul");
  ul.className = "team-list";
  teams.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "team-row" + (i < 3 ? ` rank-${i + 1}` : "") + (t.connected ? "" : " offline");
    li.innerHTML = `
      <div class="rank">${i + 1}</div>
      <div class="dot"></div>
      <div class="name">${escapeHtml(t.name)}${t.id === opts.highlight ? " (ty)" : ""}</div>
      <div class="score">${t.score}</div>
    `;
    ul.appendChild(li);
  });
  return ul;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  if (!latestState) return;

  if (!myTeamId || !myTeam()) {
    if (stopCountdown) stopCountdown();
    renderJoinScreen();
    return;
  }

  if (latestState.phase !== "QUESTION") {
    // leaving the question screen — next QUESTION phase is a fresh render
    lastRenderedKey = null;
  }

  switch (latestState.phase) {
    case "LOBBY":
      if (stopCountdown) stopCountdown();
      renderLobbyJoined();
      break;
    case "ROUND_INTRO":
      if (stopCountdown) stopCountdown();
      renderRoundIntro();
      break;
    case "QUESTION": {
      // The server re-broadcasts state whenever ANY team answers. Re-running
      // renderQuestion() for a question we're already showing would tear
      // down the DOM mid-click and lose the player's own selection — so
      // only (re)build it the first time we see this question's key.
      const key = `${latestState.round}-${latestState.questionIndex}`;
      if (key !== lastRenderedKey) renderQuestion();
      break;
    }
    case "REVEAL":
      if (stopCountdown) stopCountdown();
      renderReveal();
      break;
    case "PAUSE":
      if (stopCountdown) stopCountdown();
      renderPause();
      break;
    case "FINAL":
      if (stopCountdown) stopCountdown();
      renderFinal();
      break;
    default:
      break;
  }
}

render();
