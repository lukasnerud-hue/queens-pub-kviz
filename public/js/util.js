// Sdílené pomocné funkce pro všechny obrazovky (hráč, moderátor, TV).

const LETTERS = ["A", "B", "C"];

function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function logoBadge() {
  const div = document.createElement("div");
  div.className = "logo-badge";
  div.innerHTML = `<img src="/img/logo.png" alt="Queen's Pub logo" />`;
  return div;
}

// Odpočet napojený na server-authoritative `endsAt` timestamp (ms epoch).
// onTick(remainingMs, fractionRemaining), onDone() volané jednou při doběhnutí.
function startCountdown(endsAt, durationMs, onTick, onDone) {
  let doneFired = false;
  const tick = () => {
    const remaining = endsAt - Date.now();
    const fraction = Math.min(1, Math.max(0, remaining / durationMs));
    onTick(remaining, fraction);
    if (remaining <= 0 && !doneFired) {
      doneFired = true;
      onDone && onDone();
    }
  };
  tick();
  const interval = setInterval(tick, 200);
  return () => clearInterval(interval);
}

function renderQr(canvasEl, text) {
  if (typeof qrcode === "undefined") return;
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  const cell = Math.floor(canvasEl.width / size);
  const offset = Math.floor((canvasEl.width - cell * size) / 2);
  const ctx = canvasEl.getContext("2d");
  ctx.fillStyle = "#f5f1e6";
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.fillStyle = "#121210";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(offset + col * cell, offset + row * cell, cell, cell);
      }
    }
  }
}
