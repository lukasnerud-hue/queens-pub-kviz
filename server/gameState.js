const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ROUNDS } = require("./questions");

const QUESTION_DURATION_MS = 3 * 60 * 1000;
const POINTS_FOR_RANK = [5, 3, 1]; // 1st, 2nd, 3rd fastest correct team
const SAVE_FILE = path.join(__dirname, "..", "gamestate.save.json");

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function randomId(len = 8) {
  return crypto.randomBytes(len).toString("hex");
}

function freshState() {
  return {
    gameId: randomId(4),
    pin: randomPin(),
    phase: "LOBBY", // LOBBY | ROUND_INTRO | QUESTION | REVEAL | PAUSE | FINAL
    registrationLocked: false,
    round: 1,
    questionIndex: -1, // index within current round's question list
    questionEndsAt: null,
    teams: {}, // teamId -> { id, name, token, score, joinedAt, connected }
    answers: {}, // "round-questionIndex" -> teamId -> { choice, answeredAt, correct, points }
    lastResults: null, // computed at REVEAL for the question just closed
  };
}

class GameState {
  constructor(onChange) {
    this.onChange = onChange || (() => {});
    this.state = this._load() || freshState();
    this._revealTimer = null;
    this._scheduleAutoRevealIfNeeded();
  }

  _load() {
    try {
      const raw = fs.readFileSync(SAVE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.gameId) return parsed;
    } catch (e) {
      // no save yet, or corrupt — start fresh
    }
    return null;
  }

  _persist() {
    try {
      fs.writeFileSync(SAVE_FILE, JSON.stringify(this.state));
    } catch (e) {
      console.error("Nepodařilo se uložit stav hry:", e.message);
    }
  }

  _emit() {
    this._persist();
    this.onChange(this.publicState());
  }

  _currentRound() {
    return ROUNDS[this.state.round - 1];
  }

  _currentQuestion() {
    const round = this._currentRound();
    if (!round) return null;
    return round.questions[this.state.questionIndex] || null;
  }

  _questionKey(round = this.state.round, qIndex = this.state.questionIndex) {
    return `${round}-${qIndex}`;
  }

  _clearRevealTimer() {
    if (this._revealTimer) {
      clearTimeout(this._revealTimer);
      this._revealTimer = null;
    }
  }

  _scheduleAutoRevealIfNeeded() {
    this._clearRevealTimer();
    if (this.state.phase === "QUESTION" && this.state.questionEndsAt) {
      const ms = this.state.questionEndsAt - Date.now();
      if (ms <= 0) {
        this._reveal();
      } else {
        this._revealTimer = setTimeout(() => this._reveal(), ms);
      }
    }
  }

  // ---------- team / player actions ----------

  joinTeam(pin, name) {
    name = String(name || "").trim().slice(0, 24);
    if (!name) return { error: "Zadej název týmu." };
    if (pin !== this.state.pin) return { error: "Špatný PIN hry." };
    if (this.state.registrationLocked) {
      return { error: "Registrace týmů je uzavřená. Počkej na další hru." };
    }
    const nameLower = name.toLowerCase();
    const exists = Object.values(this.state.teams).some(
      (t) => t.name.toLowerCase() === nameLower
    );
    if (exists) return { error: "Tenhle název týmu už je zabraný, zkus jiný." };

    const id = randomId(6);
    const token = randomId(12);
    this.state.teams[id] = {
      id,
      name,
      token,
      score: 0,
      joinedAt: Date.now(),
      connected: true,
    };
    this._emit();
    return { teamId: id, token, gameId: this.state.gameId };
  }

  rejoinTeam(gameId, teamId, token) {
    if (gameId !== this.state.gameId) return { error: "expired" };
    const team = this.state.teams[teamId];
    if (!team || team.token !== token) return { error: "not_found" };
    team.connected = true;
    this._emit();
    return { teamId: team.id, token: team.token, gameId: this.state.gameId };
  }

  setTeamConnected(teamId, connected) {
    const team = this.state.teams[teamId];
    if (!team) return;
    team.connected = connected;
    this._emit();
  }

  submitAnswer(teamId, choiceIndex) {
    if (this.state.phase !== "QUESTION") return { error: "Otázka už není aktivní." };
    if (![0, 1, 2].includes(choiceIndex)) return { error: "Neplatná odpověď." };
    const team = this.state.teams[teamId];
    if (!team) return { error: "Tým nenalezen." };
    if (this.state.questionEndsAt && Date.now() > this.state.questionEndsAt) {
      return { error: "Čas vypršel." };
    }
    const key = this._questionKey();
    if (!this.state.answers[key]) this.state.answers[key] = {};
    if (this.state.answers[key][teamId]) {
      return { error: "Odpověď už byla odeslána." };
    }
    this.state.answers[key][teamId] = {
      choice: choiceIndex,
      answeredAt: Date.now(),
    };

    const totalTeams = Object.keys(this.state.teams).length;
    const answeredCount = Object.keys(this.state.answers[key]).length;
    if (totalTeams > 0 && answeredCount >= totalTeams) {
      // everyone who's registered has answered — no reason to wait out the clock
      this._reveal();
    } else {
      this._emit();
    }
    return { ok: true, choice: choiceIndex };
  }

  myAnswerStatus(teamId) {
    if (this.state.phase !== "QUESTION") return { answered: false };
    const key = this._questionKey();
    const a = this.state.answers[key] && this.state.answers[key][teamId];
    return a ? { answered: true, choice: a.choice } : { answered: false };
  }

  // ---------- host actions ----------

  lockRegistrationAndStartRound1() {
    if (this.state.phase !== "LOBBY") return { error: "Hra už byla spuštěna." };
    if (Object.keys(this.state.teams).length === 0) {
      return { error: "Ještě se nepřihlásil žádný tým." };
    }
    this.state.registrationLocked = true;
    this.state.phase = "ROUND_INTRO";
    this.state.round = 1;
    this.state.questionIndex = -1;
    this._emit();
    return { ok: true };
  }

  startQuestion() {
    if (!["ROUND_INTRO", "REVEAL"].includes(this.state.phase)) {
      return { error: "Teď nelze spustit otázku." };
    }
    const round = this._currentRound();
    const nextIndex = this.state.questionIndex + 1;
    if (nextIndex >= round.questions.length) {
      return { error: "V kole už nejsou další otázky." };
    }
    this.state.questionIndex = nextIndex;
    this.state.phase = "QUESTION";
    this.state.questionEndsAt = Date.now() + QUESTION_DURATION_MS;
    this.state.lastResults = null;
    this._emit();
    this._scheduleAutoRevealIfNeeded();
    return { ok: true };
  }

  forceReveal() {
    if (this.state.phase !== "QUESTION") return { error: "Otázka není aktivní." };
    this._reveal();
    return { ok: true };
  }

  _reveal() {
    this._clearRevealTimer();
    const q = this._currentQuestion();
    if (!q) return;
    const key = this._questionKey();
    const answers = this.state.answers[key] || {};

    const correctAnswers = Object.entries(answers)
      .filter(([, a]) => a.choice === q.correct)
      .sort((a, b) => a[1].answeredAt - b[1].answeredAt);

    correctAnswers.forEach(([teamId, a], idx) => {
      a.correct = true;
      a.points = POINTS_FOR_RANK[idx] || 0;
      a.rank = idx + 1;
      if (this.state.teams[teamId]) {
        this.state.teams[teamId].score += a.points;
      }
    });

    Object.entries(answers).forEach(([, a]) => {
      if (a.correct === undefined) {
        a.correct = false;
        a.points = 0;
      }
    });

    const results = Object.entries(this.state.teams).map(([teamId, team]) => {
      const a = answers[teamId];
      return {
        teamId,
        name: team.name,
        answered: !!a,
        choice: a ? a.choice : null,
        correct: a ? a.correct : false,
        points: a ? a.points : 0,
        rank: a && a.rank ? a.rank : null,
        totalScore: team.score,
      };
    });
    results.sort((a, b) => b.totalScore - a.totalScore);

    this.state.phase = "REVEAL";
    this.state.questionEndsAt = null;
    this.state.lastResults = results;
    this._emit();
  }

  advanceAfterReveal() {
    if (this.state.phase !== "REVEAL") return { error: "Není co posunout." };
    const round = this._currentRound();
    const isLastOfRound = this.state.questionIndex >= round.questions.length - 1;

    if (!isLastOfRound) {
      // still REVEAL — startQuestion() accepts REVEAL as a valid predecessor
      return this.startQuestion();
    }

    if (this.state.round === 1) {
      this.state.phase = "PAUSE";
      this._emit();
      return { ok: true };
    }

    this.state.phase = "FINAL";
    this._emit();
    return { ok: true };
  }

  startRound2() {
    if (this.state.phase !== "PAUSE") return { error: "Teď nelze spustit kolo 2." };
    this.state.round = 2;
    this.state.questionIndex = -1;
    this.state.phase = "ROUND_INTRO";
    this._emit();
    return { ok: true };
  }

  newGame() {
    this.state = freshState();
    this._clearRevealTimer();
    this._emit();
    return { ok: true };
  }

  kickTeam(teamId) {
    if (!this.state.teams[teamId]) return { error: "Tým nenalezen." };
    delete this.state.teams[teamId];
    this._emit();
    return { ok: true };
  }

  // ---------- serialization ----------

  publicState() {
    const s = this.state;
    const round = this._currentRound();
    const totalQuestions = round ? round.questions.length : 0;
    const key = this._questionKey();
    const answeredCount = s.answers[key] ? Object.keys(s.answers[key]).length : 0;

    let currentQuestion = null;
    if (["QUESTION", "REVEAL"].includes(s.phase) && this._currentQuestion()) {
      const q = this._currentQuestion();
      currentQuestion = {
        text: q.text,
        options: q.options,
        correct: s.phase === "REVEAL" ? q.correct : null,
      };
    }

    const teams = Object.values(s.teams)
      .map((t) => ({
        id: t.id,
        name: t.name,
        score: t.score,
        connected: t.connected,
        joinedAt: t.joinedAt,
      }))
      .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);

    return {
      gameId: s.gameId,
      pin: s.pin,
      phase: s.phase,
      registrationLocked: s.registrationLocked,
      round: s.round,
      roundTitle: round ? round.title : null,
      totalRounds: ROUNDS.length,
      questionIndex: s.questionIndex,
      totalQuestions,
      questionEndsAt: s.questionEndsAt,
      questionDurationMs: QUESTION_DURATION_MS,
      currentQuestion,
      answeredCount,
      teamCount: teams.length,
      teams,
      lastResults: s.phase === "REVEAL" ? s.lastResults : null,
    };
  }
}

module.exports = { GameState, QUESTION_DURATION_MS };
