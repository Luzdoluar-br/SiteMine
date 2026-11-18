// Abre o site num Chrome de verdade (headless), em tamanho de computador e de celular, e confere o que só o navegador sabe:
//   - erros de JavaScript, violações da política de conteúdo (CSP) e requisições que falharam
//   - rolagem horizontal (algo mais largo que a tela)
//   - altura da página; salva uma foto da página inteira de cada uma
// Sem dependências: usa o Chrome instalado e o protocolo DevTools.
//   node tools/navegador.mjs [--saida=pasta] [--celular] [--so=kiza,home] [--base=http://127.0.0.1:8765]
// Precisa de um servidor local do site (ex.: python -m http.server 8765 dentro da pasta do site).
// ATENÇÃO: roda com a segurança entre origens desligada (a API do bot só responde para o endereço de produção, então localmente o
// navegador a bloquearia). É só para teste; nunca use esse Chrome para navegar.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (nome, padrao) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || "").split("=").slice(1).join("=") || padrao;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!CHROME) throw new Error("não achei o Chrome nem o Edge");
const BASE = arg("base", "http://127.0.0.1:8765");
const SAIDA = arg("saida", join(tmpdir(), "vulpus_fotos"));
const SO = arg("so", "").split(",").filter(Boolean);
const PAGINAS = [
  ["inicio", "/"], ["comunidade", "/comunidade/"], ["rankings", "/rankings/"], ["mural", "/mural/"], ["jogador", "/jogador/?nick=Hartzsx1"],
  ["plataforma", "/plataforma/"], ["kiza", "/kiza/"], ["colecao", "/colecao/"], ["kitsune", "/kitsune/"], ["como-entrar", "/como-entrar/"],
  ["habilidades", "/habilidades/"], ["conta", "/conta/"], ["home", "/home/"], ["entrar", "/entrar/"],
].filter(([n]) => !SO.length || SO.includes(n));
const TELAS = [["pc", 1440, 900, false], ...(process.argv.includes("--celular") || !process.argv.includes("--so-pc") ? [["celular", 390, 844, true]] : [])];
mkdirSync(SAIDA, { recursive: true });

const porta = 9300 + Math.floor(Math.random() * 500);
const perfil = mkdtempSync(join(tmpdir(), "vulpus_chrome_"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, "--disable-web-security", "--disable-site-isolation-trials", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarChrome() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/json/version`);
      if (r.ok) return;
    } catch {
      // ainda abrindo
    }
    await dorme(250);
  }
  throw new Error("o Chrome não abriu");
}

class Aba {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pend = new Map();
    this.ouvintes = [];
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pend.has(m.id)) {
        const { ok, falha } = this.pend.get(m.id);
        this.pend.delete(m.id);
        m.error ? falha(new Error(m.error.message)) : ok(m.result);
      } else if (m.method) for (const f of this.ouvintes) f(m);
    });
  }
  envia(metodo, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method: metodo, params }));
    return new Promise((ok, falha) => this.pend.set(id, { ok, falha }));
  }
}

async function novaAba() {
  const r = await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" });
  const alvo = await r.json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener("open", ok));
  return new Aba(ws);
}

let falhas = 0;
try {
  await esperarChrome();
  const aba = await novaAba();
  await aba.envia("Page.enable");
  await aba.envia("Runtime.enable");
  await aba.envia("Log.enable");
  await aba.envia("Network.enable");
  let problemas = [];
  aba.ouvintes.push((m) => {
    if (m.method === "Runtime.exceptionThrown") problemas.push(`exceção: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`.slice(0, 220));
    if (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level)) problemas.push(`${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url || ""}`.slice(0, 260));
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") problemas.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`.slice(0, 220));
    if (m.method === "Network.loadingFailed" && !m.params.canceled) problemas.push(`requisição falhou: ${m.params.errorText} (${m.params.blockedReason || "sem motivo"})`);
  });

  for (const [tela, largura, altura, celular] of TELAS) {
    await aba.envia("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: celular });
    for (const [nome, caminho] of PAGINAS) {
      problemas = [];
      await aba.envia("Page.navigate", { url: BASE + caminho });
      await dorme(3500); // carrega, roda os scripts e a API responde
      if (celular && nome === "inicio") {
        // o menu do celular: abre, confere que ele cobre a tela e que o Esc fecha, e fotografa aberto
        await aba.envia("Runtime.evaluate", { expression: 'document.getElementById("menuBtn").click()' });
        await dorme(500);
        const aberto = (await aba.envia("Runtime.evaluate", { returnByValue: true, expression: 'JSON.stringify({ aberto: document.getElementById("menu").classList.contains("aberto"), expandido: document.getElementById("menuBtn").getAttribute("aria-expanded"), links: document.querySelectorAll("#menu a").length })' })).result.value;
        const foto = await aba.envia("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(SAIDA, "celular_menu-aberto.png"), Buffer.from(foto.data, "base64"));
        console.log(`         menu do celular: ${aberto}`);
        await aba.envia("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
        await dorme(300);
        const fechou = (await aba.envia("Runtime.evaluate", { returnByValue: true, expression: 'document.getElementById("menu").classList.contains("aberto") ? "NÃO fechou" : "fechou com Esc"' })).result.value;
        console.log(`         ${fechou}`);
      }
      const medidas = (await aba.envia("Runtime.evaluate", { returnByValue: true, expression: `JSON.stringify({ w: document.documentElement.scrollWidth, iw: innerWidth, h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), largo: [...document.querySelectorAll("body *")].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && getComputedStyle(e).position !== "fixed" && !e.closest("[hidden]") && !e.closest(".menu:not(.aberto)"); }).slice(0, 4).map(e => e.tagName.toLowerCase() + "." + e.className) })` })).result.value;
      const { w, iw, h, largo } = JSON.parse(medidas);
      const alturaFoto = Math.min(h, 9000);
      const foto = await aba.envia("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: largura, height: alturaFoto, scale: 1 } });
      const arquivo = join(SAIDA, `${tela}_${nome}.png`);
      writeFileSync(arquivo, Buffer.from(foto.data, "base64"));
      const rolagem = w > iw + 1;
      // o /entrar/ tenta abrir minecraft:// sozinho; o Chrome recusa sem clique. Esperado (no celular o jogo abre).
      const bad = [...new Set(problemas)].filter((p) => !p.includes("minecraft://"));
      const marca = rolagem || bad.length ? "ATENÇÃO" : "ok";
      if (rolagem || bad.length) falhas++;
      console.log(`${marca.padEnd(8)} ${tela.padEnd(7)} ${nome.padEnd(12)} altura ${String(h).padStart(5)}${rolagem ? `  ROLAGEM HORIZONTAL (${w} > ${iw}; ${largo.join(", ")})` : ""}`);
      for (const p of bad) console.log(`           - ${p}`);
    }
  }
  console.log(`\nfotos em ${SAIDA}`);
} finally {
  chrome.kill();
}
process.exit(falhas ? 1 : 0);
