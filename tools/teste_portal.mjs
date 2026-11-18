// Teste em navegador de verdade do Portal do parceiro, do editor de páginas e da página pública, com a API do bot SIMULADA (Fetch interceptado).
//   node tools/teste_portal.mjs [--saida=pasta] [--base=http://127.0.0.1:8765]     (precisa de: python -m http.server 8765 na pasta do site)
// Roda com a segurança entre origens desligada, como tools/navegador.mjs: só para teste.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (n, p) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").split("=").slice(1).join("=") || p;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const BASE = arg("base", "http://127.0.0.1:8765");
const SAIDA = arg("saida", join(tmpdir(), "vulpus_portal"));
const API = "https://botmine-production-70b0.up.railway.app";
mkdirSync(SAIDA, { recursive: true });
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const porta = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "vp_"))}`, "--disable-web-security", "--disable-site-isolation-trials", "--disable-gpu", "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
let falhas = 0;
const confere = (ok, msg) => {
  if (!ok) falhas++;
  console.log(`${ok ? "ok      " : "FALHOU  "} ${msg}`);
};

// ---------------------------------------------------------------- API de mentira (estado em memória)
const estado = { sessao: true, servidores: [{ guild_id: "111", nome: "Toca do Lobo", icone: "https://cdn.discordapp.com/icons/111/a.png", kiza_presente: false, parceria: null }], rascunho: null, status: "nenhuma", parceria: null, pagina: null, kitsune: true, salvamentos: 0, falha500: false, kiza: false };
const REQ = { normal: { membros: 50, dias: 14 }, mega: { membros: 150, dias: 60 }, teto_mega: 20, mega_ativas: 3 };
function rascunhoSaida(r) {
  const faltando = [];
  if (!r.nome) faltando.push("nome");
  if (!r.convite) faltando.push("convite");
  if (!r.descricao) faltando.push("descricao");
  if (!r.texto) faltando.push("texto");
  if (!r.sem_vetos) faltando.push("sem_vetos");
  if (r.modalidade_pedida === "mega") { if (!r.equipe_ativa) faltando.push("equipe_ativa"); if (!r.canal_id) faltando.push("canal_id"); }
  return { ...r, guild_id: "111", id: 111, atualizado_em: 1790000000, pronto_para_enviar: !faltando.length, faltando };
}
function rota(metodo, url, corpo) {
  const u = new URL(url);
  const p = u.pathname;
  if (!estado.sessao && p.startsWith("/painel/api/")) return [401, { erro: "sem_sessao", mensagem: "Sua sessão acabou. Entre de novo." }];
  if (estado.falha500 && p === "/painel/api/parceiros/portal") return [500, { erro: "x" }];
  if (p === "/painel/api/parceiros/portal") return [200, { usuario: { id: "9", nome: "Ana" }, convite_kiza: "https://discord.com/oauth2/authorize?client_id=1&permissions=19456", requisitos: REQ, servidores: estado.servidores.map((s) => ({ ...s, kiza_presente: estado.kiza, parceria: estado.parceria || (estado.rascunho ? { id: 0, status: "rascunho", modalidade: "normal", modalidade_pedida: "normal", mensagem_equipe: null, atualizado_em: 1 } : null) })) }];
  if (p === "/painel/api/parceiros/rascunho" && metodo === "GET") return [200, estado.rascunho ? rascunhoSaida(estado.rascunho) : null];
  if (p === "/painel/api/parceiros/rascunho" && metodo === "PUT") {
    estado.salvamentos++;
    const erros = {};
    estado.rascunho = { nome: "", convite: "", modalidade_pedida: "normal", descricao: "", texto: "", cor: "#e5731c", banner_id: null, logo_id: null, equipe_ativa: false, sem_vetos: false, contato: "", canal_id: null, etapa: 1, ...(estado.rascunho || {}) };
    for (const [k, v] of Object.entries(corpo || {})) {
      if (k === "convite" && v && !/discord\.gg\//.test(v)) { erros.convite = "Isso não parece um convite do Discord."; continue; }
      if (k === "texto" && String(v).length > 3500) { erros.texto = "O texto passou de 3500 caracteres."; continue; }
      estado.rascunho[k] = v;
    }
    return Object.keys(erros).length ? [400, { erro: "invalido", mensagem: "Corrija os campos marcados.", erros, ...rascunhoSaida(estado.rascunho) }] : [200, rascunhoSaida(estado.rascunho)];
  }
  if (p === "/painel/api/parceiros/imagem" && metodo === "POST") return [200, { imagem_id: "a".repeat(24), url: "/painel/api/parceiros/imagem/" + "a".repeat(24), largura: 1, altura: 1 }];
  if (p.startsWith("/painel/api/parceiros/imagem/")) return [200, null, "image/png"];
  if (p === "/painel/api/parceiros/checagem") return [200, { kiza_presente: estado.kiza, convite_valido: true, pontuacao: 72, membros: 135, idade_dias: 400, itens: [{ id: "membros", rotulo: "Membros", ok: true, detalhe: "135 (mínimo 50)" }, { id: "idade", rotulo: "Idade do servidor", ok: true, detalhe: "400 dias" }, { id: "permissoes", rotulo: "Permissões da Kiza no canal", ok: null, detalhe: "confere depois que a Kiza entrar" }, { id: "equipe", rotulo: "Equipe ativa, declarada", ok: false, detalhe: "" }], canais: estado.kiza ? [{ id: "21", nome: "divulgação", pode_enviar: true }, { id: "22", nome: "regras", pode_enviar: false }] : [] }];
  if (p === "/painel/api/parceiros/previa") return [200, { embed: { titulo: "Toca do Lobo", descricao: estado.rascunho?.texto || "Texto de exemplo\n\ncom parágrafos.", cor: "#e5731c", banner: null, logo: null, convite: "https://discord.gg/abc" } }];
  if (p === "/painel/api/parceiros/canal") { estado.rascunho.canal_id = String(corpo.canal_id); return [200, { ok: true }]; }
  if (p === "/painel/api/parceiros/enviar") {
    if (!rascunhoSaida(estado.rascunho).pronto_para_enviar) return [400, { erro: "incompleto", mensagem: "Ainda faltam informações.", faltando: rascunhoSaida(estado.rascunho).faltando }];
    estado.parceria = { id: 7, status: "em_analise", modalidade: estado.rascunho.modalidade_pedida, modalidade_pedida: estado.rascunho.modalidade_pedida, mensagem_equipe: null, atualizado_em: 1 };
    estado.status = "em_analise";
    return [200, { ok: true, id: 7, status: "em_analise" }];
  }
  if (p === "/painel/api/parceiros/status") return [200, { status: estado.parceria?.status || (estado.rascunho ? "rascunho" : "nenhuma"), modalidade: estado.parceria?.modalidade || null, id: 7, historico: [{ quando: 1790000000, texto: "Pedido enviado. A equipe vai analisar." }], mensagem_equipe: null, pendencias: estado.pendencias || [] }];
  if (p === "/painel/api/parceiros/estatisticas") return [200, { entradas_mes: [{ mes: "2026-11", vulpus_no_parceiro: 0, parceiro_na_vulpus: 4 }], divulgacoes: 12, proxima: 1790100000 }];
  if (p === "/painel/api/parceiros/renovar") return [429, { erro: "cedo_demais", mensagem: "Você já renovou há pouco.", liberado_em: 1790500000 }];
  if (p === "/painel/api/parceiros/editar") return [200, { ok: true, pendente: true }];
  if (p === "/painel/api/pagina/galeria") return [200, { fundos: [{ id: "cena-toca", rotulo: "A toca", url: BASE + "/img/cenas/toca.webp" }, { id: "cena-lago", rotulo: "O lago", url: BASE + "/img/cenas/lago.webp" }], temas: ["madeira", "pergaminho", "noite", "floresta", "brasa", "neve"].map((id) => ({ id, rotulo: id })), fontes: ["alegreya", "fredoka", "nunito", "silkscreen"].map((id) => ({ id, rotulo: id })), icones: ["discord", "youtube", "twitch", "tiktok", "instagram", "twitter", "github", "site", "loja", "doacao", "outro"], limites: { blocos: 12, links: 20 } }];
  if (p === "/painel/api/pagina/minha" && metodo === "GET") return [200, { slug: estado.pagina?.slug || null, tipo: "kitsune", status: estado.pagina?.status || "nenhuma", motivo: null, pagina: estado.pagina?.pagina || null, publicada: estado.pagina?.status === "publicada", pode_editar: estado.kitsune, motivo_bloqueio: estado.kitsune ? null : "A página personalizada é um benefício do programa Kitsune.", slug_sugerido: "ana" }];
  if (p === "/painel/api/pagina/minha" && metodo === "PUT") { estado.pagina = { slug: corpo.slug, status: estado.pagina?.status || "rascunho", pagina: corpo.pagina }; return [200, { slug: corpo.slug, tipo: "kitsune", status: estado.pagina.status, pagina: corpo.pagina, publicada: false, pode_editar: true }]; }
  if (p === "/painel/api/pagina/slug") return [200, { livre: u.searchParams.get("valor") !== "ocupado", motivo: "Esse endereço já está em uso.", sugestao: "ocupado-2" }];
  if (p === "/painel/api/pagina/publicar") { estado.pagina.status = "publicada"; return [200, { slug: estado.pagina.slug, tipo: "kitsune", status: "publicada", pagina: estado.pagina.pagina, publicada: true, pode_editar: true }]; }
  if (p.startsWith("/site/pagina/") && p.endsWith("/denunciar")) return [200, { ok: true, mensagem: "Obrigada. A equipe vai olhar." }];
  if (p.startsWith("/site/pagina/")) {
    const slug = p.split("/").pop();
    if (slug === "sumida") return [404, { erro: "nao_achei" }];
    return [200, PAGINA_PUBLICA];
  }
  return [404, { erro: "rota_de_teste_sem_resposta", p }];
}
const PAGINA_PUBLICA = {
  slug: "ana-raposa", tipo: "kitsune", tema: "floresta", fonte: "fredoka", cor: "#55b36a", fundo: BASE + "/img/cenas/lago.webp", titulo: "Ana <script>alert(1)</script> Raposa", bio: "Construo pontes e conto histórias.\n\nPasse para conversar.",
  blocos: [
    { tipo: "texto", titulo: "Sobre", texto: "Linha 1\nLinha 2 com <b>tag</b>\n\nOutro parágrafo." },
    { tipo: "links", itens: [{ rotulo: "Meu canal", url: "https://youtube.com/@ana", icone: "youtube" }, { rotulo: "Perigoso", url: "javascript:alert(1)", icone: "outro" }, { rotulo: "Site", url: "https://exemplo.com.br/ana", icone: "site" }] },
    { tipo: "citacao", texto: "A toca é onde a gente se encontra.", autor: "Kiza" },
    { tipo: "cartao_minecraft", nick: "AnaRaposa", nivel: 14, rank: "Raposa Andarilha", tempo_total_s: 190000, duelos: { divisao: "Prata", elo: 1180 }, abates: { kills: 31, mortes: 19 }, kitsune: true },
    { tipo: "separador" },
    { tipo: "galeria", itens: [{ id: "cena-toca", url: BASE + "/img/cenas/toca.webp" }] },
  ],
};

// ---------------------------------------------------------------- navegador
class Aba {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.ouvintes = []; ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && this.pend.has(m.id)) { const { ok, falha } = this.pend.get(m.id); this.pend.delete(m.id); m.error ? falha(new Error(m.error.message)) : ok(m.result); } else if (m.method) for (const f of this.ouvintes) f(m); }); }
  envia(metodo, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method: metodo, params })); return new Promise((ok, falha) => this.pend.set(id, { ok, falha })); }
  async js(expr) { const r = await this.envia("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "erro no JS"); return r.result.value; }
}
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${porta}/json/version`)).ok) break; } catch { /* abrindo */ } await dorme(250); }
const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener("open", ok));
const aba = new Aba(ws);
let problemas = [];
try {
  for (const m of ["Page", "Runtime", "Log", "Network"]) await aba.envia(`${m}.enable`);
  aba.ouvintes.push((m) => {
    if (m.method === "Runtime.exceptionThrown") problemas.push(`exceção: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`.slice(0, 240));
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !m.params.entry.text.includes("status of 4") && !m.params.entry.text.includes("status of 5")) problemas.push(`log: ${m.params.entry.text} ${m.params.entry.url || ""}`.slice(0, 240));
    if (m.method === "Network.loadingFailed" && !m.params.canceled) problemas.push(`requisição falhou: ${m.params.errorText} ${m.params.blockedReason || ""}`);
  });
  await aba.envia("Fetch.enable", { patterns: [{ urlPattern: `${API}/*`, requestStage: "Request" }, { urlPattern: "https://cdn.discordapp.com/*", requestStage: "Request" }] });
  aba.ouvintes.push((m) => {
    if (m.method !== "Fetch.requestPaused") return;
    const req = m.params.request;
    const cors = [{ name: "Access-Control-Allow-Origin", value: "*" }, { name: "Access-Control-Allow-Headers", value: "*" }, { name: "Access-Control-Allow-Methods", value: "*" }];
    if (req.url.startsWith("https://cdn.discordapp.com/")) return void aba.envia("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "image/png" }], body: PNG });
    if (req.method === "OPTIONS") return void aba.envia("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 204, responseHeaders: cors });
    let corpo = null;
    try { corpo = req.postData && req.postData.startsWith("{") ? JSON.parse(req.postData) : null; } catch { corpo = null; }
    const [cod, dados, tipo] = rota(req.method, req.url, corpo);
    aba.envia("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: cod, responseHeaders: [{ name: "Content-Type", value: tipo || "application/json" }, ...cors], body: tipo ? PNG : Buffer.from(JSON.stringify(dados)).toString("base64") });
  });

  const telas = [["pc", 1440, 900, false], ["celular", 390, 844, true]];
  const foto = async (nome) => { const h = Math.min(await aba.js("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)"), 8000); const f = await aba.envia("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: await aba.js("innerWidth"), height: h, scale: 1 } }); writeFileSync(join(SAIDA, `${nome}.png`), Buffer.from(f.data, "base64")); };
  const ir = async (caminho, espera = 1800) => { problemas = []; await aba.envia("Page.navigate", { url: BASE + caminho }); await dorme(espera); };
  const sessao = async (valor) => { await aba.js(valor ? 'localStorage.setItem("vulpus_sessao","sessao-de-teste-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")' : 'localStorage.removeItem("vulpus_sessao")'); };
  const semRolagem = async (nome) => confere(!(await aba.js("document.documentElement.scrollWidth > innerWidth + 1")), `${nome}: sem rolagem horizontal`);
  const limpo = (nome) => { const ruins = [...new Set(problemas)]; confere(!ruins.length, `${nome}: sem erro de JS/CSP/rede${ruins.length ? " -> " + ruins.join(" | ") : ""}`); };
  const clica = (sel) => aba.js(`document.querySelector(${JSON.stringify(sel)}).click()`);
  const escreve = (sel, v) => aba.js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  const visivel = (id) => aba.js(`!document.getElementById(${JSON.stringify(id)}).hidden`);
  const texto = (sel) => aba.js(`document.querySelector(${JSON.stringify(sel)})?.innerText || ""`);

  await ir("/");
  for (const [tela, w, h, cel] of telas) {
    await aba.envia("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: cel });
    console.log(`\n=== ${tela} ===`);

    // ---- página pública
    await sessao(false);
    await ir("/p/?u=ana-raposa");
    confere(await aba.js('!document.getElementById("pagina").hidden'), "página pública: montou");
    confere(await aba.js('document.querySelector("#pagina h1").textContent.includes("<script>")'), "página pública: o <script> do título virou texto, não código");
    confere((await aba.js('document.querySelectorAll("#pagina script").length')) === 0, "página pública: nenhum <script> dentro da página");
    confere((await aba.js('document.querySelectorAll("#pagina .link-pagina").length')) === 2, "página pública: o link javascript: foi descartado (2 links ficaram)");
    confere((await aba.js('[...document.querySelectorAll("#pagina a")].every((a) => a.rel.includes("noopener") && a.rel.includes("nofollow"))')), "página pública: links com rel noopener nofollow");
    confere(await aba.js('document.querySelector(".pagina").classList.contains("tema-floresta") && document.querySelector(".pagina").classList.contains("fonte-fredoka")'), "página pública: tema e fonte aplicados");
    await semRolagem("página pública"); limpo("página pública"); await foto(`${tela}_p_floresta`);
    await ir("/p/?u=sumida");
    confere((await texto("#estado")).includes("não existe"), "página pública: 404 mostra mensagem");
    await ir("/p/?u=../../x");
    confere((await texto("#estado")).includes("não existe"), "página pública: endereço inválido é recusado sem chamar a API");
    await ir("/p/?u=ana-raposa");
    await clica("#denunciaAbrir"); await dorme(200);
    confere(await aba.js('document.getElementById("denunciaDialogo").open'), "denúncia: o diálogo abre");
    await escreve("#denunciaMotivo", "conteúdo ofensivo"); await clica("#denunciaEnviar"); await dorme(500);
    confere((await texto("#denunciaMsg")).includes("Obrigada"), "denúncia: confirmação aparece");

    // ---- editor (Kitsune)
    await sessao(false);
    await ir("/pagina/editar/?tipo=kitsune");
    confere(await visivel("e-entrar"), "editor: sem sessão mostra o login");
    await sessao(true); estado.sessao = true; estado.pagina = null;
    await ir("/pagina/editar/?tipo=kitsune", 2200);
    confere(await visivel("e-editor"), "editor: abriu com sessão");
    confere((await aba.js('document.getElementById("f-slug").value')) === "ana", "editor: endereço sugerido preenchido");
    await escreve("#f-titulo", "Ana Raposa"); await escreve("#f-bio", "Oi!\n\nBem-vinda.");
    await aba.js('document.querySelector("#f-temas input[value=noite]").click()');
    await aba.js('document.querySelector("#f-fontes input[value=nunito]").click()');
    await aba.js('(() => { const s = document.getElementById("f-novo"); s.value = "links"; document.getElementById("f-novo-bt").click(); })()');
    await aba.js('(() => { const s = document.getElementById("f-novo"); s.value = "texto"; document.getElementById("f-novo-bt").click(); })()');
    await dorme(300);
    await escreve("#f-blocos .link-linha input", "Meu canal");
    confere((await aba.js('document.querySelector(".pagina").classList.contains("tema-noite")')), "editor: a pré-visualização muda na hora (tema)");
    confere((await texto("#e-previa h1")).includes("Ana Raposa"), "editor: a pré-visualização mostra o título digitado");
    await dorme(1700);
    confere((await texto("#e-salvo")).includes("Salvo às"), "editor: salvou sozinho");
    confere((await aba.js('estadoSlug = document.getElementById("f-slug-msg").textContent'), true), "editor: checou o endereço");
    await clica("#e-publicar"); await dorme(800);
    confere((await texto("#e-estado-pub")).includes("No ar"), "editor: publicar mostra 'No ar'");
    await semRolagem("editor"); limpo("editor"); await foto(`${tela}_editor`);

    // ---- portal
    await sessao(false);
    await ir("/parceiros/portal/");
    confere(await visivel("p-entrar"), "portal: sem sessão mostra o login");
    await sessao(true); estado.rascunho = null; estado.parceria = null; estado.kiza = false; estado.salvamentos = 0;
    await ir("/parceiros/portal/", 2200);
    confere(await visivel("p-lista"), "portal: lista os servidores que a pessoa gerencia");
    confere((await texto("#p-servidores")).includes("Toca do Lobo"), "portal: o servidor aparece");
    await foto(`${tela}_portal_lista`);
    await clica("#p-servidores button"); await dorme(900);
    confere(await visivel("p-servidor") && (await texto("#p-conteudo")).includes("Seu servidor e o tipo"), "portal: abriu o assistente na etapa 1");
    await aba.js('document.querySelector("input[name=mod][value=mega]").click()');
    await escreve("#f-convite", "isso nao e convite");
    await dorme(1300);
    confere((await texto("#erro-convite")).includes("não parece"), "portal: erro do servidor aparece no campo certo");
    await escreve("#f-convite", "https://discord.gg/abc"); await dorme(1300);
    confere((await texto("#p-salvo")).includes("Salvo às"), "portal: salvou sozinho (autosave)");
    confere(estado.salvamentos >= 2, `portal: o servidor recebeu os salvamentos (${estado.salvamentos})`);
    await foto(`${tela}_portal_etapa1`);
    // reabrir: o rascunho volta
    await ir("/parceiros/portal/", 2200);
    await clica("#p-servidores button"); await dorme(900);
    confere((await aba.js('document.getElementById("f-convite").value')) === "https://discord.gg/abc", "portal: depois de fechar e abrir de novo, o rascunho continua lá");
    await clica(".nav-etapas .botao:last-child"); await dorme(600);
    confere((await texto("#p-conteudo")).includes("Como o seu servidor aparece"), "portal: etapa 2 (apresentação)");
    await escreve("#f-descricao", "Construtores e exploradores."); await escreve("#f-texto", "Somos uma comunidade acolhedora.\n\nVenha!"); await dorme(1300);
    await foto(`${tela}_portal_etapa2`);
    await clica(".nav-etapas .botao:last-child"); await dorme(600);
    confere((await texto("#p-conteudo")).includes("Convide a Kiza"), "portal: etapa 3 (Kiza)");
    confere((await texto("#kiza-estado")).includes("Ainda não vi a Kiza"), "portal: avisa que a Kiza ainda não entrou");
    estado.kiza = true; await dorme(6500);
    confere((await texto("#kiza-estado")).includes("já está"), "portal: percebeu sozinho que a Kiza entrou (sondagem)");
    confere((await aba.js('!!document.getElementById("f-canal")')), "portal: a Mega mostra a escolha do canal");
    await aba.js('document.querySelector("input[name=decl]").click()'); await aba.js('document.querySelector("input[name=decl2]").click()');
    await aba.js('(() => { const s = document.getElementById("f-canal"); s.value = "21"; s.dispatchEvent(new Event("change", { bubbles: true })); })()'); await dorme(1500);
    await foto(`${tela}_portal_etapa3`);
    await clica(".nav-etapas .botao:last-child"); await dorme(1500);
    confere((await texto("#p-conteudo")).includes("Revisão") && (await texto("#p-conteudo")).includes("72%"), "portal: etapa 4 mostra a pontuação e a checagem");
    confere((await texto("#p-conteudo")).includes("Como o seu post vai aparecer"), "portal: etapa 4 mostra a prévia do post");
    await foto(`${tela}_portal_etapa4`);
    await clica(".nav-etapas .botao:last-child"); await dorme(800);
    await clica("#p-conteudo .etapa > .botao"); await dorme(1800);
    confere((await texto("#p-conteudo")).includes("em análise") && (await texto("#p-conteudo")).includes("A equipe recebeu"), "portal: depois de enviar mostra 'em análise'");
    await foto(`${tela}_portal_analise`);
    // painel de parceria ativa
    estado.parceria = { id: 7, status: "ativa", modalidade: "mega", modalidade_pedida: "mega", mensagem_equipe: null, atualizado_em: 1 }; estado.pendencias = ["texto"];
    await ir("/parceiros/portal/", 2200);
    await clica("#p-servidores button"); await dorme(1800);
    confere((await texto("#p-conteudo")).includes("Renovar o post") && (await texto("#p-conteudo")).includes("Números da parceria"), "portal: painel ativo mostra ações e números");
    await clica(".acoes-painel .botao:first-child"); await dorme(900);
    confere((await texto("#p-salvo")).includes("já renovou"), "portal: renovar cedo demais mostra o aviso do servidor (429)");
    await foto(`${tela}_portal_ativa`);
    await semRolagem("portal"); limpo("portal");
    // sessão expirada no meio
    estado.sessao = false; await escreve("#f-texto", "x"); await clica(".acoes-painel .botao:first-child"); await dorme(900);
    estado.sessao = true;
    // erro 500 na lista (a sessão foi limpa pelo 401 acima: entra de novo)
    await sessao(true); estado.falha500 = true; await ir("/parceiros/portal/", 2000);
    confere((await texto("#p-carregando")).includes("Não consegui"), "portal: erro 500 mostra mensagem em vez de travar");
    estado.falha500 = false; estado.parceria = null; estado.pendencias = [];
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : "\ntudo certo");
  console.log(`fotos em ${SAIDA}`);
} finally {
  chrome.kill();
}
process.exit(falhas ? 1 : 0);
