// Gera img/og.jpg (a imagem que aparece quando alguém cola o link do site no Discord, WhatsApp etc.) fotografando tools/og.html
// num Chrome headless, com as fontes do site.   node tools/gerar_og.mjs   (precisa do servidor local: python -m http.server 8765)
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "http://127.0.0.1:8765";
const porta = 9800 + Math.floor(Math.random() * 100);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "og_"))}`, "--disable-gpu", "--no-first-run", "about:blank"], { stdio: "ignore" });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${porta}/json/version`)).ok) break;
    } catch {
      /* abrindo */
    }
    await dorme(250);
  }
  const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener("open", ok));
  let n = 0;
  const pend = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) pend.get(m.id)(m.result);
  });
  const envia = (method, params = {}) => new Promise((ok) => {
    pend.set(++n, ok);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  await envia("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  await envia("Page.navigate", { url: `${BASE}/tools/og.html` });
  await dorme(2500);
  const foto = await envia("Page.captureScreenshot", { format: "jpeg", quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  writeFileSync(join(RAIZ, "img", "og.jpg"), Buffer.from(foto.data, "base64"));
  console.log("img/og.jpg gerada (1200x630)");
} finally {
  chrome.kill();
}
process.exit(0);
