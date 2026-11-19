// Renderizador das páginas personalizadas (parceiro e Kitsune). Usado pela página pública (/p/) e pela pré-visualização do editor,
// então o que a pessoa vê editando é exatamente o que vai ao ar. TUDO entra por textContent/atributos validados: nunca HTML.
"use strict";

const PAGINA = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const TEMAS = ["madeira", "pergaminho", "noite", "floresta", "brasa", "neve"];
  const FONTES = ["alegreya", "fredoka", "nunito", "silkscreen"];
  const ICONES = {
    discord: "M5 6c2-1 4-1.5 7-1.5S17 5 19 6c1.5 2.5 2.5 6 2.5 9-1.4 1.1-3 1.8-4.6 2.2l-1-1.7c.6-.2 1.2-.5 1.7-.8-3 1.3-6.2 1.3-9.2 0 .5.3 1.1.6 1.7.8l-1 1.7C4.500 16.800 3 16.100 1.500 15 1.500 12 2.500 8.500 4 6z",
    youtube: "M3 7.500c0-1.100.9-2 2-2h14c1.100 0 2 .9 2 2v9c0 1.100-.9 2-2 2H5c-1.100 0-2-.9-2-2zM10 9v6l5-3z",
    twitch: "M4 3h17v11l-4 4h-4l-3 3H8v-3H4zM11 7v5M16 7v5",
    tiktok: "M14 3v11.500a3.500 3.500 0 1 1-3.500-3.500M14 3c.3 2.500 2 4 4.500 4.200",
    instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.500 6.500v.01",
    twitter: "M4 4l7 9-7 7h2l6-6 5 6h4l-7.500-10L19 4h-2l-5.500 5.500L8 4z",
    github: "M9 19c-4 1.200-4-2-6-2.500m12 5v-3.500c0-1 .1-1.400-.5-2 2.800-.3 5.500-1.400 5.500-6a4.600 4.600 0 0 0-1.300-3.200 4.200 4.200 0 0 0-.1-3.200s-1-.3-3.400 1.300a11.700 11.700 0 0 0-6.200 0C6.600 3.300 5.600 3.600 5.600 3.600a4.200 4.200 0 0 0-.1 3.200A4.600 4.600 0 0 0 4.200 10c0 4.600 2.700 5.700 5.500 6-.6.600-.6 1.200-.5 2V21",
    site: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.500 2.500 3.500 5.500 3.500 9s-1 6.500-3.500 9c-2.500-2.500-3.500-5.500-3.500-9S9.500 5.500 12 3z",
    loja: "M4 8h16l-1 12H5zM8 8a4 4 0 0 1 8 0",
    doacao: "M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z",
    outro: "M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3A4 4 0 0 0 11 18.700l1-1",
    telegram: "M21 4 3 11l6 2 2 6 3-4 5 4zM9 13l8-6",
    spotify: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM6.500 9.500c3.500-1 7.500-.7 11 1.200M7 13c3-.8 6.300-.5 9 1M7.800 16.200c2.300-.6 4.700-.4 6.700.6",
    roblox: "M7 4l13 3-3 13L4 17zM10.500 10.500l3 .8-.8 3-3-.8z",
    bluesky: "M12 11C10.500 8 7 5 5 5s0 5 1 7c1 1.800 3 2.200 4.800 1.700-3 .8-4.500 2.500-3 4.300 2 2.200 4.500-.8 5.200-3 .7 2.200 3.200 5.200 5.200 3 1.500-1.800 0-3.500-3-4.300 1.800.5 3.800.1 4.800-1.700 1-2 3-7 1-7s-5.500 3-7 6z",
    playstation: "M9 4v15l3 1V8c3 .8 5 2 5 4 0 1.600-1 2.400-3 2.600M4 17c2 1 5 1.200 8 .5",
    xbox: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 8l8 9M16 8l-8 9",
    lastfm: "M4 7c2 0 3 1 4 3l2 5c1 2 2.500 3 4.500 3 2.500 0 3.500-1.500 3.500-3s-1-2.500-3-3M10 10c1.500 1 3 1 4.500 0",
    patreon: "M15 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM5 4v16",
    steam: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM7 13.500l3 1.200M14.500 8.500a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    kofi: "M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 9h2a2 2 0 0 1 0 5h-2",
    reddit: "M12 9c4 0 7 2 7 5s-3 5-7 5-7-2-7-5 3-5 7-5zM14 4l1 5M9 13v.01M15 13v.01M9.500 16.500c1.500 1 3.500 1 5 0",
    minecraft: "M12 3l8 4.500v9L12 21l-8-4.500v-9zM4 7.500l8 4.500 8-4.500M12 12v9",
    play: "M8 5v14l11-7z",
    ant: "M18 5v14M16 5 6 12l10 7z",
    prox: "M6 5v14M8 5l10 7-10 7z",
    olho: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  };

  const el = (tag, classe, texto) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = String(texto);
    return e;
  };
  const corOk = (c) => (/^#[0-9a-fA-F]{6}$/.test(String(c || "")) ? c : "#e5731c");
  const urlHttps = (u) => {
    try {
      const x = new URL(String(u));
      return x.protocol === "https:" ? x.href : "";
    } catch {
      return "";
    }
  };
  const imgOk = (u) => /^https:\/\/(cdn\.discordapp\.com|site-production-f47b\.up\.railway\.app)\//.test(String(u || "")) || (typeof VULPUS !== "undefined" && String(u || "").startsWith(`${VULPUS.API}/`)) || /^(\.\.?\/)*img\//.test(String(u || ""));

  function icone(nome) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", ICONES[nome] || ICONES.outro);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "1.8");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    s.append(p);
    return s;
  }

  function paragrafos(alvo, texto) {
    for (const par of String(texto || "").split(/\n{2,}/)) {
      if (!par.trim()) continue;
      const p = el("p");
      par.split("\n").forEach((linha, i) => {
        if (i) p.append(document.createElement("br"));
        p.append(document.createTextNode(linha));
      });
      alvo.append(p);
    }
  }

  const segundos = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return s >= 3600 ? `${Math.floor(s / 3600)} h` : `${Math.floor(s / 60)} min`;
  };

  /** Um bloco da página. `dados` é o objeto da API (pública) ou do rascunho (editor: sem os campos "ao vivo", que viram aviso). */
  function bloco(b, ctx) {
    if (!b || typeof b !== "object") return null;
    switch (b.tipo) {
      case "texto": {
        const s = el("section", "bloco bloco-texto");
        if (b.titulo) s.append(el("h2", "", b.titulo));
        paragrafos(s, b.texto);
        return s;
      }
      case "citacao": {
        const f = el("figure", "bloco bloco-citacao");
        const q = el("blockquote");
        q.append(el("p", "", b.texto));
        f.append(q);
        if (b.autor) f.append(el("figcaption", "", b.autor));
        return f;
      }
      case "links": {
        const ul = el("ul", "bloco bloco-links");
        for (const it of b.itens || []) {
          const href = urlHttps(it.url);
          if (!href) continue;
          const li = el("li");
          const a = el("a", "link-pagina");
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer nofollow ugc";
          a.append(icone(it.icone), el("span", "", it.rotulo));
          li.append(a);
          ul.append(li);
        }
        return ul.children.length ? ul : null;
      }
      case "galeria": {
        const g = el("div", "bloco bloco-galeria");
        for (const it of b.itens || []) {
          const url = typeof it === "string" ? (ctx.galeria || {})[it] : it.url;
          if (!imgOk(url)) continue;
          const fig = el("figure");
          const img = el("img");
          img.src = url;
          img.alt = "";
          img.loading = "lazy";
          fig.append(img);
          g.append(fig);
        }
        return g.children.length ? g : null;
      }
      case "separador":
        return el("hr", "bloco bloco-separador");
      case "cartao_discord": {
        const c = el("section", "bloco cartao cartao-discord");
        if (!b.nome) {
          c.append(el("p", "cartao-aviso", "Cartão do servidor: aparece aqui com o ícone, o nome e o botão de entrar, quando a página está no ar."));
          return c;
        }
        const topo = el("div", "cartao-topo");
        if (b.icone && /^https:\/\/cdn\.discordapp\.com\//.test(b.icone)) {
          const i = el("img", "cartao-icone");
          i.src = b.icone;
          i.alt = "";
          topo.append(i);
        }
        const quem = el("div");
        quem.append(el("h2", "", b.nome));
        if (b.membros) quem.append(el("p", "cartao-meta", `${Number(b.membros).toLocaleString("pt-BR")} membros`));
        topo.append(quem);
        c.append(topo);
        if (b.descricao) c.append(el("p", "cartao-desc", b.descricao));
        const href = urlHttps(b.convite);
        if (href) {
          const a = el("a", "botao-pagina", "Entrar no servidor");
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          c.append(a);
        }
        return c;
      }
      case "cartao_minecraft": {
        const c = el("section", "bloco cartao cartao-mc");
        if (!b.nick) {
          c.append(el("p", "cartao-aviso", "Cartão do Minecraft: mostra seu nick, nível e tempo de jogo quando o Minecraft está ligado à sua conta e o perfil é público."));
          return c;
        }
        c.append(el("h2", "", b.nick));
        const dl = el("dl", "cartao-dados");
        const par = (t, v) => {
          if (v === null || v === undefined || v === "") return;
          const d = el("div");
          d.append(el("dt", "", t), el("dd", "", v));
          dl.append(d);
        };
        par("Nível", b.nivel !== null && b.nivel !== undefined ? `${b.nivel}${b.rank ? " · " + b.rank : ""}` : "");
        par("Tempo de jogo", b.tempo_total_s ? segundos(b.tempo_total_s) : "");
        if (b.duelos) par("Duelos", `${b.duelos.divisao} · ${b.duelos.elo} ELO`);
        if (b.abates) par("PvP", `${b.abates.kills} abates · ${b.abates.mortes} mortes`);
        par("Kitsune", b.kitsune ? "sim" : "");
        c.append(dl);
        return c;
      }
      default:
        return null;
    }
  }

  /**
   * Monta a página dentro de `raiz` (um elemento). `d`: { tema, fonte, cor, fundo, titulo, bio, blocos, tipo }.
   * `ctx.galeria`: mapa id -> url dos fundos. Devolve `raiz`.
   */
  function renderizar(raiz, d, ctx = {}) {
    d = d || {};
    if (d.v2 && typeof PAGINA2 !== "undefined") return PAGINA2.renderizar(raiz, d, ctx); // página no formato novo (v2)
    raiz.replaceChildren();
    for (const c of [...raiz.classList]) if (c.startsWith("tema-") || c.startsWith("fonte-")) raiz.classList.remove(c);
    raiz.classList.add("pagina", `tema-${TEMAS.includes(d.tema) ? d.tema : "madeira"}`, `fonte-${FONTES.includes(d.fonte) ? d.fonte : "alegreya"}`);
    raiz.style.setProperty("--pg-acento", corOk(d.cor));
    const fundo = el("div", "pagina-fundo");
    const url = typeof d.fundo === "string" && d.fundo.startsWith("http") ? d.fundo : (ctx.galeria || {})[d.fundo];
    if (imgOk(url)) fundo.style.backgroundImage = `url("${url}")`;
    fundo.setAttribute("aria-hidden", "true");
    const miolo = el("div", "pagina-miolo");
    const cab = el("header", "pagina-cabeca");
    cab.append(el("h1", "", d.titulo || ctx.titulo_padrao || "Minha página"));
    if (d.bio) {
      const bio = el("div", "pagina-bio");
      paragrafos(bio, d.bio);
      cab.append(bio);
    }
    miolo.append(cab);
    for (const b of d.blocos || []) {
      const e = bloco(b, ctx);
      if (e) miolo.append(e);
    }
    miolo.append(el("p", "pagina-rodape", "Página criada na Vulpus."));
    raiz.append(fundo, miolo);
    return raiz;
  }

  return { renderizar, TEMAS, FONTES, ICONES: Object.keys(ICONES), urlHttps, el, icone, paragrafos, bloco };
})();
