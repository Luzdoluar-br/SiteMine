// Renderizador das páginas v2 (layouts, efeitos, player de música, links sociais, widgets, selos, mural). Usado pela página pública (/p/) e pela
// pré-visualização do editor: o que se vê editando é o que vai ao ar. NADA de HTML vindo de fora: tudo entra por textContent e atributos validados;
// as imagens/áudios/vídeos só vêm do servidor da Vulpus (ou de CDNs fixas dos widgets).
"use strict";

const PAGINA2 = (() => {
  const P = PAGINA;
  const { el, icone, paragrafos } = P;
  // molduras do avatar: peças SVG fixas montadas por código (nada de HTML livre)
  const NS = "http://www.w3.org/2000/svg";
  let molduraN = 0;
  function sv(tag, attrs, pai) { const e = document.createElementNS(NS, tag); for (const k of Object.keys(attrs || {})) e.setAttribute(k, attrs[k]); if (pai) pai.append(e); return e; }
  function estrela(pai, cx, cy, r, cls) { const k = r * 0.26; return sv("path", { class: cls, d: `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z` }, pai); }
  function coracao(pai, x, y, s, cls) { return sv("path", { class: cls, transform: `translate(${x} ${y}) scale(${s})`, d: "M0 -1.4C-1.6 -4.2 -5.6 -3 -5.6 .2C-5.6 3 -1.8 5 0 7C1.8 5 5.6 3 5.6 .2C5.6 -3 1.6 -4.2 0 -1.4Z" }, pai); }
  function molduraAvatar(w, tipo) {
    if (tipo === "aurora") { w.append(el("div", "mold-halo"), el("div", "mold-anel")); return; }
    w.append(el("div", "mold-anel"));
    const id = `pgav${++molduraN}`;
    const s = sv("svg", { viewBox: "0 0 100 100", class: "mold-svg", "aria-hidden": "true", focusable: "false" });
    const defs = sv("defs", {}, s);
    const rg = sv("radialGradient", { id: `${id}p`, cx: "35%", cy: "30%", r: "75%" }, defs);
    sv("stop", { offset: "0", class: "mp-0" }, rg); sv("stop", { offset: ".5", class: "mp-1" }, rg); sv("stop", { offset: "1", class: "mp-2" }, rg);
    const lg = sv("linearGradient", { id: `${id}l`, x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
    sv("stop", { offset: "0", class: "ml-0" }, lg); sv("stop", { offset: "1", class: "ml-1" }, lg);
    const ponto = (a, r) => [50 + Math.cos(a) * r, 50 + Math.sin(a) * r];
    if (tipo === "perolas") {
      for (let k = 0; k < 22; k++) { const [x, y] = ponto((k / 22) * Math.PI * 2 - Math.PI / 2, 43.5); const c = sv("circle", { cx: x.toFixed(2), cy: y.toFixed(2), r: k % 2 ? 2.7 : 3.4, fill: `url(#${id}p)`, class: "perola" }, s); c.style.animationDelay = `${(k * 0.17).toFixed(2)}s`; }
      [[16, 15, 3.6], [87, 21, 2.6], [90, 78, 3.2], [12, 82, 2.4]].forEach(([x, y, r], k) => { const e = estrela(s, x, y, r, "m-brilho"); e.style.animationDelay = `${k * 0.7}s`; });
    } else if (tipo === "coquette") {
      for (let k = 0; k < 34; k++) { const [x, y] = ponto((k / 34) * Math.PI * 2, 41.8); sv("circle", { cx: x.toFixed(2), cy: y.toFixed(2), r: 2.5, class: "renda" }, s); }
      sv("circle", { cx: 50, cy: 50, r: 40.2, class: "renda-fio" }, s);
      const bow = sv("g", { transform: "rotate(-40 50 50)" }, s);
      sv("path", { d: "M49 12 L41 25 L46.5 22.6 L48.6 15Z", class: "laco-cauda" }, bow);
      sv("path", { d: "M51 12 L59 25 L53.5 22.6 L51.4 15Z", class: "laco-cauda" }, bow);
      sv("path", { d: "M50 9 C40 -3.5 25 -1 26.5 8.5 C28 18.5 41 14.5 50 9Z", fill: `url(#${id}l)`, class: "laco" }, bow);
      sv("path", { d: "M50 9 C60 -3.5 75 -1 73.5 8.5 C72 18.5 59 14.5 50 9Z", fill: `url(#${id}l)`, class: "laco" }, bow);
      sv("path", { d: "M31 5.4 C37 3.4 41 5 44.6 8", class: "laco-brilho" }, bow);
      sv("path", { d: "M69 5.4 C63 3.4 59 5 55.4 8", class: "laco-brilho" }, bow);
      sv("ellipse", { cx: 50, cy: 9.6, rx: 4.3, ry: 3.9, fill: `url(#${id}l)`, class: "laco-no" }, bow);
      [[88, 76, 0.85, 0], [94, 64, 0.5, 0.9], [80, 90, 0.55, 1.6]].forEach(([x, y, e, d]) => { const h = coracao(s, x, y, e, "m-coracao"); h.style.animationDelay = `${d}s`; });
      estrela(s, 10, 78, 2.6, "m-brilho");
    } else if (tipo === "orbita") {
      sv("circle", { cx: 50, cy: 50, r: 44.5, class: "orb-trilha" }, s);
      sv("circle", { cx: 50, cy: 50, r: 40, class: "orb-trilha2" }, s);
      const g1 = sv("g", { class: "orb orb-a" }, s), g2 = sv("g", { class: "orb orb-b" }, s);
      estrela(g1, 50, 6, 7, "orb-e1"); estrela(g1, 50, 94, 4.6, "orb-e3");
      estrela(g2, 10, 50, 5.6, "orb-e2"); estrela(g2, 90, 50, 3.8, "orb-e1");
      sv("circle", { cx: 79, cy: 16, r: 1.1, class: "orb-e3" }, g1); sv("circle", { cx: 21, cy: 84, r: 1.1, class: "orb-e2" }, g2);
    }
    w.append(s);
  }
  const REDUZIDO = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TOQUE = () => window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const NOMES_REDE = { discord: "Discord", youtube: "YouTube", twitch: "Twitch", github: "GitHub", roblox: "Roblox", spotify: "Spotify", telegram: "Telegram", instagram: "Instagram", tiktok: "TikTok", x: "X", bluesky: "Bluesky", playstation: "PlayStation", xbox: "Xbox", lastfm: "Last.fm", patreon: "Patreon", steam: "Steam", kofi: "Ko-fi", reddit: "Reddit", minecraft: "Minecraft", site: "Site" };
  const ICONE_DA_REDE = { x: "twitter", minecraft: "minecraft" };
  const HOSTS_IMG = /^https:\/\/(cdn\.discordapp\.com|avatars\.githubusercontent\.com|i\.ytimg\.com|i\.scdn\.co|lastfm\.freetls\.fastly\.net|site-production-f47b\.up\.railway\.app)\//;
  const daApi = (u) => typeof VULPUS !== "undefined" && String(u || "").startsWith(`${VULPUS.API}/`); // mídia e capas servidas pelo servidor da Vulpus
  const imgSegura = (u) => HOSTS_IMG.test(String(u || "")) || daApi(u) || /^(\.\.?\/)*img\//.test(String(u || ""));
  const numero = (v, padrao) => (Number.isFinite(Number(v)) ? Number(v) : padrao);
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16));
  const corOk = (c, padrao) => (/^#[0-9a-fA-F]{6}$/.test(String(c || "")) ? c : padrao);

  // ------------------------------------------------------------------ efeitos de fundo (canvas leve; para sozinho se a aba some ou se a pessoa prefere menos movimento)
  function efeitoFundo(raiz, tipo, intensidade, limpezas) {
    if (tipo === "nenhum" || REDUZIDO()) return null;
    const c = el("canvas", "pg-fx");
    c.setAttribute("aria-hidden", "true");
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const n = Math.round((TOQUE() ? 28 : 60) * (intensidade / 50));
    let L = 0;
    let A = 0;
    const cor = { neve: "255,255,255", brasas: "255,140,50", estrelas: "255,244,200", chuva: "170,200,255", "vaga-lumes": "210,255,120" }[tipo] || "255,255,255";
    const ps = Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0016, r: 0.8 + Math.random() * 2.2, f: Math.random() * 6.28 }));
    const medir = () => {
      const r = raiz.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      L = c.width = Math.max(1, Math.floor(r.width * dpr));
      A = c.height = Math.max(1, Math.floor(r.height * dpr));
    };
    let id = 0;
    let t0 = performance.now();
    const quadro = (t) => {
      if (!c.isConnected) return;
      id = requestAnimationFrame(quadro);
      if (document.hidden) return;
      const dt = Math.min(48, t - t0);
      t0 = t;
      ctx.clearRect(0, 0, L, A);
      for (const p of ps) {
        p.f += 0.002 * dt;
        if (tipo === "neve") { p.y += p.v * dt * 0.7; p.x += Math.sin(p.f) * 0.0004 * dt; }
        else if (tipo === "brasas") { p.y -= p.v * dt * 0.8; p.x += Math.sin(p.f) * 0.0006 * dt; }
        else if (tipo === "chuva") { p.y += p.v * dt * 3.2; p.x -= 0.0002 * dt; }
        else if (tipo === "estrelas") { /* fixas, só piscam */ }
        else { p.x += Math.sin(p.f) * 0.0004 * dt; p.y += Math.cos(p.f * 0.8) * 0.0003 * dt; }
        if (p.y > 1.05) p.y = -0.05;
        if (p.y < -0.05) p.y = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        if (p.x < -0.05) p.x = 1.05;
        const brilho = tipo === "estrelas" || tipo === "vaga-lumes" ? 0.35 + 0.65 * Math.abs(Math.sin(p.f * 1.5)) : 0.75;
        ctx.fillStyle = `rgba(${cor},${brilho})`;
        if (tipo === "chuva") ctx.fillRect(p.x * L, p.y * A, 1.2, p.r * 7);
        else { ctx.beginPath(); ctx.arc(p.x * L, p.y * A, p.r * (L > 900 ? 1.3 : 1), 0, 6.283); ctx.fill(); }
      }
    };
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(medir) : null;
    if (ro) ro.observe(raiz);
    medir();
    id = requestAnimationFrame(quadro);
    limpezas.push(() => { cancelAnimationFrame(id); if (ro) ro.disconnect(); });
    return c;
  }

  // rastro do mouse: pontinhos que somem (só com mouse, nunca em tela de toque)
  function rastro(raiz, limpezas) {
    if (REDUZIDO() || TOQUE()) return;
    const f = (e) => {
      const b = el("span", "pg-rastro");
      b.setAttribute("aria-hidden", "true");
      b.style.left = `${e.clientX}px`;
      b.style.top = `${e.clientY}px`;
      document.body.append(b);
      setTimeout(() => b.remove(), 600);
    };
    let ultimo = 0;
    const m = (e) => { const t = performance.now(); if (t - ultimo > 40) { ultimo = t; f(e); } };
    raiz.addEventListener("pointermove", m);
    limpezas.push(() => raiz.removeEventListener("pointermove", m));
  }

  // ------------------------------------------------------------------ digitação
  function digitacao(alvo, cfg, limpezas) {
    const textos = cfg.textos || [];
    if (!textos.length) return;
    const span = el("span", "pg-digitando-texto");
    const cur = el("span", "pg-cursor-dig", "|");
    cur.setAttribute("aria-hidden", "true");
    alvo.setAttribute("aria-label", textos.join(". "));
    span.setAttribute("aria-hidden", "true");
    alvo.append(span);
    if (cfg.cursor) alvo.append(cur);
    if (REDUZIDO() || textos.length === 1 && cfg.estilo !== "digitar") { span.textContent = textos[0]; return; }
    let i = 0;
    let k = 0;
    let apagando = false;
    let timer = 0;
    const ordem = cfg.embaralhar ? textos.map((_, j) => j).sort(() => Math.random() - 0.5) : textos.map((_, j) => j);
    const passo = () => {
      const t = textos[ordem[i % ordem.length]];
      if (cfg.estilo === "fade") {
        span.textContent = t;
        span.classList.remove("pg-fade");
        void span.offsetWidth;
        span.classList.add("pg-fade");
        i++;
        if (!cfg.loop && i >= textos.length) return;
        timer = setTimeout(passo, cfg.pausa + 600);
        return;
      }
      if (!apagando) {
        k++;
        span.textContent = t.slice(0, k);
        if (k >= t.length) {
          if (!cfg.loop && i >= textos.length - 1) return;
          apagando = cfg.estilo !== "digitar" || textos.length > 1;
          timer = setTimeout(passo, cfg.pausa);
          return;
        }
        timer = setTimeout(passo, cfg.velocidade);
      } else {
        k--;
        span.textContent = t.slice(0, Math.max(0, k));
        if (k <= 0) { apagando = false; i++; timer = setTimeout(passo, cfg.velocidade); return; }
        timer = setTimeout(passo, cfg.velocidade_apagar);
      }
    };
    timer = setTimeout(passo, 300);
    limpezas.push(() => clearTimeout(timer));
  }

  // ------------------------------------------------------------------ links
  function links(v2, ctx, urlMidia) {
    const nav = el("nav", `pg-links modo-${v2.links_modo || "lista"} alinha-${v2.links_alinhamento || "centro"}`);
    nav.setAttribute("aria-label", "Links");
    for (const l of (v2.links || []).filter((x) => !x.oculto)) {
      const estilo = v2.links_modo === "icones" ? "icone" : l.estilo || "cartao";
      const nome = l.titulo || NOMES_REDE[l.rede] || "Link";
      const corpo = [];
      const im = l.icone_midia && urlMidia(l.icone_midia);
      if (im) { const i = el("img", "pg-link-img"); i.src = im; i.alt = ""; i.loading = "lazy"; corpo.push(i); }
      else corpo.push(icone(ICONE_DA_REDE[l.rede] || l.rede));
      const txt = el("span", "pg-link-txt");
      if (estilo !== "icone") { txt.append(el("strong", "", nome)); if (l.descricao) txt.append(el("small", "", l.descricao)); corpo.push(txt); }
      let no;
      const href = l.url ? P.urlHttps(l.url) : "";
      if (href) {
        no = el("a", `pg-link est-${estilo}`);
        no.href = href;
        no.target = "_blank";
        no.rel = "noopener noreferrer nofollow ugc";
        const aoClicar = () => ctx.aoClicar && ctx.aoClicar(l.id);
        no.addEventListener("click", aoClicar);
        no.addEventListener("auxclick", aoClicar);
      } else {
        no = el("button", `pg-link est-${estilo}`);
        no.type = "button";
        const aviso = el("span", "so-leitor");
        aviso.setAttribute("role", "status");
        no.append(aviso);
        no.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(l.copiar); aviso.textContent = "Copiado"; no.classList.add("copiado"); setTimeout(() => { no.classList.remove("copiado"); aviso.textContent = ""; }, 1600); }
          catch { aviso.textContent = `Copie manualmente: ${l.copiar}`; }
          if (ctx.aoClicar) ctx.aoClicar(l.id);
        });
        if (estilo !== "icone") txt.append(el("small", "pg-copiar", `Toque para copiar: ${l.copiar}`));
      }
      no.setAttribute("aria-label", estilo === "icone" ? `${nome}${l.copiar && !href ? " (copiar)" : ""}` : "");
      if (estilo !== "icone") no.removeAttribute("aria-label");
      if (estilo === "icone") no.title = nome;
      if (l.cor) no.style.setProperty("--pg-link-cor", corOk(l.cor, "#e5731c"));
      no.append(...corpo);
      nav.append(no);
    }
    return nav.children.length ? nav : null;
  }

  // ------------------------------------------------------------------ player de música
  function player(v2, ctx, urlMidia, limpezas) {
    const m = v2.musica || {};
    const faixas = m.faixas || [];
    if (!faixas.length) return null;
    const caixa = el("section", `pg-player est-${m.estilo || "compacto"}`);
    caixa.setAttribute("aria-label", "Player de música");
    const tocaveis = faixas.filter((f) => f.midia && urlMidia(f.midia));
    // YouTube e Spotify: o id vem do servidor (recalculado do link, nunca do navegador) e aqui só vale com o formato certo. O player é o do próprio
    // serviço (a regra deles exige o quadro visível), carregado só quando a pessoa toca: nada de terceiros antes disso.
    const TIPOS_SP = ["track", "album", "playlist", "episode"];
    const embedDe = (f, tocar) => {
      const id = String(f.ext_id || "");
      if (f.fonte === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(id)) return { url: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1${tocar ? "&autoplay=1" : ""}`, classe: "pg-embed-yt", nome: "YouTube" };
      if (f.fonte === "spotify" && TIPOS_SP.includes(f.ext_tipo) && /^[A-Za-z0-9]{22}$/.test(id)) return { url: `https://open.spotify.com/embed/${f.ext_tipo}/${id}?utm_source=generator&theme=0`, classe: f.ext_tipo === "track" || f.ext_tipo === "episode" ? "pg-embed-sp" : "pg-embed-sp lista", nome: "Spotify" };
      return null;
    };
    const embutidas = faixas.filter((f) => !(f.midia && urlMidia(f.midia)) && embedDe(f, false));
    let atual = 0;
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = Math.max(0, Math.min(1, numero(m.volume, 40) / 100));
    audio.loop = false;
    const capa = el("img", "pg-capa");
    capa.alt = "";
    const info = el("div", "pg-musica-info");
    const tit = el("strong", "pg-musica-titulo");
    const art = el("span", "pg-musica-artista");
    info.append(tit, art);
    const btn = (rotulo, svg, cls) => {
      const b = el("button", `pg-bt ${cls || ""}`);
      b.type = "button";
      b.setAttribute("aria-label", rotulo);
      b.append(icone(svg));
      return b;
    };
    const play = btn("Tocar", "play", "pg-play");
    const ant = btn("Faixa anterior", "ant");
    const prox = btn("Próxima faixa", "prox");
    const prog = el("input", "pg-prog");
    prog.type = "range"; prog.min = "0"; prog.max = "1000"; prog.value = "0"; prog.setAttribute("aria-label", "Progresso da música");
    const vol = el("input", "pg-vol");
    vol.type = "range"; vol.min = "0"; vol.max = "100"; vol.value = String(Math.round(audio.volume * 100)); vol.setAttribute("aria-label", "Volume");
    const indicador = el("span", "pg-equalizador");
    indicador.setAttribute("aria-hidden", "true");
    indicador.append(el("i"), el("i"), el("i"));
    const estadoLeitor = el("span", "so-leitor");
    estadoLeitor.setAttribute("role", "status");
    const mostrar = () => {
      const f = tocaveis[atual];
      if (!f) return;
      tit.textContent = f.titulo || "Sem título";
      art.textContent = f.artista || "";
      const c = f.capa && urlMidia(f.capa);
      capa.hidden = !c;
      if (c) capa.src = c;
    };
    const carregar = (i, tocar) => {
      atual = (i + tocaveis.length) % tocaveis.length;
      audio.src = urlMidia(tocaveis[atual].midia);
      mostrar();
      if (tocar) audio.play().catch(() => {});
    };
    if (tocaveis.length) {
      carregar(m.embaralhar ? Math.floor(Math.random() * tocaveis.length) : 0, false);
      play.addEventListener("click", () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
      ant.addEventListener("click", () => carregar(atual - 1, !audio.paused));
      prox.addEventListener("click", () => carregar(atual + 1, !audio.paused));
      // o botão troca o desenho junto com o estado: triângulo quando parado, duas barrinhas quando tocando
      const desenho = (nome) => { play.replaceChildren(icone(nome)); };
      audio.addEventListener("play", () => { caixa.classList.add("tocando"); play.setAttribute("aria-label", "Pausar"); desenho("pause"); estadoLeitor.textContent = `Tocando ${tit.textContent}`; });
      audio.addEventListener("pause", () => { caixa.classList.remove("tocando"); play.setAttribute("aria-label", "Tocar"); desenho("play"); estadoLeitor.textContent = "Música pausada"; });
      audio.addEventListener("ended", () => { if (tocaveis.length > 1 || m.loop) carregar(atual + 1, true); else audio.pause(); });
      audio.addEventListener("timeupdate", () => { if (audio.duration) prog.value = String(Math.round((audio.currentTime / audio.duration) * 1000)); });
      prog.addEventListener("input", () => { if (audio.duration) audio.currentTime = (Number(prog.value) / 1000) * audio.duration; });
      vol.addEventListener("input", () => { audio.volume = Number(vol.value) / 100; });
      limpezas.push(() => { audio.pause(); audio.removeAttribute("src"); audio.load(); });
    }
    const corpo = el("div", "pg-player-corpo");
    if (tocaveis.length) corpo.append(capa, info, el("div", "pg-controles"));
    if (tocaveis.length) {
      const c = corpo.querySelector(".pg-controles");
      c.append(...(tocaveis.length > 1 ? [ant] : []), play, ...(tocaveis.length > 1 ? [prox] : []), indicador);
      caixa.append(corpo, prog, vol, estadoLeitor);
    }
    const quadros = [];
    for (const f of embutidas) {
      const e0 = embedDe(f, false);
      const cartao = el("div", "pg-embed");
      const cv = f.capa && urlMidia(f.capa);
      if (cv) {
        const im = el("img", "pg-capa");
        im.alt = "";
        im.src = cv;
        cartao.append(im);
      }
      const inf = el("div", "pg-musica-info");
      inf.append(el("strong", "pg-musica-titulo", f.titulo || "Sem título"), el("span", "pg-musica-artista", `${f.artista ? `${f.artista} · ` : ""}${e0.nome}`));
      const abrir = (tocar) => {
        if (ctx.modo === "editor" || cartao.querySelector("iframe")) return;
        const e = embedDe(f, tocar);
        const fr = el("iframe", `pg-embed-quadro ${e.classe}`);
        fr.src = e.url;
        fr.title = `${e.nome}: ${f.titulo || "música"}`;
        fr.allow = "autoplay; encrypted-media; fullscreen; clipboard-write";
        fr.referrerPolicy = "strict-origin-when-cross-origin";
        fr.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox");
        cartao.classList.add("aberto");
        cartao.append(fr);
      };
      const bt = btn(`Tocar ${f.titulo || "a música"} no ${e0.nome}`, "play", "pg-play");
      bt.addEventListener("click", () => abrir(true));
      if (ctx.modo === "editor") {
        bt.disabled = true;
        bt.title = "O player aparece na página publicada";
      }
      cartao.append(inf, bt);
      quadros.push({ f, abrir });
      limpezas.push(() => cartao.querySelector("iframe")?.remove());
      caixa.append(cartao);
    }
    for (const f of faixas.filter((x) => x.externo && P.urlHttps(x.externo) && !embedDe(x, false))) {
      const a = el("a", "pg-externa", `Ouvir “${f.titulo}” em ${new URL(f.externo).hostname.replace(/^www\./, "")}`);
      a.href = f.externo; a.target = "_blank"; a.rel = "noopener noreferrer nofollow ugc";
      caixa.append(a);
    }
    if (m.mostrar === false) caixa.classList.add("so-mudo");
    // o navegador só deixa tocar depois de um toque da pessoa: devolve a função que o portão ou o primeiro clique usa
    return {
      caixa,
      iniciar: () => {
        if (!m.autoplay) return;
        if (tocaveis.length) return void audio.play().catch(() => {});
        const yt = quadros.find((q) => q.f.fonte === "youtube"); // só o YouTube começa sozinho (o Spotify exige o toque no player dele)
        if (yt) yt.abrir(true);
      },
      tem_audio: tocaveis.length > 0,
      tem_musica: tocaveis.length > 0 || quadros.some((q) => q.f.fonte === "youtube"),
    };
  }

  // ------------------------------------------------------------------ widgets
  const WIDGET_ROTULO = { relogio: "Hora local", clima: "Clima", github: "GitHub", roblox: "Roblox", youtube: "YouTube", discord_servidor: "Servidor do Discord", discord_presenca: "No Discord agora", lastfm: "Last.fm", minecraft: "Minecraft", sobre: "Sobre", projetos: "Projetos", habilidades: "Habilidades", visitas: "Visitas" };
  const linhaDado = (alvo, rotulo, valor) => { if (valor === null || valor === undefined || valor === "") return; const d = el("div", "pg-dado"); d.append(el("span", "", rotulo), el("strong", "", valor)); alvo.append(d); };
  const imgW = (alvo, url, cls) => { if (!imgSegura(url)) return; const i = el("img", cls || "pg-w-img"); i.src = url; i.alt = ""; i.loading = "lazy"; i.referrerPolicy = "no-referrer"; alvo.append(i); };

  const DESENHA = {
    clima: (c, d) => { c.append(el("p", "pg-w-grande", `${d.emoji || ""} ${d.temperatura}°${d.unidade}`), el("p", "", `${d.descricao} · ${d.cidade}`)); linhaDado(c, "Vento", `${d.vento_kmh} km/h`); c.append(el("small", "pg-fonte", `Dados: ${d.fonte}`)); },
    github: (c, d) => { const t = el("div", "pg-w-topo"); imgW(t, d.avatar, "pg-w-avatar"); const q = el("div"); q.append(el("strong", "", d.nome || d.usuario), el("p", "", d.bio || "")); t.append(q); c.append(t); linhaDado(c, "Seguidores", d.seguidores); linhaDado(c, "Repositórios", d.repos_publicos); const ul = el("ul", "pg-w-lista"); for (const r of d.repos || []) { const li = el("li"); const a = el("a", "", r.nome); a.href = P.urlHttps(r.url) || "#"; a.target = "_blank"; a.rel = "noopener noreferrer"; li.append(a, el("small", "", ` ${r.linguagem || ""} · ${r.estrelas ?? 0} estrelas`)); ul.append(li); } c.append(ul); },
    roblox: (c, d) => { c.append(el("strong", "", d.nome_exibicao || d.usuario), el("p", "", d.descricao || "")); linhaDado(c, "Amigos", d.amigos); linhaDado(c, "Conta criada em", d.criado_em); },
    youtube: (c, d) => { c.append(el("strong", "", d.canal)); const ul = el("ul", "pg-w-videos"); for (const v of d.videos || []) { const li = el("li"); const a = el("a"); a.href = P.urlHttps(v.url) || "#"; a.target = "_blank"; a.rel = "noopener noreferrer"; imgW(a, v.thumb, "pg-w-thumb"); a.append(el("span", "", v.titulo)); li.append(a); ul.append(li); } c.append(ul); },
    discord_servidor: (c, d) => { const t = el("div", "pg-w-topo"); imgW(t, d.icone, "pg-w-avatar"); const q = el("div"); q.append(el("strong", "", d.nome), el("p", "", d.descricao || "")); t.append(q); c.append(t); linhaDado(c, "Membros", d.membros && Number(d.membros).toLocaleString("pt-BR")); linhaDado(c, "Online", d.online && Number(d.online).toLocaleString("pt-BR")); const a = el("a", "botao-pagina", "Entrar"); a.href = P.urlHttps(d.convite) || "#"; a.target = "_blank"; a.rel = "noopener noreferrer"; c.append(a); },
    discord_presenca: (c, d) => { const st = { online: "Online", idle: "Ausente", dnd: "Não perturbe", offline: "Offline" }[d.status] || d.status; const p = el("p", "pg-status"); p.append(el("span", `pg-bolinha st-${d.status}`), document.createTextNode(` ${st}`)); c.append(p); for (const a of d.atividades || []) c.append(el("p", "", `${a.tipo === 0 ? "Jogando" : a.tipo === 3 ? "Assistindo" : a.tipo === 1 ? "Transmitindo" : "Ouvindo"} ${a.nome}${a.detalhe ? " · " + a.detalhe : ""}`)); if (d.spotify) { const s = el("div", "pg-w-topo"); imgW(s, d.spotify.capa, "pg-w-avatar"); const q = el("div"); q.append(el("strong", "", d.spotify.musica), el("p", "", `${d.spotify.artista} · ${d.spotify.album}`)); s.append(q); c.append(el("small", "pg-fonte", "Ouvindo no Spotify"), s); } },
    lastfm: (c, d) => { const t = el("div", "pg-w-topo"); imgW(t, d.capa, "pg-w-avatar"); const q = el("div"); q.append(el("small", "pg-fonte", d.ouvindo_agora ? "Ouvindo agora" : "Última faixa"), el("strong", "", d.musica), el("p", "", d.artista)); t.append(q); c.append(t); },
    minecraft: (c, d) => { c.append(el("strong", "", d.nick)); linhaDado(c, "Nível", d.nivel !== null && d.nivel !== undefined ? `${d.nivel}${d.rank ? " · " + d.rank : ""}` : ""); if (d.tempo_total_s) linhaDado(c, "Tempo de jogo", d.tempo_total_s >= 3600 ? `${Math.floor(d.tempo_total_s / 3600)} h` : `${Math.floor(d.tempo_total_s / 60)} min`); if (d.duelos) linhaDado(c, "Duelos", `${d.duelos.divisao} · ${d.duelos.elo} ELO`); if (d.abates) linhaDado(c, "PvP", `${d.abates.kills} abates · ${d.abates.mortes} mortes`); },
    visitas: (c, d) => { linhaDado(c, "Visitas no total", d.total); linhaDado(c, "Últimos 7 dias", d.ultimos_7_dias); },
  };

  function widget(w, ctx, v2, limpezas) {
    const s = el("section", `pg-widget w-${w.tipo} larg-${w.largura || "meia"}`);
    s.setAttribute("aria-label", w.titulo || WIDGET_ROTULO[w.tipo]);
    s.append(el("h2", "pg-w-titulo", w.titulo || WIDGET_ROTULO[w.tipo]));
    const c = el("div", "pg-w-corpo");
    s.append(c);
    const cfg = w.config || {};
    if (w.tipo === "relogio") {
      const hora = el("p", "pg-w-grande");
      const data = el("p", "pg-w-data");
      c.append(hora);
      if (cfg.data !== false) c.append(data);
      const fuso = cfg.fuso || "America/Sao_Paulo";
      const f = (op) => { try { return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...op }); } catch { return new Intl.DateTimeFormat("pt-BR", op); } };
      const fh = f({ hour: "2-digit", minute: "2-digit", hour12: cfg.formato === 12 });
      const fd = f({ weekday: "long", day: "numeric", month: "long" });
      const tick = () => { const agora = new Date(); hora.textContent = fh.format(agora); data.textContent = `${fd.format(agora)} · ${fuso.replace(/_/g, " ")}`; };
      tick();
      const id = setInterval(tick, 15000);
      limpezas.push(() => clearInterval(id));
    } else if (w.tipo === "sobre") paragrafos(c, cfg.texto);
    else if (w.tipo === "projetos") {
      const ul = el("ul", "pg-w-lista");
      for (const p of cfg.itens || []) { const li = el("li"); const href = p.url ? P.urlHttps(p.url) : ""; const t = href ? el("a", "", p.titulo) : el("strong", "", p.titulo); if (href) { t.href = href; t.target = "_blank"; t.rel = "noopener noreferrer nofollow ugc"; } li.append(t); if (p.descricao) li.append(el("p", "", p.descricao)); ul.append(li); }
      c.append(ul);
    } else if (w.tipo === "habilidades") {
      for (const h of cfg.itens || []) { const l = el("div", "pg-skill"); l.append(el("span", "", h.nome)); const b = el("div", "pg-skill-barra"); b.setAttribute("role", "meter"); b.setAttribute("aria-valuemin", "0"); b.setAttribute("aria-valuemax", "100"); b.setAttribute("aria-valuenow", String(h.nivel)); b.setAttribute("aria-label", `${h.nome}: ${h.nivel}%`); const i = el("i"); i.style.width = `${Math.max(0, Math.min(100, h.nivel))}%`; b.append(i); l.append(b); c.append(l); }
    } else if (!ctx.widget) c.append(el("p", "pg-w-vazio", "Indisponível aqui."));
    else {
      c.append(el("p", "pg-w-vazio", "Carregando…"));
      ctx.widget(w.id, w).then((r) => {
        c.replaceChildren();
        if (r && r.ok && DESENHA[w.tipo]) DESENHA[w.tipo](c, r.dados);
        else c.append(el("p", "pg-w-vazio", (r && r.mensagem) || "Indisponível no momento."));
      }).catch(() => { c.replaceChildren(el("p", "pg-w-vazio", "Indisponível no momento.")); });
    }
    return s;
  }

  // ------------------------------------------------------------------ mural
  function mural(ctx, limpezas) {
    const s = el("section", "pg-mural");
    s.setAttribute("aria-label", "Mural de recados");
    s.append(el("h2", "pg-w-titulo", "Mural de recados"));
    const lista = el("ul", "pg-mural-lista");
    const msg = el("p", "pg-w-vazio");
    msg.setAttribute("role", "status");
    s.append(lista);
    if (!ctx.mural) { s.append(el("p", "pg-w-vazio", "Ainda sem recados. Os visitantes logados poderão deixar o deles aqui.")); return s; }
    const desenhar = (itens) => {
      lista.replaceChildren();
      for (const m of itens) {
        const li = el("li");
        li.append(el("strong", "", m.autor), el("p", "", m.texto));
        if (ctx.mural.pode_apagar) { const x = el("button", "pg-mini", "Apagar"); x.type = "button"; x.addEventListener("click", async () => { await ctx.mural.apagar(m.id); carregar(); }); li.append(x); }
        lista.append(li);
      }
      if (!itens.length) lista.append(el("li", "pg-w-vazio", "Ainda sem recados. Seja a primeira pessoa!"));
    };
    const carregar = async () => { const r = await ctx.mural.listar(); desenhar(r.mensagens || []); };
    carregar().catch(() => {});
    if (ctx.mural.logado) {
      const f = el("form", "pg-mural-form");
      const i = el("input"); i.maxLength = 200; i.placeholder = "Deixe um recado (sem links)"; i.setAttribute("aria-label", "Seu recado");
      const b = el("button", "pg-mini", "Enviar"); b.type = "submit";
      f.append(i, b, msg);
      f.addEventListener("submit", async (e) => { e.preventDefault(); b.disabled = true; const r = await ctx.mural.enviar(i.value); b.disabled = false; if (r.ok) { i.value = ""; msg.textContent = ""; desenhar(r.d.mensagens || []); } else msg.textContent = r.d.mensagem || "Não consegui enviar."; });
      s.append(f);
    } else s.append(el("p", "pg-w-vazio", "Entre com o Discord (em “Minha página”) para deixar um recado."));
    return s;
  }

  // ------------------------------------------------------------------ página
  function renderizar(raiz, d, ctx = {}) {
    if (raiz._limpezas) raiz._limpezas.forEach((f) => { try { f(); } catch { /* já saiu */ } });
    const limpezas = [];
    raiz._limpezas = limpezas;
    const v2 = d.v2;
    const midias = v2.midias || {};
    const urlMidia = (id) => (id && midias[id] && daApi(midias[id].url) ? midias[id].url : "");
    const vis = v2.visual || {};
    const cores = vis.cores || {};
    const cartao = vis.cartao || {};
    const fonte = vis.fonte || {};
    const efeitos = vis.efeitos || {};
    raiz.replaceChildren();
    for (const c of [...raiz.classList]) if (/^(tema-|fonte-|layout-|entrada-|ef-)/.test(c)) raiz.classList.remove(c);
    raiz.classList.add("pagina", "pg2", `tema-${P.TEMAS.includes(d.tema) ? d.tema : "madeira"}`, `layout-${v2.layout || "classico"}`, `entrada-${efeitos.entrada || "subir"}`, `ef-nome-${efeitos.nome || "nenhum"}`, `ef-icones-${efeitos.icones || "nenhuma"}`, `borda-${cartao.borda_estilo || "solida"}`);
    if (cartao.sombra) raiz.classList.add("com-sombra");
    if (cores.gradiente) raiz.classList.add("nome-grad");
    if (efeitos.titulo_animado) raiz.classList.add("titulo-anim");
    const st = raiz.style;
    const texto = corOk(cores.texto, "#f7ecdc");
    const acento = corOk(cores.destaque, "#e5731c");
    const [r, g, b] = hexRgb(corOk(cores.cartao, "#241810"));
    st.setProperty("--pg-texto", texto);
    st.setProperty("--pg-suave", `color-mix(in srgb, ${texto} 68%, transparent)`);
    st.setProperty("--pg-linha", `color-mix(in srgb, ${texto} 24%, transparent)`);
    st.setProperty("--pg-acento", acento);
    st.setProperty("--pg-acento2", corOk(cores.destaque2, "#d94f8c"));
    st.setProperty("--pg-cartao-bg", `rgba(${r},${g},${b},${numero(cartao.opacidade, 72) / 100})`);
    st.setProperty("--pg-blur", `${numero(cartao.desfoque, 10)}px`);
    st.setProperty("--pg-raio", `${numero(cartao.raio, 18)}px`);
    st.setProperty("--pg-borda-esp", `${numero(cartao.borda_espessura, 1)}px`);
    st.setProperty("--pg-borda-cor", `color-mix(in srgb, ${acento} ${numero(cartao.borda_opacidade, 40)}%, transparent)`);
    st.setProperty("--pg-largura", `${numero(cartao.largura, 620)}px`);
    st.setProperty("--pg-tam", `${numero(fonte.tamanho, 16)}px`);
    st.setProperty("--pg-espaco", `${numero(fonte.espaco, 0)}px`);
    st.setProperty("--pg-avatar", `${numero((vis.avatar || {}).tamanho, 112)}px`);
    st.setProperty("--pg-banner", `${numero((vis.banner || {}).altura, 160)}px`);
    st.setProperty("--pg-intensidade", String(numero(efeitos.intensidade, 50)));
    const familias = { alegreya: '"Alegreya", Georgia, serif', fredoka: '"Fredoka", "Nunito", sans-serif', nunito: '"Nunito", system-ui, sans-serif', silkscreen: '"Silkscreen", ui-monospace, monospace', serifa: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, "Cascadia Code", Consolas, monospace', sistema: 'system-ui, -apple-system, "Segoe UI", sans-serif' };
    if (fonte.familia === "personalizada" && urlMidia(fonte.midia) && typeof FontFace === "function") {
      const nome = `pgfonte${String(fonte.midia).slice(0, 8)}`;
      new FontFace(nome, `url("${urlMidia(fonte.midia)}")`).load().then((f) => { document.fonts.add(f); st.setProperty("--pg-fonte-titulo", `"${nome}", sans-serif`); st.setProperty("--pg-fonte-texto", `"${nome}", sans-serif`); }).catch(() => {});
    } else {
      const f = familias[fonte.familia] || familias.alegreya;
      st.setProperty("--pg-fonte-titulo", f);
      st.setProperty("--pg-fonte-texto", fonte.familia === "silkscreen" ? familias.alegreya : f);
    }
    if (efeitos.cursor === "personalizado" && urlMidia(efeitos.cursor_midia)) st.cursor = `url("${urlMidia(efeitos.cursor_midia)}") 0 0, auto`;
    else st.cursor = "";

    // fundo
    const fu = vis.fundo || {};
    const fundo = el("div", "pg-fundo");
    fundo.setAttribute("aria-hidden", "true");
    fundo.style.filter = `brightness(${numero(fu.brilho, 100) / 100}) blur(${numero(fu.desfoque, 0)}px)`;
    if (fu.tipo === "cor") fundo.style.background = corOk(fu.cor, "#1c1410");
    else if (fu.tipo === "gradiente") fundo.style.background = `linear-gradient(${numero(fu.angulo, 160)}deg, ${corOk(fu.cor, "#1c1410")}, ${corOk(fu.cor2, "#3b1f2e")})`;
    else if (fu.tipo === "imagem" && urlMidia(fu.midia)) fundo.style.backgroundImage = `url("${urlMidia(fu.midia)}")`;
    else if (fu.tipo === "galeria") { const u = v2.fundo_galeria_url || (ctx.galeria || {})[fu.galeria]; if (u && imgSegura(u)) fundo.style.backgroundImage = `url("${u}")`; else fundo.style.background = corOk(fu.cor, "#1c1410"); }
    raiz.append(fundo);
    let video = null;
    if (fu.tipo === "video" && urlMidia(fu.midia) && !REDUZIDO()) {
      video = el("video", "pg-video");
      video.src = urlMidia(fu.midia);
      video.muted = numero(fu.video_volume, 0) === 0;
      video.volume = numero(fu.video_volume, 0) / 100;
      video.autoplay = true; video.loop = true; video.playsInline = true; video.preload = "metadata";
      video.setAttribute("aria-hidden", "true");
      video.style.filter = fundo.style.filter;
      raiz.append(video);
    } else if (fu.tipo === "video") fundo.style.background = corOk(fu.cor, "#1c1410");
    const escuro = el("div", "pg-escuro");
    escuro.style.opacity = String(numero(fu.escurecer, 35) / 100);
    escuro.setAttribute("aria-hidden", "true");
    raiz.append(escuro);
    const fx = efeitoFundo(raiz, efeitos.fundo || "nenhum", numero(efeitos.intensidade, 50), limpezas);
    if (fx) raiz.append(fx);
    if (efeitos.cursor === "rastro") rastro(raiz, limpezas);

    // conteúdo
    const main = el("main", "pg-conteudo");
    const ban = vis.banner && urlMidia(vis.banner.midia);
    const cx = el("div", "pg-cartao");
    if (ban) { const bi = el("img", "pg-banner"); bi.src = ban; bi.alt = ""; cx.append(bi); }
    const perfil = el("header", "pg-perfil");
    const av = vis.avatar || {};
    const avUrl = urlMidia(av.midia);
    if (avUrl) {
      const mold = ["aurora", "perolas", "coquette", "orbita"].includes(av.moldura) ? av.moldura : "";
      const forma = mold && mold !== "aurora" ? "circulo" : (av.forma || "circulo");
      const i = el("img", `pg-avatar forma-${forma}${av.borda === false || mold ? " sem-borda" : ""}`); i.src = avUrl; i.alt = "";
      if (mold) { const w = el("div", `pg-av-wrap mold-${mold} forma-${forma}`); molduraAvatar(w, mold); w.append(i); perfil.append(w); } else perfil.append(i);
    }
    const textos = el("div", "pg-textos");
    const h1 = el("h1", "pg-nome", d.titulo || ctx.titulo_padrao || "Minha página");
    h1.dataset.texto = d.titulo || "";
    textos.append(h1);
    const dig = v2.digitacao || {};
    if (dig.ativo && (dig.textos || []).length) { const p = el("p", "pg-digitando"); digitacao(p, dig, limpezas); textos.append(p); }
    else if (d.bio) { const bio = el("div", "pg-bio"); paragrafos(bio, d.bio); textos.append(bio); }
    if ((v2.selos || []).length) {
      const ul = el("ul", "pg-selos");
      ul.setAttribute("aria-label", "Selos");
      for (const sl of v2.selos) { const li = el("li", `pg-selo cat-${sl.categoria}${sl.verificado ? " verificado" : " proprio"}`); li.tabIndex = 0; li.title = `${sl.rotulo}${sl.verificado ? " (verificado)" : " (da própria pessoa)"}: ${sl.descricao || ""}`; li.setAttribute("aria-label", li.title); li.append(el("span", "pg-selo-e", sl.emoji || ""), el("span", "pg-selo-t", sl.rotulo)); ul.append(li); }
      textos.append(ul);
    }
    perfil.append(textos);
    cx.append(perfil);
    const nl = links(v2, ctx, urlMidia);
    if (nl) cx.append(nl);

    const widgets = (v2.widgets || []);
    const abas = v2.abas || {};
    const blocosV1 = [];
    for (const bl of d.blocos || []) { const e = P.bloco(bl, ctx); if (e) blocosV1.push(e); }
    const painel = (lista, extra) => { const p = el("div", "pg-painel"); lista.forEach((w) => p.append(widget(w, ctx, v2, limpezas))); (extra || []).forEach((e) => p.append(e)); return p; };
    if (abas.ativo) {
      const principal = painel(widgets.filter((w) => w.aba !== "segunda"), blocosV1);
      const segunda = painel(widgets.filter((w) => w.aba === "segunda"));
      const tl = el("div", "pg-abas");
      tl.setAttribute("role", "tablist");
      const bts = [[abas.principal || "Perfil", principal], [abas.segunda || "Mais", segunda]].map(([nome, p], i) => {
        const t = el("button", "pg-aba", nome);
        t.type = "button"; t.setAttribute("role", "tab"); t.setAttribute("aria-selected", i ? "false" : "true"); t.tabIndex = i ? -1 : 0;
        p.setAttribute("role", "tabpanel"); p.hidden = i === 1;
        return t;
      });
      const paineis = [principal, segunda];
      const ir = (i) => bts.forEach((t, j) => { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; paineis[j].hidden = i !== j; if (i === j) t.focus(); });
      bts.forEach((t, i) => { t.addEventListener("click", () => ir(i)); t.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); ir(1 - i); } }); });
      tl.append(...bts);
      if (segunda.children.length) cx.append(tl, principal, segunda);
      else cx.append(principal);
    } else if (widgets.length || blocosV1.length) cx.append(painel(widgets, blocosV1));
    if ((v2.mural || {}).ativo) cx.append(mural(ctx, limpezas));
    const pe = el("footer", "pg-rodape");
    if (v2.visitas !== undefined) { const v = el("span", "pg-visitas"); v.append(icone("olho"), document.createTextNode(` ${Number(v2.visitas).toLocaleString("pt-BR")}`)); v.title = "Visitas"; pe.append(v); }
    pe.append(el("span", "", "Página criada na Vulpus."));
    cx.append(pe);
    main.append(cx);
    raiz.append(main);

    // música (fica fora do cartão, presa embaixo)
    const pl = player(v2, ctx, urlMidia, limpezas);
    if (pl) raiz.append(pl.caixa);
    const iniciar = () => { if (pl) pl.iniciar(); if (video && numero(fu.video_volume, 0) > 0) { video.muted = false; video.play().catch(() => {}); } };

    // portão "[ clique para entrar ]": também é o toque que o navegador exige para tocar áudio
    // Navegador nenhum deixa tocar áudio antes de um toque da pessoa. Por isso, quando a música toca sozinha, o portão "clique para entrar" aparece
    // sozinho e o clique nele já começa a música. Quem não quer o portão desliga o "Tocar sozinho" (aí a música espera o botão de tocar).
    const portao = v2.portao || {};
    const tocaSozinha = !!(pl && pl.tem_musica && (v2.musica || {}).autoplay);
    const quer_portao = portao.ativo || tocaSozinha;
    if (quer_portao && ctx.modo !== "editor") {
      const p = el("button", "pg-portao", portao.texto || "[ clique para entrar ]");
      p.type = "button";
      raiz.classList.add("com-portao");
      p.addEventListener("click", () => { p.remove(); raiz.classList.remove("com-portao"); iniciar(); });
      raiz.append(p);
    } else if (ctx.modo !== "editor" && pl && (v2.musica || {}).autoplay) {
      // sem portão: o primeiro toque em qualquer lugar começa a música. No celular o toque só conta como "gesto" quando termina (pointerup, touchend ou
      // click); pointerdown não vale, e era por isso que a música não começava.
      const eventos = ["pointerup", "touchend", "click", "keydown"];
      const unica = () => { iniciar(); for (const e of eventos) removeEventListener(e, unica, true); };
      for (const e of eventos) addEventListener(e, unica, { capture: true, once: true });
      iniciar();
    }
    return raiz;
  }

  return { renderizar };
})();
