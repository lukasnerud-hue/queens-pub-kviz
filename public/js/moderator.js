const socket = io();
const app = document.getElementById("app");

const KEY_STORE = "qp_host_key";
let hostKey = localStorage.getItem(KEY_STORE) || "";
let authed = false;
let authError = null;
let latestState = null;
let actionPending = false;
let stopModCountdown = null;

socket.on("connect", () => {
  if (hostKey) tryAuth(hostKey);
});

socket.on("state", (state) => {
  latestState = state;
  render();
});

function tryAuth(key) {
  socket.emit("host:auth", key, (res) => {
    if (res.error) {
      authed = false;
      authError = res.error;
      localStorage.removeItem(KEY_STORE);
      hostKey = "";
    } else {
      authed = true;
      authError = null;
      localStorage.setItem(KEY_STORE, key);
    }
    render();
  });
}

function call(event, payload) {
  actionPending = true;
  render();
  socket.emit(event, payload, (res) => {
    actionPending = false;
    if (res && res.error) {
      alert(res.error);
    }
    render();
  });
}

function renderAuthScreen() {
  app.innerHTML = "";
  app.style.alignItems = "center";
  app.appendChild(logoBadge());
  const h1 = document.createElement("h1");
  h1.textContent = "Moderátor";
  app.appendChild(h1);
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    ${authError ? `<div class="error-msg">${authError}</div>` : ""}
    <div class="field">
      <label>Přístupový klíč moderátora</label>
      <input type="text" id="key-input" placeholder="Klíč z terminálu / HOST_KEY.txt" autocomplete="off" />
    </div>
    <button class="btn" id="key-submit">Přihlásit se</button>
  `;
  app.appendChild(card);
  document.getElementById("key-submit").addEventListener("click", () => {
    const v = document.getElementById("key-input").value.trim();
    if (v) tryAuth(v);
  });
}

function teamRowsAdmin(teams, allowKick) {
  const ul = document.createElement("ul");
  ul.className = "team-list";
  if (teams.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Zatím se nepřihlásil žádný tým.";
    ul.appendChild(li);
    return ul;
  }
  teams.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "team-row" + (i < 3 ? ` rank-${i + 1}` : "") + (t.connected ? "" : " offline");
    li.innerHTML = `
      <div class="rank">${i + 1}</div>
      <div class="dot"></div>
      <div class="name">${escapeHtml(t.name)}</div>
      <div class="score">${t.score}</div>
    `;
    if (allowKick) {
      const btn = document.createElement("button");
      btn.className = "kick-btn";
      btn.textContent = "Vyhodit";
      btn.addEventListener("click", () => {
        if (confirm(`Vyhodit tým „${t.name}“?`)) call("host:kick", t.id);
      });
      li.appendChild(btn);
    }
    ul.appendChild(li);
  });
  return ul;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function header() {
  const wrap = document.createElement("div");
  wrap.className = "mod-header";
  wrap.innerHTML = `
    <div>
      <div class="eyebrow">Moderátor · Queen's Pub Kvíz</div>
      <div class="muted">Fáze: ${phaseLabel(latestState.phase)}${
    latestState.roundTitle && latestState.phase !== "LOBBY"
      ? " · Kolo " + latestState.round + ": " + latestState.roundTitle
      : ""
  }</div>
    </div>
    <div class="pin-pill">PIN ${latestState.pin}</div>
  `;
  return wrap;
}

function phaseLabel(p) {
  return (
    {
      LOBBY: "Lobby — čekání na týmy",
      ROUND_INTRO: "Úvod kola",
      QUESTION: "Otázka běží",
      REVEAL: "Vyhodnocení",
      PAUSE: "Pauza",
      FINAL: "Konec hry",
    }[p] || p
  );
}

function panel(innerNodes) {
  const div = document.createElement("div");
  div.className = "panel";
  innerNodes.forEach((n) => div.appendChild(n));
  return div;
}

function bigBtn(label, onClick, opts = {}) {
  const btn = document.createElement("button");
  btn.className = "btn" + (opts.danger ? " btn-danger" : opts.outline ? " btn-outline" : "");
  btn.textContent = label;
  btn.disabled = actionPending || opts.disabled;
  btn.addEventListener("click", onClick);
  return btn;
}

function render() {
  if (stopModCountdown) {
    stopModCountdown();
    stopModCountdown = null;
  }
  app.innerHTML = "";
  app.style.alignItems = "";

  if (!authed) {
    app.style.alignItems = "center";
    renderAuthScreen();
    return;
  }
  if (!latestState) return;

  const wrap = document.createElement("div");
  wrap.className = "mod-wrap";
  wrap.appendChild(header());

  const s = latestState;

  if (s.phase === "LOBBY") {
    const p1 = document.createElement("p");
    p1.textContent = `Přihlášeno ${s.teamCount} týmů. Ukaž hráčům PIN a ať se připojí na adrese téhle appky.`;
    const startBtn = bigBtn("Uzamknout registraci a spustit Kolo 1", () => call("host:lockAndStart"), {
      disabled: s.teamCount === 0,
    });
    wrap.appendChild(panel([p1, startBtn]));
    const h3 = document.createElement("h3");
    h3.textContent = "Přihlášené týmy";
    wrap.appendChild(h3);
    wrap.appendChild(teamRowsAdmin(s.teams, true));
  }

  if (s.phase === "ROUND_INTRO") {
    const h2 = document.createElement("h2");
    h2.textContent = `Kolo ${s.round}: ${s.roundTitle}`;
    const btn = bigBtn(
      s.questionIndex + 1 < s.totalQuestions ? "Spustit první otázku" : "Spustit otázku",
      () => call("host:startQuestion")
    );
    wrap.appendChild(panel([h2, btn]));
    wrap.appendChild(teamRowsAdmin(s.teams, false));
  }

  if (s.phase === "QUESTION") {
    const idx = document.createElement("div");
    idx.className = "question-index";
    idx.textContent = `Otázka ${s.questionIndex + 1} / ${s.totalQuestions}`;
    const q = document.createElement("div");
    q.className = "mod-preview-q";
    q.textContent = s.currentQuestion.text;
    const optsWrap = document.createElement("div");
    s.currentQuestion.options.forEach((o, i) => {
      const d = document.createElement("div");
      d.className = "mod-preview-opt";
      d.textContent = `${LETTERS[i]}) ${o}`;
      optsWrap.appendChild(d);
    });
    const counter = document.createElement("p");
    counter.innerHTML = `<strong>${s.answeredCount} / ${s.teamCount}</strong> týmů odpovědělo`;
    const timerDiv = document.createElement("div");
    timerDiv.className = "timer-bar-wrap";
    const timerFill = document.createElement("div");
    timerFill.className = "timer-bar-fill";
    timerDiv.appendChild(timerFill);
    const endBtn = bigBtn("Ukončit otázku teď a zobrazit výsledky", () => call("host:forceReveal"));
    wrap.appendChild(panel([idx, q, optsWrap, counter, timerDiv, endBtn]));

    stopModCountdown = startCountdown(s.questionEndsAt, s.questionDurationMs, (remaining, fraction) => {
      timerFill.style.width = `${fraction * 100}%`;
    });
  }

  if (s.phase === "REVEAL") {
    const correctIdx = s.currentQuestion.correct;
    const p = document.createElement("p");
    p.innerHTML = `Správná odpověď: <strong>${LETTERS[correctIdx]}) ${escapeHtml(
      s.currentQuestion.options[correctIdx]
    )}</strong>`;
    const isLastOfRound = s.questionIndex + 1 >= s.totalQuestions;
    let nextLabel = "Další otázka";
    if (isLastOfRound && s.round === 1) nextLabel = "Ukončit kolo 1 a zobrazit pauzu";
    if (isLastOfRound && s.round === 2) nextLabel = "Zobrazit finální výsledky";
    const nextBtn = bigBtn(nextLabel, () => call("host:advance"));
    wrap.appendChild(panel([p, nextBtn]));

    const h3 = document.createElement("h3");
    h3.textContent = "Celkové pořadí";
    wrap.appendChild(h3);
    wrap.appendChild(teamRowsAdmin(s.teams, false));
  }

  if (s.phase === "PAUSE") {
    const p = document.createElement("p");
    p.textContent = "Konec kola 1. Týmy zůstávají přihlášené se svými body.";
    const btn = bigBtn("Spustit Kolo 2", () => call("host:startRound2"));
    wrap.appendChild(panel([p, btn]));
    const h3 = document.createElement("h3");
    h3.textContent = "Průběžné pořadí";
    wrap.appendChild(h3);
    wrap.appendChild(teamRowsAdmin(s.teams, false));
  }

  if (s.phase === "FINAL") {
    const p = document.createElement("p");
    p.textContent = "Hra skončila. Finální pořadí:";
    wrap.appendChild(panel([p]));
    wrap.appendChild(teamRowsAdmin(s.teams, false));
  }

  const footer = document.createElement("div");
  footer.className = "footer-actions";
  const newGameBtn = bigBtn("Nová hra (smaže týmy a skóre)", () => {
    if (confirm("Opravdu spustit novou hru? Smažou se všechny týmy a skóre.")) {
      call("host:newGame");
    }
  }, { danger: true });
  newGameBtn.style.width = "auto";
  footer.appendChild(newGameBtn);
  wrap.appendChild(footer);

  app.appendChild(wrap);
}
