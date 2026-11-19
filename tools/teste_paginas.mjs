// Teste em navegador de verdade do editor v2 e das páginas v2, contra a API REAL do bot rodando localmente (porta 8799) e uma cópia do site apontada para ela.
//   Precisa de: (1) a API (scratchpad/servir_api_real.py) em 127.0.0.1:8799, (2) a cópia do site com a API trocada servida em 127.0.0.1:8765.
//   node tools/teste_paginas.mjs [--saida=pasta] [--base=http://127.0.0.1:8765]
// Roda com a segurança entre origens desligada (só para teste, como tools/navegador.mjs).
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (n, p) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=") || p;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const BASE = arg("base", "http://127.0.0.1:8765");
const API = "http://127.0.0.1:8799";
const SAIDA = arg("saida", join(tmpdir(), "vulpus_paginas"));
mkdirSync(SAIDA, { recursive: true });
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const porta = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "vp_"))}`, "--disable-web-security", "--disable-site-isolation-trials", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const confere = (ok, msg) => {
  if (!ok) falhas++;
  console.log(`${ok ? "ok      " : "FALHOU  "} ${msg}`);
};

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
  async js(expr) {
    const r = await this.envia("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`${r.exceptionDetails.exception?.description || r.exceptionDetails.text} em: ${expr.slice(0, 120)}`);
    return r.result.value;
  }
}

async function esperarChrome() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${porta}/json/version`)).ok) return;
    } catch {
      // abrindo
    }
    await dorme(250);
  }
  throw new Error("o Chrome não abriu");
}

try {
  await esperarChrome();
  const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener("open", ok));
  const aba = new Aba(ws);
  for (const d of ["Page", "Runtime", "Log", "Network", "DOM"]) await aba.envia(`${d}.enable`);
  await aba.envia("Network.setCacheDisabled", { cacheDisabled: true });
  // o Chrome sem tela se apresenta como "HeadlessChrome" e a Vulpus (de propósito) não conta robôs como visita: usa um navegador comum
  await aba.envia("Network.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" });
  let problemas = [];
  aba.ouvintes.push((m) => {
    if (m.method === "Runtime.exceptionThrown") problemas.push(`exceção: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`.slice(0, 300));
    if (m.method === "Log.entryAdded" && ["error"].includes(m.params.entry.level) && !/status of (400|500)/.test(m.params.entry.text)) problemas.push(`${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url || ""}`.slice(0, 300));
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") problemas.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`.slice(0, 300));
  });
  const foto = async (nome, tela) => {
    const r = await aba.envia("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(SAIDA, `${nome}${tela ? `-${tela}` : ""}.png`), Buffer.from(r.data, "base64"));
  };
  const telaPC = () => aba.envia("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const telaCel = () => aba.envia("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const ir = async (url, ms = 2500) => { problemas = []; await aba.envia("Page.navigate", { url }); await dorme(ms); };
  const esperar = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await aba.js(`!!(${cond})`).catch(() => false)) return true; await dorme(150); } return false; };
  const digitar = (sel, v) => aba.js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  const clicar = (sel) => aba.js(`document.querySelector(${JSON.stringify(sel)}).click()`);
  const aba_editor = (nome) => aba.js(`document.querySelector('.editor-aba[data-painel="${nome}"]').click()`);
  const arquivo = async (seletor, caminho, indice = 0) => {
    const d = await aba.envia("DOM.getDocument", { depth: 1 });
    const r = await aba.envia("DOM.querySelectorAll", { nodeId: d.root.nodeId, selector: seletor });
    await aba.envia("DOM.setFileInputFiles", { files: [caminho], nodeId: r.nodeIds[indice] });
  };
  const api = (caminho, opc = {}) => aba.js(`fetch(${JSON.stringify(API + caminho)}, { ...${JSON.stringify(opc)}, headers: { Authorization: "Bearer tokQA", "Content-Type": "application/json" } }).then(async (r) => ({ s: r.status, d: await r.json().catch(() => null) }))`);

  // ------------------------------------------------------------------ sessão e editor
  await telaPC();
  await ir(`${BASE}/`, 500);
  await aba.js(`localStorage.setItem("vulpus_sessao", "tokQA")`);
  await ir(`${BASE}/pagina/editar/?tipo=kitsune`, 3000);
  confere(await esperar(`!document.getElementById("e-editor").hidden`), "editor: abriu para a Kitsune de teste");
  confere((await aba.js(`document.querySelectorAll(".editor-aba").length`)) === 10, "editor: 10 abas (básico, visual, links, música, widgets, mídia, selos, modelos, análises, endereço)");
  confere(problemas.filter((p) => !p.includes("/painel/api/eu")).length === 0, `editor: sem erro de JavaScript/CSP ao abrir (${problemas.join(" | ")})`);

  await digitar("#f-slug", "ze-raposa");
  await digitar("#f-titulo", "Zé Raposa");
  await digitar("#f-bio", "Faço coisas legais no Minecraft.");
  await dorme(1500);
  confere((await aba.js(`document.getElementById("e-salvo").textContent`)).startsWith("Salvo"), "editor: autosave salvou o rascunho");

  // mídia: enviar um PNG pela aba Mídia (de verdade, pelo input de arquivo)
  const arqPng = join(SAIDA, "teste.png");
  const sharp = Buffer.concat([PNG]);
  writeFileSync(arqPng, sharp);
  await aba_editor("midia");
  await esperar(`document.querySelector("#p-midia input[type=file]")`);
  // PNG de 1x1 é pequeno demais para a Vulpus (mínimo 16 px): o servidor TEM de recusar
  await arquivo("#p-midia input[type=file]", arqPng);
  await dorme(1500);
  confere(/passa|pequen|Não consegui|não consegui/i.test(await aba.js(`document.querySelector("#p-midia .dica[role=status]").textContent`)), "mídia: imagem 1x1 foi recusada pelo servidor com mensagem");

  // imagem de 64x64 gerada no navegador, enviada como arquivo real
  const bytes64 = await aba.js(`(async () => { const c = document.createElement("canvas"); c.width = 96; c.height = 96; const x = c.getContext("2d"); const g = x.createLinearGradient(0,0,96,96); g.addColorStop(0,"#e5731c"); g.addColorStop(1,"#d94f8c"); x.fillStyle = g; x.fillRect(0,0,96,96); const b = await new Promise((r) => c.toBlob(r, "image/png")); return Array.from(new Uint8Array(await b.arrayBuffer())); })()`);
  const arq96 = join(SAIDA, "avatar96.png");
  writeFileSync(arq96, Buffer.from(bytes64));
  await arquivo("#p-midia input[type=file]", arq96);
  confere(await esperar(`document.querySelectorAll("#p-midia .midia-cartao").length >= 1`, 6000), "mídia: imagem válida enviada e listada no gerenciador");
  await foto("editor-midia", "pc");

  // visual: layout, cores, efeitos
  await aba_editor("visual");
  await esperar(`document.querySelector("#p-visual select")`);
  await aba.js(`(() => { const s = document.querySelector("#p-visual select"); s.value = "moderno"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await dorme(300);
  // avatar: escolhe a imagem enviada
  await aba.js(`(() => { const lbl = [...document.querySelectorAll("#p-visual label")].find((l) => l.textContent === "Avatar"); const s = document.getElementById(lbl.htmlFor); s.value = s.options[1].value; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await aba.js(`(() => { const sels = [...document.querySelectorAll("#p-visual select")]; const ef = sels.find((s) => [...s.options].some((o) => o.value === "neve")); ef.value = "neve"; ef.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await dorme(800);
  confere((await aba.js(`document.querySelector("#e-previa").classList.contains("layout-moderno")`)), "visual: o layout Moderno aparece na pré-visualização na hora");
  confere((await aba.js(`!!document.querySelector("#e-previa .pg-avatar")`)), "visual: o avatar enviado aparece na pré-visualização");
  confere((await aba.js(`!!document.querySelector("#e-previa canvas.pg-fx")`)), "visual: efeito de neve (canvas) ligado");

  // links
  await aba_editor("links");
  const novoLink = (url) => aba.js(`(() => { const c = [...document.querySelectorAll("#p-links .campo")].find((x) => x.querySelector("label").textContent === "Novo link"); c.querySelector("input").value = ${JSON.stringify(url)}; [...document.querySelectorAll("#p-links button")].find((b) => b.textContent === "Adicionar link").click(); })()`);
  await novoLink("https://github.com/ze");
  await novoLink("https://discord.gg/vulpus");
  await aba.js(`[...document.querySelectorAll("#p-links button")].find((b) => b.textContent === "Adicionar só texto para copiar").click()`);
  await dorme(500);
  confere((await aba.js(`document.querySelectorAll("#e-previa .pg-link").length`)) === 3, "links: 3 links na pré-visualização (2 por URL com rede detectada + 1 para copiar)");
  confere((await aba.js(`[...document.querySelectorAll("#p-links select")].some((s) => s.value === "github")`)), "links: rede GitHub detectada pelo endereço");

  // digitação + música (WAV mínimo) + widgets
  await aba_editor("musica");
  await aba.js(`(() => { const c = document.querySelector("#p-musica"); const marcar = [...c.querySelectorAll(".campo-check")].find((x) => x.textContent.startsWith("Ligar")).querySelector("input"); marcar.click(); })()`);
  await aba.js(`[...document.querySelectorAll("#p-musica button")].find((b) => b.textContent === "Adicionar texto").click()`);
  await aba.js(`(() => { const i = [...document.querySelectorAll("#p-musica .linha-simples input")][0]; i.value = "Construtor de ilhas"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  const wav = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0x08, 0, 0]), Buffer.from("WAVEfmt "), Buffer.from([16, 0, 0, 0, 1, 0, 1, 0, 0x40, 0x1f, 0, 0, 0x80, 0x3e, 0, 0, 2, 0, 16, 0]), Buffer.from("data"), Buffer.from([0, 8, 0, 0]), Buffer.alloc(2048)]);
  const arqWav = join(SAIDA, "teste.wav");
  writeFileSync(arqWav, wav);
  await aba.js(`[...document.querySelectorAll("#p-musica button")].find((b) => b.textContent === "Adicionar faixa").click()`);
  await dorme(300);
  await arquivo("#p-musica .campo-midia input[type=file]", arqWav);
  await dorme(1500);
  await aba.js(`(() => { const c = document.querySelector("#p-musica"); const t = [...c.querySelectorAll(".campo")].find((x) => x.textContent.startsWith("Título")).querySelector("input"); t.value = "Tema da toca"; t.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await aba.js(`(() => { const c = document.querySelector("#p-musica"); const m = [...c.querySelectorAll(".campo-check")].find((x) => x.textContent.startsWith("Tenho o direito")).querySelector("input"); m.click(); })()`);
  await dorme(500);
  confere((await aba.js(`!!document.querySelector("#e-previa .pg-player audio, #e-previa .pg-player .pg-play")`)), "música: player aparece na pré-visualização com a faixa enviada");

  await aba_editor("widgets");
  const add = async (tipo) => aba.js(`(() => { const c = document.querySelector("#p-widgets"); const s = [...c.querySelectorAll("select")].find((x) => [...x.options].some((o) => o.value === "visitas")); s.value = ${JSON.stringify(tipo)}; [...c.querySelectorAll("button")].find((b) => b.textContent === "Adicionar widget").click(); })()`);
  await add("relogio");
  await add("clima");
  await add("github");
  await add("discord_servidor");
  await add("habilidades");
  await dorme(300);
  await aba.js(`(() => { const c = document.querySelector("#p-widgets"); const l = [...c.querySelectorAll(".campo")].find((x) => x.textContent.startsWith("Cidade")).querySelector("input"); l.value = "Recife"; l.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await aba.js(`(() => { const c = document.querySelector("#p-widgets"); const l = [...c.querySelectorAll(".campo")].find((x) => x.textContent.startsWith("Usuário do GitHub")).querySelector("input"); l.value = "ze"; l.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await aba.js(`(() => { const c = document.querySelector("#p-widgets"); const l = [...c.querySelectorAll(".campo")].find((x) => x.textContent.startsWith("Convite do servidor")).querySelector("input"); l.value = "discord.gg/vulpus"; l.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await dorme(500);
  confere((await aba.js(`document.querySelectorAll("#e-previa .pg-widget").length`)) === 5, "widgets: 5 widgets na pré-visualização");
  confere((await aba.js(`document.querySelector("#e-previa .w-relogio .pg-w-grande").textContent`)).includes(":"), "widgets: relógio mostra a hora de verdade");

  await dorme(1500);
  confere(/30/.test(await aba.js(`document.querySelector("#e-previa .w-clima .pg-w-corpo").textContent`)) && /Ze|ze/.test(await aba.js(`document.querySelector("#e-previa .w-github .pg-w-corpo").textContent`)), "widgets: a pré-visualização já mostra os dados reais (clima e GitHub) antes de publicar");
  await aba_editor("basico");
  await aba.js(`document.querySelector('#f-temas input[value="neve"]').click()`);
  await dorme(500);
  confere((await aba.js(`document.querySelector("#e-previa").style.getPropertyValue("--pg-texto")`)) === "#17263d" && (await aba.js(`document.querySelector("#e-previa").classList.contains("tema-neve")`)), "tema: escolher Neve muda na hora as cores da pré-visualização");
  await foto("editor-tema-neve", "pc");
  await aba.js(`document.querySelector('#f-temas input[value="floresta"]').click()`);
  await dorme(300);
  // endereço/SEO: portão desligado, mural ligado, selos
  await aba_editor("endereco");
  await aba.js(`(() => { const c = document.querySelector("#p-endereco"); const m = [...c.querySelectorAll(".campo-check")].find((x) => x.textContent.startsWith("Mural de recados")).querySelector("input"); m.click(); const v = [...c.querySelectorAll(".campo-check")].find((x) => x.textContent.startsWith("Mostrar contador")).querySelector("input"); v.click(); })()`);
  await dorme(1500);
  await foto("editor-final", "pc");

  console.log("  erros do editor antes de publicar:", JSON.stringify(await aba.js(`document.getElementById("e-erros").hidden ? "" : document.getElementById("e-erros").textContent`)), JSON.stringify(await aba.js(`document.getElementById("e-salvo").textContent`)));
  // publicar
  await clicar("#e-publicar");
  await dorme(2000);
  confere((await aba.js(`document.getElementById("e-estado-pub").textContent`)).startsWith("No ar"), "publicar: a página está no ar");
  confere(problemas.filter((p) => !/Failed to load resource.*lanyard/i.test(p)).length === 0, `editor: sem erros durante a edição (${problemas.join(" | ")})`);

  // desfazer/refazer
  await aba_editor("visual");
  await dorme(600);
  const antes = await aba.js(`document.querySelector("#e-previa").classList.contains("layout-moderno")`);
  await aba.js(`(() => { const s = document.querySelector("#p-visual select"); s.value = "elegante"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await dorme(800);
  await clicar("#b-desfazer");
  await dorme(600);
  confere(antes && (await aba.js(`document.querySelector("#e-previa").classList.contains("layout-moderno")`)), "histórico: Desfazer volta ao layout anterior");
  await clicar("#b-refazer");
  await dorme(600);
  confere(await aba.js(`document.querySelector("#e-previa").classList.contains("layout-elegante")`), "histórico: Refazer reaplica");

  // ------------------------------------------------------------------ página pública (visitante: sem a sessão da dona, senão a visita dela não conta)
  await aba.js(`localStorage.removeItem("vulpus_sessao")`);
  await ir(`${BASE}/p/?u=ze-raposa`, 3500);
  const pub = await aba.js(`({ pg2: !!document.querySelector(".pg2"), nome: document.querySelector(".pg-nome")?.textContent, links: document.querySelectorAll(".pg-link").length, widgets: document.querySelectorAll(".pg-widget").length, mural: !!document.querySelector(".pg-mural"), player: !!document.querySelector(".pg-player"), selos: [...document.querySelectorAll(".pg-selo")].map((s) => s.textContent), titulo: document.title, clima: document.querySelector(".w-clima .pg-w-corpo")?.textContent, gh: document.querySelector(".w-github .pg-w-corpo")?.textContent, srv: document.querySelector(".w-discord_servidor .pg-w-corpo")?.textContent })`);
  console.log("  pública:", JSON.stringify(pub));
  confere(pub.pg2 && pub.nome === "Zé Raposa" && pub.links === 3 && pub.widgets === 5 && pub.mural && pub.player, "pública: página v2 completa (nome, 3 links, 5 widgets, mural e player)");
  confere(pub.selos.some((s) => s.includes("Kitsune")) && pub.selos.some((s) => s.includes("Builder") === false || true), "pública: selo verificado de Kitsune aparece");
  confere(/29|30/.test(pub.clima || "") && /Ze|ze/.test(pub.gh || "") && /900/.test(pub.srv || ""), "pública: widgets de clima, GitHub e servidor do Discord com dados reais (da API)");
  confere(problemas.filter((p) => !/avatars\.githubusercontent|favicon/i.test(p)).length === 0, `pública: sem erros de JavaScript/CSP (${problemas.join(" | ")})`);
  await foto("publica", "pc");
  // clique registrado e visita contada
  await aba.js(`document.querySelector(".pg-link[href]").addEventListener("click", (e) => e.preventDefault())`);
  await clicar(".pg-link[href]");
  await dorme(1200);
  const est = await api(`/painel/api/pagina/estatisticas?tipo=kitsune&dias=7`);
  confere(est.d && est.d.atual.cliques === 1 && est.d.atual.views >= 1 && est.d.dispositivos.length === 1, `analytics: 1 clique e a visita registrados de verdade (${JSON.stringify(est.d && { a: est.d.atual, d: est.d.dispositivos })})`);

  // cada layout, em PC e celular
  const base = (await api(`/painel/api/pagina/minha?tipo=kitsune`)).d;
  for (const layout of ["classico", "moderno", "minimalista", "elegante", "portfolio"]) {
    const pagina = JSON.parse(JSON.stringify(base.pagina));
    pagina.v2.layout = layout;
    await api(`/painel/api/pagina/minha`, { method: "PUT", body: JSON.stringify({ tipo: "kitsune", slug: "ze-raposa", pagina }) });
    await api(`/painel/api/pagina/publicar`, { method: "POST", body: JSON.stringify({ tipo: "kitsune" }) });
    for (const [tela, f] of [["pc", telaPC], ["celular", telaCel]]) {
      await f();
      await ir(`${BASE}/p/?u=ze-raposa`, 2500);
      const largura = await aba.js(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
      confere(largura, `layout ${layout} (${tela}): sem rolagem horizontal`);
      await foto(`layout-${layout}`, tela);
    }
  }
  await telaPC();

  // importar o JSON da página do Kope (com banner e fundo embutidos) numa página que já tem conteúdo: a mistura não pode apagar o avatar nem os links
  await aba.js(`localStorage.setItem("vulpus_sessao", "tokQA")`);
  await telaPC();
  await ir(`${BASE}/pagina/editar/?tipo=kitsune`, 3000);
  const antesAv = await aba.js(`!!document.querySelector("#e-previa .pg-avatar")`);
  await aba_editor("modelos");
  await esperar(`document.querySelector("#p-modelos textarea")`);
  const jsonKope = readFileSync("C:/Users/Desktop/Downloads/KOPE_PAGINA/kope_pagina.json", "utf8");
  await aba.js(`(() => { const a = document.querySelector("#p-modelos textarea"); a.value = ${JSON.stringify(jsonKope)}; })()`);
  await aba.js(`[...document.querySelectorAll("#p-modelos button")].find((b) => b.textContent === "Importar para a minha página").click()`);
  await esperar(`document.querySelector("#e-previa .pg-nome")?.textContent.includes("Kope")`, 15000);
  await dorme(2500);
  const imp = await aba.js(`({ nome: document.querySelector("#e-previa .pg-nome")?.textContent, layout: [...document.querySelector("#e-previa").classList].find((c) => c.startsWith("layout-")), abas: [...document.querySelectorAll("#e-previa .pg-aba")].map((x) => x.textContent), avatar: !!document.querySelector("#e-previa .pg-avatar"), banner: !!document.querySelector("#e-previa .pg-banner"), fundo: document.querySelector("#e-previa .pg-fundo")?.style.backgroundImage.includes("/site/midia/"), links: document.querySelectorAll("#e-previa .pg-link").length, widgets: [...document.querySelectorAll("#e-previa .pg-widget")].map((w) => w.className.split(" ")[1]), blocos: document.querySelectorAll("#e-previa .bloco").length, digit: document.querySelector("#e-previa .pg-digitando")?.getAttribute("aria-label") })`);
  console.log("  importado:", JSON.stringify(imp));
  confere(imp.nome === "Hey, I'm Kope! :3" && imp.layout === "layout-elegante" && imp.abas.join() === "About me,My universe" && imp.banner && imp.fundo && imp.blocos >= 5, "importar JSON: título, layout, abas, banner, fundo e blocos entraram");
  confere(imp.avatar === antesAv && imp.links === 3, "importar JSON: avatar e links que já existiam continuaram");
  confere(["w-relogio", "w-discord_presenca", "w-minecraft", "w-projetos", "w-habilidades", "w-visitas"].every((c) => imp.widgets.includes(c)) && imp.widgets.some((c) => c === "w-github"), "importar JSON: widgets novos entraram e o GitHub que já existia ficou");
  await foto("kope-editor", "pc");
  await dorme(1500);
  await clicar("#e-publicar");
  await dorme(2000);
  await aba.js(`localStorage.removeItem("vulpus_sessao")`);
  await ir(`${BASE}/p/?u=ze-raposa`, 3500);
  await aba.js(`document.querySelectorAll(".pg-aba")[1]?.click()`);
  await dorme(1200);
  await foto("kope-publica-aba2", "pc");
  await aba.js(`document.querySelectorAll(".pg-aba")[0]?.click()`);
  await dorme(800);
  await foto("kope-publica", "pc");
  await telaCel();
  await ir(`${BASE}/p/?u=ze-raposa`, 3000);
  await foto("kope-publica", "celular");

  // explorar e nova aba do editor em celular
  await api(`/painel/api/pagina/visibilidade`, { method: "PUT", body: JSON.stringify({ tipo: "kitsune", publico: true }) });
  await ir(`${BASE}/explorar/`, 2500);
  confere((await aba.js(`document.querySelectorAll(".ex-cartao").length`)) === 1, "explorar: a página publicada e marcada aparece na vitrine");
  await foto("explorar", "pc");
  await telaCel();
  await aba.js(`localStorage.setItem("vulpus_sessao", "tokQA")`);
  await ir(`${BASE}/pagina/editar/?tipo=kitsune`, 3000);
  confere(await aba.js(`document.documentElement.scrollWidth <= window.innerWidth + 1`), "editor (celular): sem rolagem horizontal");
  await foto("editor", "celular");
} catch (e) {
  falhas++;
  console.log("ERRO NO TESTE:", e.stack || e);
} finally {
  chrome.kill();
}
console.log(falhas ? `\n${falhas} falha(s). Fotos em ${SAIDA}` : `\ntudo certo. Fotos em ${SAIDA}`);
process.exit(falhas ? 1 : 0);
