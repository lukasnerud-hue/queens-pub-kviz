const socket = io();
const app = document.getElementById("app");

let latestState = null;
let stopTvCountdown = null;
let lastRenderedKey = null;

socket.on("state", (state) => {
  latestState = state;
  render();
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function teamListEl(teams) {
  const ul = document.createElement("ul");
  ul.className = "team-list";
  teams.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "team-row" + (i < 3 ? ` rank-${i + 1}` : "") + (t.connected ? "" : " offline");
    li.innerHTML = `
      <div class="rank">${i + 1}</div>
      <div class="dot"></div>
      <div class="name">${escapeHtml(t.name)}</div>
      <div class="score">${t.score}</div>
    `;
    ul.appendChild(li);
  });
  return ul;
}

function renderLobby() {
  app.innerHTML = "";
  app.appendChild(logoBadge());
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Queen's Pub Kvíz";
  app.appendChild(eyebrow);
  const h1 = document.createElement("h1");
  h1.textContent = "Přidej se ke hře";
  app.appendChild(h1);

  if (latestState.packTitle) {
    const theme = document.createElement("div");
    theme.className = "tag gold";
    theme.textContent = latestState.packTitle;
    app.appendChild(theme);
  }

  const row = document.createElement("div");
  row.className = "row";
  row.style.alignItems = "flex-start";

  const pinCol = document.createElement("div");
  pinCol.innerHTML = `<div class="eyebrow">PIN hry</div>`;
  const pinDisplay = document.createElement("div");
  pinDisplay.className = "pin-display";
  pinDisplay.textContent = latestState.pin;
  pinCol.appendChild(pinDisplay);
  const urlP = document.createElement("div");
  urlP.className = "muted";
  urlP.textContent = window.location.origin.replace(/^https?:\/\//, "");
  pinCol.appendChild(urlP);
  row.appendChild(pinCol);

  const qrCol = document.createElement("div");
  const qrBox = document.createElement("div");
  qrBox.className = "qr-box";
  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 220;
  qrBox.appendChild(canvas);
  qrCol.appendChild(qrBox);
  row.appendChild(qrCol);

  app.appendChild(row);
  renderQr(canvas, window.location.origin + "/");

  const sub = document.createElement("p");
  sub.textContent = "Naskenuj QR nebo otevři adresu výše, zadej PIN a název týmu.";
  app.appendChild(sub);

  const div = document.createElement("div");
  div.className = "divider";
  app.appendChild(div);

  const h3 = document.createElement("h3");
  h3.textContent = `Přihlášené týmy (${latestState.teamCount})`;
  app.appendChild(h3);
  app.appendChild(teamListEl(latestState.teams));
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
  p.textContent = "20 otázek. 3 minuty na každou. Připravte se!";
  app.appendChild(p);
}

function renderQuestion() {
  const key = `${latestState.round}-${latestState.questionIndex}`;
  lastRenderedKey = key;

  app.innerHTML = "";
  const idx = document.createElement("div");
  idx.className = "question-index";
  idx.textContent = `Otázka ${latestState.questionIndex + 1} / ${latestState.totalQuestions}`;
  app.appendChild(idx);

  const timerWrap = document.createElement("div");
  timerWrap.className = "timer-ring-wrap";
  timerWrap.innerHTML = `
    <svg viewBox="0 0 120 120">
      <circle class="timer-ring-bg" cx="60" cy="60" r="52"></circle>
      <circle class="timer-ring-fg" id="ring-fg" cx="60" cy="60" r="52"></circle>
    </svg>
    <div class="timer-label" id="timer-label">3:00</div>
  `;
  app.appendChild(timerWrap);

  const q = document.createElement("div");
  q.className = "big-question";
  q.textContent = latestState.currentQuestion.text;
  app.appendChild(q);

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "options";
  latestState.currentQuestion.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option-btn";
    div.innerHTML = `<span class="letter">${LETTERS[i]}</span><span>${escapeHtml(opt)}</span>`;
    optionsWrap.appendChild(div);
  });
  app.appendChild(optionsWrap);

  const counter = document.createElement("p");
  counter.className = "muted";
  counter.style.marginTop = "16px";
  counter.textContent = `${latestState.answeredCount} / ${latestState.teamCount} týmů odpovědělo`;
  app.appendChild(counter);

  const ringFg = document.getElementById("ring-fg");
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  ringFg.style.strokeDasharray = `${circumference}`;
  const label = document.getElementById("timer-label");

  if (stopTvCountdown) stopTvCountdown();
  stopTvCountdown = startCountdown(
    latestState.questionEndsAt,
    latestState.questionDurationMs,
    (remaining, fraction) => {
      ringFg.style.strokeDashoffset = `${circumference * (1 - fraction)}`;
      label.textContent = fmtClock(remaining);
      if (fraction < 0.2) ringFg.classList.add("urgent");
    }
  );
}

function renderReveal() {
  app.innerHTML = "";
  const correctIdx = latestState.currentQuestion.correct;
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `Otázka ${latestState.questionIndex + 1} / ${latestState.totalQuestions} — vyhodnocení`;
  app.appendChild(eyebrow);

  const q = document.createElement("div");
  q.className = "big-question";
  q.style.marginBottom = "20px";
  q.textContent = latestState.currentQuestion.text;
  app.appendChild(q);

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "options";
  latestState.currentQuestion.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option-btn" + (i === correctIdx ? " correct" : " dim");
    div.innerHTML = `<span class="letter">${LETTERS[i]}</span><span>${escapeHtml(opt)}</span>`;
    optionsWrap.appendChild(div);
  });
  app.appendChild(optionsWrap);

  const div = document.createElement("div");
  div.className = "divider";
  app.appendChild(div);

  const h3 = document.createElement("h3");
  h3.textContent = "Celkové pořadí";
  app.appendChild(h3);
  app.appendChild(teamListEl(latestState.teams));
}

function renderPause() {
  app.innerHTML = "";
  app.appendChild(logoBadge());
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Pauza";
  app.appendChild(eyebrow);
  const h1 = document.createElement("h1");
  h1.textContent = "Konec kola 1";
  app.appendChild(h1);
  const p = document.createElement("p");
  p.textContent = "Doplňte si pití, kolo 2 začne za chvíli.";
  app.appendChild(p);
  app.appendChild(teamListEl(latestState.teams));
}

function renderFinal() {
  app.innerHTML = "";
  const teams = latestState.teams;
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Queen's Pub Kvíz";
  app.appendChild(eyebrow);
  const h1 = document.createElement("h1");
  h1.textContent = teams[0] ? `Vítěz: ${teams[0].name} 🏆` : "Konec hry";
  app.appendChild(h1);
  app.appendChild(teamListEl(teams));
}

function render() {
  if (stopTvCountdown) {
    stopTvCountdown();
    stopTvCountdown = null;
  }
  if (!latestState) return;
  switch (latestState.phase) {
    case "LOBBY":
      renderLobby();
      break;
    case "ROUND_INTRO":
      renderRoundIntro();
      break;
    case "QUESTION":
      renderQuestion();
      break;
    case "REVEAL":
      renderReveal();
      break;
    case "PAUSE":
      renderPause();
      break;
    case "FINAL":
      renderFinal();
      break;
    default:
      break;
  }
}
