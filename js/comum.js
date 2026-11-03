// Base das páginas da Comunidade (comunidade/, rankings/, jogador/, mural/): API do bot, sessão, formatação e um "markdown"
// mínimo e SEGURO (negrito e código viram elementos; nunca se monta HTML com texto vindo de fora).
"use strict";

const VULPUS = (() => {
  const API = "https://botmine-production-70b0.up.railway.app";
  const $ = (id) => document.getElementById(id);

  function sessao() {
    try {
      return localStorage.getItem("vulpus_sessao") || "";
    } catch {
      return "";
    }
  }

  async function api(caminho, opcoes = {}) {
    const s = sessao();
    const r = await fetch(API + caminho, {
      ...opcoes,
      credentials: "omit",
      headers: { ...(opcoes.headers || {}), ...(s ? { Authorization: `Bearer ${s}` } : {}), ...(opcoes.body ? { "Content-Type": "application/json" } : {}) },
    });
    let d = {};
    try {
      d = await r.json();
    } catch {
      d = {};
    }
    return { r, d };
  }

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = String(texto);
    return e;
  }

  /** "**negrito**" e "`código`" viram <strong> e <code>; o resto é texto puro. Quebras de linha viram parágrafos. */
  function textoRico(alvo, texto) {
    alvo.replaceChildren();
    for (const linha of String(texto || "").split(/\n+/)) {
      if (!linha.trim()) continue;
      const p = el("p");
      for (const pedaco of linha.split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
        if (!pedaco) continue;
        if (pedaco.startsWith("**") && pedaco.endsWith("**")) p.append(el("strong", "", pedaco.slice(2, -2)));
        else if (pedaco.startsWith("`") && pedaco.endsWith("`")) p.append(el("code", "", pedaco.slice(1, -1)));
        else p.append(document.createTextNode(pedaco));
      }
      alvo.append(p);
    }
  }

  const numero = (n) => Number(n || 0).toLocaleString("pt-BR");
  const data = (s) => new Date(s * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  function duracao(seg) {
    seg = Math.max(0, Math.floor(seg || 0));
    if (seg >= 86400) return `${Math.floor(seg / 86400)}d ${Math.floor((seg % 86400) / 3600)}h`;
    if (seg >= 3600) return `${Math.floor(seg / 3600)}h${String(Math.floor((seg % 3600) / 60)).padStart(2, "0")}`;
    return `${Math.floor(seg / 60)}min`;
  }

  /** Avatar (Discord) ou a raposinha padrão para quem só tem o nick do jogo. */
  function avatar(url, nome, classe = "av") {
    const img = el("img", classe);
    img.alt = "";
    img.loading = "lazy";
    img.src = url || "../img/avatar-kiza.webp";
    if (!url) img.classList.add("sem-foto");
    img.title = nome || "";
    return img;
  }

  /** Link para o perfil público (id do Discord ou nick do jogo). */
  function linkPerfil(item) {
    if (item.id) return `../jogador/?id=${encodeURIComponent(item.id)}`;
    if (item.nick) return `../jogador/?nick=${encodeURIComponent(item.nick)}`;
    return "";
  }

  /** Marca o link da seção atual no menu e mostra o nome de quem está logado (se estiver). */
  async function menu() {
    const aqui = document.body.dataset.secao;
    for (const a of document.querySelectorAll(".links a")) if (a.dataset.secao === aqui) a.setAttribute("aria-current", "page");
    if (!sessao() || !$("quem")) return;
    try {
      const { r, d } = await api("/painel/api/eu");
      if (r.ok && d.ok) {
        $("quem-foto").src = d.usuario.avatar;
        $("quem-nome").textContent = d.usuario.nome;
        $("quem").hidden = false;
      }
    } catch {
      // sem conexão: o menu fica sem o nome
    }
  }

  /** Uma linha de ranking (link para o perfil quando há perfil). */
  function linhaRanking(it) {
    const href = linkPerfil(it);
    const linha = el(href ? "a" : "div", `linha p${it.pos}`);
    if (href) linha.href = href;
    const pos = el("span", "pos", it.pos <= 3 ? ["🥇", "🥈", "🥉"][it.pos - 1] : it.pos);
    const quem = el("span", "quem-l");
    const nome = el("span", "nome", it.nome);
    if (it.kitsune) nome.append(el("span", "kit", "🦊"));
    quem.append(nome);
    if (it.detalhe || (it.nick && it.nick !== it.nome)) quem.append(el("span", "det", it.detalhe || it.nick));
    linha.append(pos, avatar(it.avatar, it.nome), quem, el("span", "val", it.valor));
    return linha;
  }

  /**
   * Cartão do mural. `tipo`: "jogo" (changelog do Minecraft), "bot" (changelog da Kiza) ou "transp" (transparência).
   * Textos longos começam fechados, com "ler tudo".
   */
  function post(item, tipo) {
    const art = el("article", "post");
    const meta = el("div", "meta");
    meta.append(el("span", `selo ${tipo}`, tipo === "jogo" ? "Minecraft" : tipo === "bot" ? `Kiza ${item.versao || ""}` : `Transparência · ${item.categoria}`));
    if (item.data) meta.append(el("span", "", typeof item.data === "number" ? data(item.data) : item.data));
    if (tipo === "transp" && item.situacao && item.situacao !== "Publicada") meta.append(el("span", "selo", item.situacao));
    const titulo = el("h3", "", String(item.titulo || "").replace(/^\S+\s+Minecraft\s+·\s+[\d/]+:\s*/, ""));
    const corpo = el("div", "corpo");
    if (tipo === "jogo") textoRico(corpo, item.texto);
    else if (tipo === "bot") {
      const ul = el("ul", "itens");
      for (const i of item.itens || []) {
        const li = el("li");
        textoRico(li, i);
        ul.append(li);
      }
      corpo.append(ul);
    } else {
      for (const [rot, campo] of [["Contexto", "contexto"], ["Decisão", "decisao"], ["Justificativa", "justificativa"], ["Referências", "referencias"]]) {
        if (!item[campo]) continue;
        const c = el("div", "campo");
        c.append(el("b", "", rot));
        const txt = el("div");
        textoRico(txt, item[campo]);
        c.append(txt);
        corpo.append(c);
      }
    }
    art.append(meta, titulo, corpo);
    if ((tipo === "jogo" && String(item.texto || "").length > 420) || (tipo === "bot" && (item.itens || []).length > 4)) {
      art.classList.add("fechado");
      const b = el("button", "ler-mais", "Ler tudo");
      b.type = "button";
      b.addEventListener("click", () => {
        art.classList.toggle("fechado");
        b.textContent = art.classList.contains("fechado") ? "Ler tudo" : "Mostrar menos";
      });
      art.append(b);
    }
    return art;
  }

  function vazio(alvo, texto) {
    alvo.replaceChildren(el("p", "vazio-c", texto));
  }

  document.addEventListener("DOMContentLoaded", menu);
  return { API, $, api, el, textoRico, numero, data, duracao, avatar, linkPerfil, sessao, linhaRanking, post, vazio };
})();
