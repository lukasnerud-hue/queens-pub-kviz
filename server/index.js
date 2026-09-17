const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { GameState } = require("./gameState");

const PORT = process.env.PORT || 3000;
// A gate against randomly poking the moderator controls, not a real secret —
// fine as a fixed default even in a public repo. Override with a HOST_KEY
// env var if you ever want a different one without editing code.
const HOST_KEY = process.env.HOST_KEY || "QUEENSMOD2025";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, "..", "public"), { extensions: ["html"] }));

const game = new GameState((publicState) => {
  io.emit("state", publicState);
});

// teamId -> Set of active socket ids, used to debounce connect/disconnect flicker
const activeSocketsByTeam = new Map();

function markTeamOnline(teamId, socketId) {
  if (!activeSocketsByTeam.has(teamId)) activeSocketsByTeam.set(teamId, new Set());
  const set = activeSocketsByTeam.get(teamId);
  const wasEmpty = set.size === 0;
  set.add(socketId);
  if (wasEmpty) game.setTeamConnected(teamId, true);
}

function markTeamMaybeOffline(teamId, socketId) {
  const set = activeSocketsByTeam.get(teamId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    setTimeout(() => {
      const stillEmpty = (activeSocketsByTeam.get(teamId) || new Set()).size === 0;
      if (stillEmpty) game.setTeamConnected(teamId, false);
    }, 5000);
  }
}

io.on("connection", (socket) => {
  socket.emit("state", game.publicState());
  socket.emit("hello", { });

  socket.on("player:join", (payload, cb) => {
    const { pin, name } = payload || {};
    const res = game.joinTeam(pin, name);
    if (res.error) return cb && cb(res);
    socket.data.teamId = res.teamId;
    markTeamOnline(res.teamId, socket.id);
    cb && cb(res);
  });

  socket.on("player:rejoin", (payload, cb) => {
    const { gameId, teamId, token } = payload || {};
    const res = game.rejoinTeam(gameId, teamId, token);
    if (res.error) return cb && cb(res);
    socket.data.teamId = res.teamId;
    markTeamOnline(res.teamId, socket.id);
    cb && cb(res);
  });

  socket.on("player:myStatus", (payload, cb) => {
    if (!socket.data.teamId) return cb && cb({ answered: false });
    cb && cb(game.myAnswerStatus(socket.data.teamId));
  });

  socket.on("player:answer", (choiceIndex, cb) => {
    if (!socket.data.teamId) return cb && cb({ error: "Nejsi přihlášen." });
    const res = game.submitAnswer(socket.data.teamId, choiceIndex);
    cb && cb(res);
  });

  socket.on("host:auth", (key, cb) => {
    if (key === HOST_KEY) {
      socket.data.isHost = true;
      return cb && cb({ ok: true });
    }
    cb && cb({ error: "Špatný přístupový klíč moderátora." });
  });

  function hostAction(handler) {
    return (payload, cb) => {
      if (!socket.data.isHost) return cb && cb({ error: "Nejsi přihlášen jako moderátor." });
      const res = handler(payload);
      cb && cb(res);
    };
  }

  socket.on("host:selectPack", hostAction((packId) => game.selectPack(packId)));
  socket.on("host:lockAndStart", hostAction(() => game.lockRegistrationAndStartRound1()));
  socket.on("host:startQuestion", hostAction(() => game.startQuestion()));
  socket.on("host:forceReveal", hostAction(() => game.forceReveal()));
  socket.on("host:advance", hostAction(() => game.advanceAfterReveal()));
  socket.on("host:startRound2", hostAction(() => game.startRound2()));
  socket.on("host:newGame", hostAction(() => game.newGame()));
  socket.on("host:kick", hostAction((teamId) => game.kickTeam(teamId)));

  socket.on("disconnect", () => {
    if (socket.data.teamId) {
      markTeamMaybeOffline(socket.data.teamId, socket.id);
    }
  });
});

httpServer.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const lanIps = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) lanIps.push(net.address);
    }
  }
  console.log("");
  console.log("========================================");
  console.log("  QUEEN'S PUB KVÍZ — server běží");
  console.log("========================================");
  console.log(`  Na tomto počítači: http://localhost:${PORT}`);
  lanIps.forEach((ip) => console.log(`  Na wifi podniku:    http://${ip}:${PORT}`));
  console.log("");
  console.log(`  Moderátorský klíč: ${HOST_KEY}`);
  console.log(`  (otevři /moderator a zadej tento klíč)`);
  console.log("========================================");
  console.log("");

  try {
    fs.writeFileSync(
      path.join(__dirname, "..", "HOST_KEY.txt"),
      `Moderátorský klíč pro dnešní spuštění serveru: ${HOST_KEY}\n` +
        `Otevři na moderátorském zařízení: http://localhost:${PORT}/moderator\n` +
        (lanIps.length ? `Nebo přes wifi: http://${lanIps[0]}:${PORT}/moderator\n` : "")
    );
  } catch (e) {
    // non-fatal
  }
});
