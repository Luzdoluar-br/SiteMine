// Editor v2 das páginas: layout, visual, links, música, digitação, widgets, mídia, selos, modelos, análises, endereços e SEO.
// Mexe só em pg.v2 (o editor.js cuida do resto); histórico (desfazer/refazer), prévia por tamanho de tela e arrastar para reordenar.
// Tudo que vem da API entra por textContent/value. A permissão e a validação de verdade são do servidor.
"use strict";

const EDITOR2 = (() => {
  const { $, el } = VULPUS;
  let H = null;
  let rec = null;
  let midias = [];
  let uso = { arquivos: 0, bytes: 0, max_arquivos: 80, max_bytes: 60 * 1024 * 1024 };
  let pastas = [];
  let selosOficiais = [];
  let comoGanhar = [];
  let visitasCache = 0;
  let iniciou = false;
  let aberto = "basico";
  let hist = [];
  let hi = -1;
  let tHist = 0;
  let restaurando = false;
  let n = 0;
  let msgMidia = { t: "", e: false }; // a mensagem do último envio sobrevive à reconstrução do painel
  const nid = () => `e2-${++n}`;
  const v2 = () => H.pg().v2;
  const mudou = () => H.alterou();
  const ROTULOS_PAINEL = { visual: "Layout e visual", links: "Links", musica: "Música", digitacao: "Digitação", widgets: "Widgets", abas: "Abas", seo: "SEO", badges: "Selos", portao: "Portão", mural: "Mural" };
  const NOMES_REDE = Object.fromEntries([["discord", "Discord"], ["youtube", "YouTube"], ["twitch", "Twitch"], ["github", "GitHub"], ["roblox", "Roblox"], ["spotify", "Spotify"], ["telegram", "Telegram"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["x", "X"], ["bluesky", "Bluesky"], ["playstation", "PlayStation"], ["xbox", "Xbox"], ["lastfm", "Last.fm"], ["patreon", "Patreon"], ["steam", "Steam"], ["kofi", "Ko-fi"], ["reddit", "Reddit"], ["minecraft", "Minecraft"], ["site", "Site"]]);
  const HOSTS = [["discord.gg", "discord"], ["discord.com", "discord"], ["youtube.com", "youtube"], ["youtu.be", "youtube"], ["twitch.tv", "twitch"], ["github.com", "github"], ["roblox.com", "roblox"], ["spotify.com", "spotify"], ["t.me", "telegram"], ["telegram.me", "telegram"], ["instagram.com", "instagram"], ["tiktok.com", "tiktok"], ["x.com", "x"], ["twitter.com", "x"], ["bsky.app", "bluesky"], ["playstation.com", "playstation"], ["xbox.com", "xbox"], ["last.fm", "lastfm"], ["patreon.com", "patreon"], ["steamcommunity.com", "steam"], ["ko-fi.com", "kofi"], ["reddit.com", "reddit"]];

  // ------------------------------------------------------------------ peças de formulário
  function campo(rotulo, controle, dicaTxt) {
    const g = el("div", "campo");
    const id = nid();
    const l = el("label", "", rotulo);
    l.htmlFor = id;
    controle.id = id;
    g.append(l, controle);
    if (dicaTxt) g.append(el("p", "dica", dicaTxt));
    return g;
  }
  function texto(rotulo, valor, max, set, opcoes = {}) {
    const i = el(opcoes.linhas ? "textarea" : "input");
    if (opcoes.linhas) i.rows = opcoes.linhas;
    i.value = valor || "";
    if (max) i.maxLength = max;
    if (opcoes.ph) i.placeholder = opcoes.ph;
    i.addEventListener("input", () => { set(i.value); mudou(); });
    return campo(rotulo, i, opcoes.dica);
  }
  function numero(rotulo, valor, min, max, passo, set, sufixo = "") {
    const g = el("div", "campo campo-faixa");
    const id = nid();
    const l = el("label", "", rotulo);
    l.htmlFor = id;
    const i = el("input");
    i.type = "range"; i.min = String(min); i.max = String(max); i.step = String(passo); i.value = String(valor); i.id = id;
    const o = el("output", "valor-faixa", `${valor}${sufixo}`);
    i.addEventListener("input", () => { const x = passo < 1 ? Number(i.value) : Math.round(Number(i.value)); o.textContent = `${x}${sufixo}`; set(x); mudou(); });
    g.append(l, i, o);
    return g;
  }
  function selecao(rotulo, opcoes, valor, set, dicaTxt) {
    const s = el("select");
    for (const [v, r, off] of opcoes) { const o = el("option", "", r); o.value = v; if (off) o.disabled = true; s.append(o); }
    s.value = valor;
    s.addEventListener("change", () => { set(s.value); mudou(); });
    return campo(rotulo, s, dicaTxt);
  }
  function cor(rotulo, valor, set) {
    const i = el("input");
    i.type = "color"; i.value = /^#[0-9a-f]{6}$/i.test(valor) ? valor : "#000000";
    i.addEventListener("input", () => { set(i.value); mudou(); });
    return campo(rotulo, i);
  }
  function marcar(rotulo, valor, set, dicaTxt) {
    const g = el("div", "campo campo-check");
    const id = nid();
    const i = el("input");
    i.type = "checkbox"; i.checked = !!valor; i.id = id;
    i.addEventListener("change", () => { set(i.checked); mudou(); });
    const l = el("label", "", rotulo);
    l.htmlFor = id;
    g.append(i, l);
    if (dicaTxt) g.append(el("p", "dica", dicaTxt));
    return g;
  }
  function botao(rotulo, aoClicar, classe = "mini") {
    const b = el("button", classe, rotulo);
    b.type = "button";
    b.addEventListener("click", aoClicar);
    return b;
  }
  const grupo = (titulo, ...filhos) => { const f = el("fieldset"); f.append(el("legend", "", titulo), ...filhos); return f; };
  const aviso = (t, classe = "dica") => el("p", classe, t);
  const msg = (alvo, t, erro) => { alvo.textContent = t || ""; alvo.classList.toggle("erro", !!erro); };
  const copia = (o) => JSON.parse(JSON.stringify(o));

  // ------------------------------------------------------------------ mídia (lista, envio, seletor)
  async function carregarMidias() {
    const { r, d } = await H.E.chamar("GET", "/painel/api/pagina/midia");
    if (r.ok) { midias = d.midias; uso = d.uso; pastas = d.pastas; }
  }
  function mapaMidias() {
    return Object.fromEntries(midias.map((m) => [m.id, { url: m.url, tipo: m.tipo, mime: m.mime, largura: m.largura, altura: m.altura }]));
  }
  function adivinharTipo(arq, permitidos) {
    const nome = arq.name.toLowerCase();
    let t = "imagem";
    if (arq.type === "image/gif") t = "gif";
    else if (arq.type.startsWith("video/")) t = "video";
    else if (arq.type.startsWith("audio/")) t = "audio";
    else if (/\.(woff2?|ttf|otf)$/.test(nome)) t = "fonte";
    return permitidos.includes(t) ? t : permitidos[0];
  }
  async function enviar(arq, tipo, pasta) {
    const f = new FormData();
    f.append("arquivo", arq, arq.name);
    const q = new URLSearchParams({ tipo, nome: arq.name, ...(pasta ? { pasta } : {}) });
    const res = await H.E.chamar("POST", `/painel/api/pagina/midia?${q}`, f);
    if (res.r.ok) { midias.unshift(res.d); uso.arquivos += 1; uso.bytes += res.d.tamanho; }
    return res;
  }
  function seletorMidia(rotulo, tipos, atual, set, dicaTxt) {
    const g = el("div", "campo campo-midia");
    const s = el("select");
    const id = nid();
    s.id = id;
    const l = el("label", "", rotulo);
    l.htmlFor = id;
    const encher = () => {
      s.replaceChildren();
      const nenhuma = el("option", "", "Nenhuma");
      nenhuma.value = "";
      s.append(nenhuma);
      for (const m of midias.filter((x) => tipos.includes(x.tipo))) { const o = el("option", "", `${m.nome} (${m.tipo})`); o.value = m.id; s.append(o); }
      s.value = midias.some((m) => m.id === atual) ? atual : "";
    };
    encher();
    s.addEventListener("change", () => { atual = s.value || null; set(atual); mudou(); });
    const arq = el("input");
    arq.type = "file"; arq.hidden = true;
    arq.accept = tipos.map((t) => ({ imagem: "image/png,image/jpeg,image/webp", gif: "image/gif", video: "video/mp4,video/webm", audio: "audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/webm", fonte: ".woff2,.woff,.ttf,.otf", cursor: "image/png,image/jpeg,image/webp" }[t])).join(",");
    const novo = botao("Enviar novo…", () => arq.click());
    const st = el("span", "dica", "");
    st.setAttribute("role", "status");
    arq.addEventListener("change", async () => {
      const f = arq.files[0];
      arq.value = "";
      if (!f) return;
      msg(st, "Enviando…");
      const res = await enviar(f, adivinharTipo(f, tipos));
      if (!res.r.ok) return msg(st, res.d.mensagem || "Não consegui enviar.", true);
      msg(st, "");
      atual = res.d.id;
      encher();
      s.value = atual;
      set(atual);
      mudou();
    });
    g.append(l, s, novo, arq, st);
    if (dicaTxt) g.append(el("p", "dica", dicaTxt));
    return g;
  }

  // ------------------------------------------------------------------ histórico e tamanho da tela
  function registrar() {
    if (restaurando) return;
    clearTimeout(tHist);
    tHist = setTimeout(() => {
      const s = JSON.stringify(H.pg());
      if (hist[hi] === s) return;
      hist = hist.slice(0, hi + 1);
      hist.push(s);
      if (hist.length > 60) hist.shift();
      hi = hist.length - 1;
      botoesHist();
    }, 450);
  }
  function botoesHist() { $("b-desfazer").disabled = hi <= 0 || !H.pode(); $("b-refazer").disabled = hi >= hist.length - 1 || !H.pode(); }
  function irPara(i) {
    if (i < 0 || i >= hist.length) return;
    hi = i;
    restaurando = true;
    H.trocarPg(JSON.parse(hist[hi]));
    reconstruir();
    H.alterou(true);
    restaurando = false;
    botoesHist();
  }

  // ------------------------------------------------------------------ painéis
  function painelVisual(c) {
    const V = v2();
    const vis = V.visual;
    const layouts = rec.layouts.map((l) => [l.id, l.rotulo]);
    const desc = { classico: "Coluna centralizada: o jeito tradicional.", moderno: "Perfil em linha, links em grade e abas.", minimalista: "Sem cartão, só texto e linhas.", elegante: "Serifa, filete duplo e ornamento.", portfolio: "Duas colunas: perfil à esquerda, projetos e widgets à direita." };
    c.append(grupo("Layout", selecao("Layout da página", layouts, V.layout, (x) => { V.layout = x; }, desc[V.layout])));
    c.querySelector("select").addEventListener("change", () => reconstruir());

    const f = vis.fundo;
    const fundoCampos = el("div");
    const refazerFundo = () => {
      fundoCampos.replaceChildren();
      if (f.tipo === "cor") fundoCampos.append(cor("Cor do fundo", f.cor, (x) => { f.cor = x; }));
      if (f.tipo === "gradiente") fundoCampos.append(cor("Cor 1", f.cor, (x) => { f.cor = x; }), cor("Cor 2", f.cor2, (x) => { f.cor2 = x; }), numero("Ângulo", f.angulo, 0, 360, 5, (x) => { f.angulo = x; }, "°"));
      if (f.tipo === "galeria") fundoCampos.append(selecao("Imagem da galeria da Vulpus", [["", "Nenhuma"], ...rec.fundos.map((x) => [x.id, x.rotulo])], f.galeria || "", (x) => { f.galeria = x || null; }));
      if (f.tipo === "imagem") fundoCampos.append(seletorMidia("Imagem ou GIF de fundo", ["imagem", "gif"], f.midia, (x) => { f.midia = x; }));
      if (f.tipo === "video") fundoCampos.append(seletorMidia("Vídeo de fundo (MP4 ou WebM)", ["video"], f.midia, (x) => { f.midia = x; }, "O vídeo toca mudo e em repetição. Quem prefere menos movimento vê só a cor."), numero("Volume do vídeo", f.video_volume, 0, 100, 5, (x) => { f.video_volume = x; }, "%"));
    };
    refazerFundo();
    const tipoSel = selecao("Tipo de fundo", [["cor", "Cor"], ["gradiente", "Gradiente"], ["galeria", "Galeria da Vulpus"], ["imagem", "Imagem / GIF"], ["video", "Vídeo"]], f.tipo, (x) => { f.tipo = x; });
    tipoSel.querySelector("select").addEventListener("change", refazerFundo);
    c.append(grupo("Fundo", tipoSel, fundoCampos, numero("Brilho", f.brilho, 20, 150, 5, (x) => { f.brilho = x; }, "%"), numero("Desfoque do fundo", f.desfoque, 0, 20, 1, (x) => { f.desfoque = x; }, " px"), numero("Escurecer", f.escurecer, 0, 90, 5, (x) => { f.escurecer = x; }, "%")));

    const av = vis.avatar;
    c.append(grupo("Avatar e banner", seletorMidia("Avatar", ["imagem", "gif"], av.midia, (x) => { av.midia = x; }), selecao("Forma", [["circulo", "Círculo"], ["arredondado", "Arredondado"], ["quadrado", "Quadrado"]], av.forma, (x) => { av.forma = x; }),
      numero("Tamanho do avatar", av.tamanho, 64, 200, 4, (x) => { av.tamanho = x; }, " px"), marcar("Borda no avatar", av.borda, (x) => { av.borda = x; }),
      seletorMidia("Banner (topo do cartão)", ["imagem", "gif"], vis.banner.midia, (x) => { vis.banner.midia = x; }), numero("Altura do banner", vis.banner.altura, 80, 320, 10, (x) => { vis.banner.altura = x; }, " px")));

    const fo = vis.fonte;
    const fonteMid = el("div");
    const refazerFonte = () => { fonteMid.replaceChildren(); if (fo.familia === "personalizada") fonteMid.append(seletorMidia("Arquivo da fonte (WOFF2, WOFF, TTF ou OTF)", ["fonte"], fo.midia, (x) => { fo.midia = x; }, "Use só fontes que você pode usar (licença livre ou sua).")); };
    refazerFonte();
    const famSel = selecao("Fonte", rec.fontes.map((x) => [x, { alegreya: "Alegreya (clássica)", fredoka: "Fredoka (redonda)", nunito: "Nunito (limpa)", silkscreen: "Silkscreen (pixel)", serifa: "Serifa do sistema", mono: "Monoespaçada", sistema: "Sistema", personalizada: "Minha fonte (enviar)" }[x] || x]), fo.familia, (x) => { fo.familia = x; });
    famSel.querySelector("select").addEventListener("change", refazerFonte);
    c.append(grupo("Tipografia", famSel, fonteMid, numero("Tamanho do texto", fo.tamanho, 13, 22, 1, (x) => { fo.tamanho = x; }, " px"), numero("Espaço entre letras", fo.espaco, -1, 6, 0.25, (x) => { fo.espaco = x; }, " px")));

    const co = vis.cores;
    const aviso1 = aviso("", "dica");
    const contraste = () => { const r = razao(co.texto, co.cartao); msg(aviso1, r < 4.5 ? `Atenção: o contraste entre o texto e o cartão é ${r.toFixed(1)}:1 (o recomendado é 4,5:1). Quem enxerga pouco pode não conseguir ler.` : `Contraste do texto: ${r.toFixed(1)}:1 (bom).`, r < 4.5); };
    const comContraste = (campoCor) => { campoCor.querySelector("input").addEventListener("input", contraste); return campoCor; };
    c.append(grupo("Cores", comContraste(cor("Texto", co.texto, (x) => { co.texto = x; })), cor("Destaque", co.destaque, (x) => { co.destaque = x; }), cor("Segundo destaque (gradientes e borda animada)", co.destaque2, (x) => { co.destaque2 = x; }),
      comContraste(cor("Cartão", co.cartao, (x) => { co.cartao = x; })), marcar("Nome com gradiente", co.gradiente, (x) => { co.gradiente = x; }), aviso1));
    contraste();

    const ca = vis.cartao;
    c.append(grupo("Cartão e bordas", numero("Opacidade do cartão", ca.opacidade, 0, 100, 2, (x) => { ca.opacidade = x; }, "%"), numero("Desfoque atrás do cartão", ca.desfoque, 0, 30, 1, (x) => { ca.desfoque = x; }, " px"),
      numero("Arredondamento dos cantos", ca.raio, 0, 40, 1, (x) => { ca.raio = x; }, " px"), numero("Espessura da borda", ca.borda_espessura, 0, 8, 1, (x) => { ca.borda_espessura = x; }, " px"),
      numero("Opacidade da borda", ca.borda_opacidade, 0, 100, 5, (x) => { ca.borda_opacidade = x; }, "%"),
      selecao("Estilo da borda", [["solida", "Sólida"], ["tracejada", "Tracejada"], ["pontilhada", "Pontilhada"], ["animada", "Animada (gira)"], ["brilho", "Brilho"]], ca.borda_estilo, (x) => { ca.borda_estilo = x; }),
      marcar("Sombra", ca.sombra, (x) => { ca.sombra = x; }), numero("Largura do cartão", ca.largura, 420, 960, 20, (x) => { ca.largura = x; }, " px")));

    const ef = vis.efeitos;
    const cursorMid = el("div");
    const refazerCursor = () => { cursorMid.replaceChildren(); if (ef.cursor === "personalizado") cursorMid.append(seletorMidia("Imagem do cursor (PNG até 128×128)", ["cursor"], ef.cursor_midia, (x) => { ef.cursor_midia = x; })); };
    refazerCursor();
    const curSel = selecao("Cursor", [["padrao", "Padrão"], ["rastro", "Rastro de brilho"], ["personalizado", "Imagem minha"]], ef.cursor, (x) => { ef.cursor = x; });
    curSel.querySelector("select").addEventListener("change", refazerCursor);
    c.append(grupo("Efeitos e animações", selecao("Efeito de fundo", [["nenhum", "Nenhum"], ["neve", "Neve"], ["brasas", "Brasas"], ["estrelas", "Estrelas"], ["chuva", "Chuva"], ["vaga-lumes", "Vaga-lumes"]], ef.fundo, (x) => { ef.fundo = x; }),
      numero("Intensidade do efeito", ef.intensidade, 10, 100, 5, (x) => { ef.intensidade = x; }, "%"), selecao("Efeito no nome", [["nenhum", "Nenhum"], ["brilho", "Brilho"], ["glitch", "Glitch"], ["arco-iris", "Arco-íris"], ["pulsar", "Pulsar"]], ef.nome, (x) => { ef.nome = x; }),
      marcar("Título com gradiente animado", ef.titulo_animado, (x) => { ef.titulo_animado = x; }), curSel, cursorMid,
      selecao("Animação de entrada", [["nenhuma", "Nenhuma"], ["fade", "Aparecer"], ["subir", "Subir"], ["zoom", "Zoom"], ["desfocar", "Desfocar"]], ef.entrada, (x) => { ef.entrada = x; }),
      selecao("Animação dos ícones", [["nenhuma", "Nenhuma"], ["pulso", "Pulsar"], ["flutuar", "Flutuar"], ["girar", "Girar ao passar o mouse"]], ef.icones, (x) => { ef.icones = x; }),
      aviso("Quem usa “reduzir movimento” no aparelho vê tudo parado, sem precisar de nada seu.")));
  }

  function lum(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function razao(a, b) { const la = lum(a); const lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

  // reordenar por arrastar e por botões (acessível)
  function itemOrdenavel(li, lista, i, redesenhar) {
    li.draggable = true;
    li.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; li.classList.add("arrastando"); });
    li.addEventListener("dragend", () => li.classList.remove("arrastando"));
    li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("alvo"); });
    li.addEventListener("dragleave", () => li.classList.remove("alvo"));
    li.addEventListener("drop", (e) => { e.preventDefault(); li.classList.remove("alvo"); const de = Number(e.dataTransfer.getData("text/plain")); if (Number.isInteger(de) && de !== i) { lista.splice(i, 0, lista.splice(de, 1)[0]); redesenhar(); mudou(); } });
  }
  function acoesOrdem(lista, i, redesenhar, rotulo) {
    const d = el("div", "bloco-acoes");
    const mover = (delta, t) => { const b = botao(t, () => { [lista[i], lista[i + delta]] = [lista[i + delta], lista[i]]; redesenhar(); mudou(); }); b.setAttribute("aria-label", `${t} ${rotulo}`); b.disabled = i + delta < 0 || i + delta >= lista.length; return b; };
    const r = botao("Remover", () => { lista.splice(i, 1); redesenhar(); mudou(); }, "mini perigo");
    r.setAttribute("aria-label", `Remover ${rotulo}`);
    d.append(mover(-1, "Subir"), mover(1, "Descer"), r);
    return d;
  }

  function painelLinks(c) {
    const V = v2();
    c.append(grupo("Aparência da lista", selecao("Modo", [["lista", "Lista"], ["grade", "Grade"], ["icones", "Só ícones"]], V.links_modo, (x) => { V.links_modo = x; }),
      selecao("Alinhamento", [["esquerda", "Esquerda"], ["centro", "Centro"], ["direita", "Direita"]], V.links_alinhamento, (x) => { V.links_alinhamento = x; })));
    const lista = el("ol", "blocos-lista");
    const desenhar = () => {
      lista.replaceChildren();
      V.links.forEach((l, i) => {
        const li = el("li", "bloco-form");
        const topo = el("div", "bloco-topo");
        topo.append(el("strong", "", `${l.titulo || NOMES_REDE[l.rede] || "Link"}${l.oculto ? " (oculto)" : ""}`), acoesOrdem(V.links, i, desenhar, `o link ${i + 1}`));
        const corpo = el("div", "bloco-corpo");
        const url = texto("Endereço (https) — ou deixe vazio e use “Texto para copiar”", l.url, 300, (x) => {
          l.url = x;
          const h = (() => { try { return new URL(x).hostname.replace(/^www\./, ""); } catch { return ""; } })();
          const ach = HOSTS.find(([d]) => h === d || h.endsWith(`.${d}`));
          if (ach && (l.rede === "site" || !l.rede)) { l.rede = ach[1]; }
        });
        corpo.append(selecao("Rede", rec.redes.map((x) => [x.id, x.rotulo]), l.rede, (x) => { l.rede = x; }), url, texto("Texto para copiar (ex.: seu usuário)", l.copiar, 60, (x) => { l.copiar = x; }),
          texto("Título", l.titulo, 40, (x) => { l.titulo = x; }), texto("Descrição", l.descricao, 100, (x) => { l.descricao = x; }),
          selecao("Estilo", [["cartao", "Cartão"], ["pilula", "Pílula"], ["icone", "Só ícone"]], l.estilo, (x) => { l.estilo = x; }), cor("Cor do ícone e do destaque", l.cor || "#e5731c", (x) => { l.cor = x; }),
          seletorMidia("Ícone personalizado", ["imagem", "gif"], l.icone_midia, (x) => { l.icone_midia = x; }), marcar("Esconder este link (some da página, fica aqui)", l.oculto, (x) => { l.oculto = x; }));
        li.append(topo, corpo);
        itemOrdenavel(li, V.links, i, desenhar);
        lista.append(li);
      });
      if (!V.links.length) lista.append(el("li", "dica", "Nenhum link ainda. Cole um endereço abaixo: a rede é reconhecida sozinha."));
    };
    desenhar();
    const colar = el("input");
    colar.placeholder = "https://github.com/seu-usuario";
    const add = botao("Adicionar link", () => {
      if (V.links.length >= rec.limites.links) return msg(st, `No máximo ${rec.limites.links} links.`, true);
      const u = colar.value.trim();
      if (!/^https:\/\//i.test(u)) return msg(st, "Cole o endereço completo do link, começando com https://", true);
      const h = (() => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } })();
      const ach = HOSTS.find(([d]) => h === d || h.endsWith(`.${d}`));
      V.links.push({ id: `l${Date.now().toString(36)}`, rede: ach ? ach[1] : "site", titulo: ach ? NOMES_REDE[ach[1]] : "", descricao: "", url: u, copiar: "", oculto: false, estilo: "cartao", cor: "", icone_midia: null });
      colar.value = "";
      msg(st, "");
      desenhar();
      mudou();
    }, "botao botao-pequeno");
    const st = el("p", "dica");
    const copiarBt = botao("Adicionar só texto para copiar", () => { V.links.push({ id: `l${Date.now().toString(36)}`, rede: "discord", titulo: "Discord", descricao: "", url: "", copiar: "usuario", oculto: false, estilo: "cartao", cor: "", icone_midia: null }); desenhar(); mudou(); });
    c.append(grupo("Links sociais", lista, campo("Novo link", colar), el("div", "add-linha"), st));
    c.lastChild.querySelector(".add-linha").append(add, copiarBt);
    c.append(aviso("Arraste os cartões para reordenar (ou use Subir e Descer). Os cliques de cada link aparecem na aba Análises."));
  }

  function painelMusica(c) {
    const V = v2();
    const m = V.musica;
    const lista = el("ol", "blocos-lista");
    const desenhar = () => {
      lista.replaceChildren();
      m.faixas.forEach((f, i) => {
        const li = el("li", "bloco-form");
        const topo = el("div", "bloco-topo");
        topo.append(el("strong", "", f.titulo || `Faixa ${i + 1}`), acoesOrdem(m.faixas, i, desenhar, `a faixa ${i + 1}`));
        const corpo = el("div", "bloco-corpo");
        corpo.append(texto("Título", f.titulo, 60, (x) => { f.titulo = x; }), texto("Artista", f.artista, 60, (x) => { f.artista = x; }),
          seletorMidia("Arquivo de áudio (MP3, OGG, WAV, M4A ou WebM)", ["audio"], f.midia, (x) => { f.midia = x; }),
          marcar("Tenho o direito de usar esta música (é minha, licenciada ou livre)", f.direitos, (x) => { f.direitos = x; }, "Sem essa confirmação a página não salva. Músicas de outras pessoas: use o link externo abaixo."),
          seletorMidia("Capa", ["imagem", "gif"], f.capa, (x) => { f.capa = x; }),
          texto("Ou link externo (YouTube, Spotify, SoundCloud, Bandcamp, Deezer, Apple Music)", f.externo, 300, (x) => { f.externo = x; }, { dica: "Link externo vira um botão “Ouvir em …” (a música toca no site de origem, respeitando os direitos)." }));
        li.append(topo, corpo);
        itemOrdenavel(li, m.faixas, i, desenhar);
        lista.append(li);
      });
      if (!m.faixas.length) lista.append(el("li", "dica", "Nenhuma faixa ainda."));
    };
    desenhar();
    const add = botao("Adicionar faixa", () => { if (m.faixas.length >= rec.limites.faixas) return; m.faixas.push({ titulo: "", artista: "", midia: null, capa: null, externo: "", direitos: false }); desenhar(); mudou(); }, "botao botao-pequeno");
    c.append(grupo("Músicas", lista, add), grupo("Player", selecao("Estilo", [["compacto", "Compacto"], ["completo", "Completo (com progresso)"], ["barra", "Barra embaixo"]], m.estilo, (x) => { m.estilo = x; }),
      numero("Volume inicial", m.volume, 0, 100, 5, (x) => { m.volume = x; }, "%"), marcar("Mostrar o player (desligado: fica só um botão de pausa)", m.mostrar, (x) => { m.mostrar = x; }),
      marcar("Tocar sozinho", m.autoplay, (x) => { m.autoplay = x; }, "Os navegadores só tocam áudio depois de um toque da pessoa. Por isso, junto com o portão “clique para entrar”, a música começa na hora do clique."),
      marcar("Repetir a lista", m.loop, (x) => { m.loop = x; }), marcar("Ordem aleatória", m.embaralhar, (x) => { m.embaralhar = x; })));

    const d = V.digitacao;
    const ld = el("ol", "blocos-lista");
    const desd = () => {
      ld.replaceChildren();
      d.textos.forEach((t, i) => {
        const li = el("li", "bloco-form linha-simples");
        li.append(texto(`Texto ${i + 1}`, t, 80, (x) => { d.textos[i] = x; }), acoesOrdem(d.textos, i, desd, `o texto ${i + 1}`));
        itemOrdenavel(li, d.textos, i, desd);
        ld.append(li);
      });
    };
    desd();
    c.append(grupo("Digitação (efeito de máquina de escrever na bio)", marcar("Ligar", d.ativo, (x) => { d.ativo = x; }, "Precisa de pelo menos um texto. No lugar da bio simples, esses textos são digitados em sequência."), ld,
      botao("Adicionar texto", () => { if (d.textos.length >= rec.limites.textos_digitacao) return; d.textos.push(""); desd(); mudou(); }, "botao botao-fio botao-pequeno"),
      selecao("Estilo", [["digitar", "Digitar e apagar"], ["apagar", "Digitar, esperar e apagar"], ["fade", "Aparecer (sem digitar)"]], d.estilo, (x) => { d.estilo = x; }),
      numero("Velocidade de digitar", d.velocidade, 20, 250, 5, (x) => { d.velocidade = x; }, " ms"), numero("Velocidade de apagar", d.velocidade_apagar, 10, 250, 5, (x) => { d.velocidade_apagar = x; }, " ms"),
      numero("Pausa entre textos", d.pausa, 300, 6000, 100, (x) => { d.pausa = x; }, " ms"), marcar("Repetir em ciclo", d.loop, (x) => { d.loop = x; }), marcar("Mostrar cursor piscando", d.cursor, (x) => { d.cursor = x; }), marcar("Ordem aleatória", d.embaralhar, (x) => { d.embaralhar = x; })));
  }

  const FUSOS = () => { try { return Intl.supportedValuesOf("timeZone"); } catch { return ["America/Sao_Paulo", "America/Recife", "America/Manaus", "America/Fortaleza", "America/Lisbon", "Europe/Lisbon", "America/New_York", "Europe/London", "Asia/Tokyo", "UTC"]; } };

  function configWidget(w, c, desenhar) {
    const cfg = w.config;
    const t = w.tipo;
    if (t === "relogio") c.append(selecao("Fuso horário", FUSOS().map((x) => [x, x]), cfg.fuso || "America/Sao_Paulo", (x) => { cfg.fuso = x; }), selecao("Formato", [["24", "24 horas"], ["12", "12 horas"]], String(cfg.formato || 24), (x) => { cfg.formato = Number(x); }), marcar("Mostrar a data", cfg.data !== false, (x) => { cfg.data = x; }));
    else if (t === "clima") c.append(texto("Cidade", cfg.cidade, 60, (x) => { cfg.cidade = x; }, { ph: "Recife" }), selecao("Unidade", [["c", "°C"], ["f", "°F"]], cfg.unidade || "c", (x) => { cfg.unidade = x; }), aviso("Dados do Open-Meteo, buscados pelo servidor."));
    else if (t === "github") c.append(texto("Usuário do GitHub", cfg.usuario, 39, (x) => { cfg.usuario = x; }));
    else if (t === "roblox") c.append(texto("Usuário do Roblox", cfg.usuario, 20, (x) => { cfg.usuario = x; }));
    else if (t === "youtube") c.append(texto("ID do canal (começa com UC)", cfg.canal_id, 24, (x) => { cfg.canal_id = x; }, { dica: "No YouTube: Seu canal → Personalizar → Informações básicas → copiar ID do canal." }));
    else if (t === "discord_servidor") c.append(texto("Convite do servidor", cfg.convite, 60, (x) => { cfg.convite = x; }, { ph: "discord.gg/vulpus", dica: "Mostra nome, ícone, membros e online do servidor. Use convites permanentes." }));
    else if (t === "lastfm") c.append(texto("Usuário do Last.fm", cfg.usuario, 15, (x) => { cfg.usuario = x; }));
    else if (t === "sobre") c.append(texto("Texto", cfg.texto, 600, (x) => { cfg.texto = x; }, { linhas: 4 }));
    else if (t === "projetos") {
      cfg.itens = cfg.itens || [];
      const l = el("div");
      const des = () => { l.replaceChildren(); cfg.itens.forEach((p, i) => { const b = el("div", "link-linha"); b.append(texto("Projeto", p.titulo, 40, (x) => { p.titulo = x; }), texto("Descrição", p.descricao, 140, (x) => { p.descricao = x; }), texto("Link (https)", p.url, 300, (x) => { p.url = x; }), botao("Tirar", () => { cfg.itens.splice(i, 1); des(); mudou(); }, "mini perigo")); l.append(b); }); };
      des();
      c.append(l, botao("Adicionar projeto", () => { if (cfg.itens.length >= 8) return; cfg.itens.push({ titulo: "", descricao: "", url: "" }); des(); mudou(); }));
    } else if (t === "habilidades") {
      cfg.itens = cfg.itens || [];
      const l = el("div");
      const des = () => { l.replaceChildren(); cfg.itens.forEach((p, i) => { const b = el("div", "link-linha"); b.append(texto("Habilidade", p.nome, 24, (x) => { p.nome = x; }), numero("Nível", p.nivel, 0, 100, 5, (x) => { p.nivel = x; }, "%"), botao("Tirar", () => { cfg.itens.splice(i, 1); des(); mudou(); }, "mini perigo")); l.append(b); }); };
      des();
      c.append(l, botao("Adicionar habilidade", () => { if (cfg.itens.length >= 12) return; cfg.itens.push({ nome: "", nivel: 50 }); des(); mudou(); }));
    } else if (t === "discord_presenca") c.append(aviso("Mostra o seu status, o que você está jogando e o Spotify. É sempre o da conta que é dona da página. Para funcionar, entre uma vez em discord.gg/lanyard (serviço gratuito) com essa conta."));
    else if (t === "minecraft") c.append(aviso("Mostra nick, nível e tempo de jogo se o Minecraft está ligado e o perfil público está ligado."));
    else if (t === "visitas") c.append(aviso("Mostra o total de visitas e as dos últimos 7 dias (contagem real, sem rastrear ninguém)."));
  }

  function painelWidgets(c) {
    const V = v2();
    const ab = V.abas;
    c.append(grupo("Abas", marcar("Usar duas abas (a segunda guarda widgets extras)", ab.ativo, (x) => { ab.ativo = x; }), texto("Nome da primeira aba", ab.principal, 18, (x) => { ab.principal = x; }), texto("Nome da segunda aba", ab.segunda, 18, (x) => { ab.segunda = x; })));
    const lista = el("ol", "blocos-lista");
    const nomes = Object.fromEntries(rec.widgets.map((w) => [w.tipo, w.rotulo]));
    const desenhar = () => {
      lista.replaceChildren();
      V.widgets.forEach((w, i) => {
        const li = el("li", "bloco-form");
        const topo = el("div", "bloco-topo");
        topo.append(el("strong", "", nomes[w.tipo] || w.tipo), acoesOrdem(V.widgets, i, desenhar, `o widget ${i + 1}`));
        const corpo = el("div", "bloco-corpo");
        corpo.append(texto("Título (opcional)", w.titulo, 30, (x) => { w.titulo = x; }), selecao("Aba", [["principal", "Primeira"], ["segunda", "Segunda"]], w.aba, (x) => { w.aba = x; }), selecao("Largura", [["meia", "Meia"], ["inteira", "Inteira"]], w.largura, (x) => { w.largura = x; }));
        configWidget(w, corpo, desenhar);
        li.append(topo, corpo);
        itemOrdenavel(li, V.widgets, i, desenhar);
        lista.append(li);
      });
      if (!V.widgets.length) lista.append(el("li", "dica", "Nenhum widget ainda."));
    };
    desenhar();
    const sel = el("select");
    for (const w of rec.widgets) { const o = el("option", "", `${w.rotulo}${w.disponivel ? "" : " (indisponível)"}`); o.value = w.tipo; o.disabled = !w.disponivel; sel.append(o); }
    const st = el("p", "dica");
    const add = botao("Adicionar widget", () => {
      if (V.widgets.length >= rec.limites.widgets) return msg(st, `No máximo ${rec.limites.widgets} widgets.`, true);
      const padrao = { relogio: { fuso: "America/Sao_Paulo", formato: 24, data: true }, clima: { cidade: "", unidade: "c" }, github: { usuario: "" }, roblox: { usuario: "" }, youtube: { canal_id: "" }, discord_servidor: { convite: "" }, lastfm: { usuario: "" }, sobre: { texto: "" }, projetos: { itens: [] }, habilidades: { itens: [] } }[sel.value] || {};
      V.widgets.push({ id: `w${Date.now().toString(36)}`, tipo: sel.value, aba: "principal", titulo: "", config: copia(padrao), largura: "meia" });
      msg(st, "");
      desenhar();
      mudou();
    }, "botao botao-pequeno");
    const avisoSel = rec.widgets.find((w) => !w.disponivel);
    c.append(grupo("Widgets", lista, campo("Novo widget", sel), add, st, ...(avisoSel ? [aviso(avisoSel.aviso)] : [])));
    c.append(aviso("Os widgets buscam dados reais (o servidor da Vulpus consulta e guarda em cache por alguns minutos). Se o serviço de fora falhar, o widget mostra “indisponível” em vez de inventar. Spotify e Twitch pedem login do dono da conta; por isso o Spotify aparece pelo widget de Discord (quando a conta está ligada) e a Twitch vira link."));
  }

  // ------------------------------------------------------------------ mídia
  function painelMidia(c) {
    const lista = el("div", "midia-grade");
    let filtroTipo = "";
    let filtroPasta = "";
    const barra = el("div", "midia-uso");
    const prog = el("progress");
    prog.max = uso.max_bytes; prog.value = uso.bytes;
    barra.append(el("span", "", `${uso.arquivos}/${uso.max_arquivos} arquivos · ${(uso.bytes / 1048576).toFixed(1)} de ${(uso.max_bytes / 1048576).toFixed(0)} MB`), prog);
    const st = el("p", "dica");
    st.setAttribute("role", "status");
    msg(st, msgMidia.t, msgMidia.e);
    msgMidia = { t: "", e: false };
    const desenhar = () => {
      lista.replaceChildren();
      const itens = midias.filter((m) => (!filtroTipo || m.tipo === filtroTipo) && (!filtroPasta || m.pasta === filtroPasta));
      for (const m of itens) {
        const k = el("article", "midia-cartao");
        const prev = el("div", "midia-previa");
        if (m.tipo === "imagem" || m.tipo === "gif" || m.tipo === "cursor") { const i = el("img"); i.src = m.url; i.alt = m.nome; i.loading = "lazy"; prev.append(i); }
        else if (m.tipo === "video") { const v = el("video"); v.src = m.url; v.controls = true; v.preload = "metadata"; v.muted = true; prev.append(v); }
        else if (m.tipo === "audio") { const a = el("audio"); a.src = m.url; a.controls = true; a.preload = "none"; prev.append(a); }
        else prev.append(el("p", "midia-fonte", "Aa Bb Cc"));
        const nome = el("input");
        nome.value = m.nome; nome.maxLength = 60; nome.setAttribute("aria-label", `Nome de ${m.nome}`);
        nome.addEventListener("change", async () => { const { r, d } = await H.E.chamar("PUT", `/painel/api/pagina/midia/${m.id}`, { nome: nome.value }); if (r.ok) m.nome = d.nome; else msg(st, d.mensagem, true); });
        const pasta = el("input");
        pasta.value = m.pasta; pasta.maxLength = 30; pasta.placeholder = "Pasta"; pasta.setAttribute("aria-label", `Pasta de ${m.nome}`);
        pasta.addEventListener("change", async () => { const { r, d } = await H.E.chamar("PUT", `/painel/api/pagina/midia/${m.id}`, { pasta: pasta.value }); if (r.ok) { m.pasta = d.pasta; pastas = [...new Set(midias.map((x) => x.pasta).filter(Boolean))]; } });
        const meta = el("p", "dica", `${m.tipo} · ${(m.tamanho / 1024).toFixed(0)} KB${m.largura ? ` · ${m.largura}×${m.altura}` : ""}${m.em_uso ? " · em uso" : ""}`);
        const rep = el("input");
        rep.type = "file"; rep.hidden = true;
        rep.addEventListener("change", async () => {
          const f = rep.files[0];
          rep.value = "";
          if (!f) return;
          const fd = new FormData();
          fd.append("arquivo", f, f.name);
          msg(st, "Trocando o arquivo…");
          const { r, d } = await H.E.chamar("POST", `/painel/api/pagina/midia/${m.id}/substituir`, fd);
          if (!r.ok) return msg(st, d.mensagem || "Não consegui trocar.", true);
          Object.assign(m, d);
          msg(st, "Arquivo trocado (a página continua apontando para ele).");
          desenhar();
          mudou();
        });
        const acoes = el("div", "bloco-acoes");
        const apagar = botao("Apagar", async () => {
          let { r, d } = await H.E.chamar("DELETE", `/painel/api/pagina/midia/${m.id}`);
          if (r.status === 409 && confirm("Essa mídia está sendo usada na página. Apagar mesmo assim? A página vai ficar sem ela.")) ({ r, d } = await H.E.chamar("DELETE", `/painel/api/pagina/midia/${m.id}?forcar=1`));
          if (r.ok) { midias = midias.filter((x) => x.id !== m.id); uso.arquivos -= 1; uso.bytes -= m.tamanho; reconstruir(); H.alterou(); } else msg(st, d.mensagem || "Não consegui apagar.", true);
        }, "mini perigo");
        acoes.append(botao("Trocar arquivo", () => rep.click()), apagar);
        k.append(prev, nome, pasta, meta, acoes, rep);
        lista.append(k);
      }
      if (!itens.length) lista.append(el("p", "dica", "Nenhuma mídia aqui ainda."));
    };
    const tipoSel = selecao("Tipo", [["", "Todos"], ...[["imagem", "Imagens"], ["gif", "GIFs"], ["video", "Vídeos"], ["audio", "Áudios"], ["fonte", "Fontes"], ["cursor", "Cursores"]]], "", (x) => { filtroTipo = x; desenhar(); });
    const pastaSel = selecao("Pasta", [["", "Todas"], ...pastas.map((p) => [p, p])], "", (x) => { filtroPasta = x; desenhar(); });
    const subir = el("div", "midia-envio");
    const tipoNovo = el("select");
    for (const [v, r] of [["imagem", "Imagem (PNG, JPG, WebP — até 3 MB)"], ["gif", "GIF (até 5 MB)"], ["video", "Vídeo MP4/WebM (até 12 MB)"], ["audio", "Áudio (até 8 MB)"], ["fonte", "Fonte (até 1 MB)"], ["cursor", "Cursor (PNG até 128×128)"]]) { const o = el("option", "", r); o.value = v; tipoNovo.append(o); }
    const pastaNova = el("input");
    pastaNova.placeholder = "Pasta (opcional)"; pastaNova.maxLength = 30;
    const arq = el("input");
    arq.type = "file"; arq.multiple = true;
    const zona = el("div", "midia-zona", "Solte arquivos aqui ou escolha abaixo");
    const mandar = async (arquivos) => {
      let algum = false;
      for (const f of arquivos) {
        msg(st, `Enviando ${f.name}…`);
        const res = await enviar(f, tipoNovo.value === "imagem" ? adivinharTipo(f, ["imagem", "gif"]) : tipoNovo.value, pastaNova.value.trim());
        if (!res.r.ok) { msgMidia = { t: `${f.name}: ${res.d.mensagem || "não consegui enviar."}`, e: true }; break; }
        algum = true;
        msgMidia = { t: "Enviado.", e: false };
      }
      if (algum) reconstruir();
      else { msg(st, msgMidia.t, msgMidia.e); msgMidia = { t: "", e: false }; }
    };
    arq.addEventListener("change", () => { mandar([...arq.files]); arq.value = ""; });
    zona.addEventListener("dragover", (e) => { e.preventDefault(); zona.classList.add("alvo"); });
    zona.addEventListener("dragleave", () => zona.classList.remove("alvo"));
    zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("alvo"); mandar([...e.dataTransfer.files]); });
    subir.append(zona, campo("Tipo do arquivo", tipoNovo), campo("Pasta", pastaNova), campo("Arquivos", arq));
    c.append(grupo("Gerenciador de mídia", barra, subir, st, el("div", "add-linha"), lista));
    c.querySelector(".add-linha").append(tipoSel, pastaSel);
    c.append(aviso("Tudo que você envia é conferido pelo conteúdo do arquivo (não pelo nome), imagens são regravadas sem metadados, e só você pode apagar ou trocar. Não envie nada que não seja seu ou que quebre as regras: a equipe pode tirar páginas do ar."));
    desenhar();
  }

  // ------------------------------------------------------------------ selos
  function painelSelos(c) {
    const B = v2().badges;
    const lista = el("ul", "selos-lista");
    for (const s of selosOficiais) {
      const li = el("li");
      const g = marcar(`${s.emoji} ${s.rotulo}${s.categoria === "medalha" ? " (medalha do Discord)" : ""}`, !B.ocultos.includes(s.id), (x) => { B.ocultos = x ? B.ocultos.filter((i) => i !== s.id) : [...B.ocultos, s.id]; }, s.descricao);
      li.append(g);
      lista.append(li);
    }
    if (!selosOficiais.length) lista.append(el("li", "dica", "Você ainda não tem selos verificados. Eles vêm do seu cargo no Discord, do tempo de casa e da equipe (veja abaixo)."));
    const proprios = el("div");
    const des = () => {
      proprios.replaceChildren();
      B.proprios.forEach((p, i) => { const l = el("div", "link-linha"); l.append(texto("Texto do selo", p.texto, 20, (x) => { p.texto = x; }), texto("Emoji", p.emoji, 4, (x) => { p.emoji = x; }), botao("Tirar", () => { B.proprios.splice(i, 1); des(); mudou(); }, "mini perigo")); proprios.append(l); });
    };
    des();
    c.append(grupo("Selos verificados", marcar("Mostrar selos na página", B.mostrar, (x) => { B.mostrar = x; }), lista, aviso("Estes selos você não escolhe: vêm do servidor. Quem decide é o Discord da Vulpus (cargos) e a equipe. Você só escolhe quais mostrar.")),
      grupo("Selos próprios", aviso("Até 3. Aparecem marcados como “da própria pessoa”, sem o visto de verificado."), proprios, botao("Adicionar selo próprio", () => { if (B.proprios.length >= 3) return; B.proprios.push({ texto: "", emoji: "" }); des(); mudou(); })),
      grupo("Como ganhar selos", ...comoGanhar.map((s) => el("p", "dica", `${s.emoji} ${s.rotulo}: ${s.descricao} ${s.automatico ? "(automático)" : "(concedido pela equipe)"}`))));
  }

  // ------------------------------------------------------------------ análises
  async function painelAnalises(c) {
    const cab = el("div", "analise-topo");
    let dias = 30;
    const corpo = el("div", "analise-corpo");
    const sel = selecao("Período", [["7", "7 dias"], ["14", "14 dias"], ["30", "30 dias"], ["90", "90 dias"]], "30", (x) => { dias = Number(x); carregar(); });
    cab.append(sel);
    c.append(grupo("Análises da página", cab, corpo));
    const delta = (a, b) => { if (!b) return a ? "novo" : "—"; const p = Math.round(((a - b) / b) * 100); return `${p > 0 ? "▲" : p < 0 ? "▼" : "="} ${Math.abs(p)}%`; };
    const grafico = (serie) => {
      const NS = "http://www.w3.org/2000/svg";
      const W = 560; const A = 140; const mx = Math.max(1, ...serie.map((s) => s.views));
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${A + 22}`); svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", `Gráfico de visualizações por dia. Máximo ${mx} em um dia.`);
      svg.classList.add("grafico");
      const bw = W / serie.length;
      serie.forEach((s, i) => {
        const h = (s.views / mx) * A; const r = document.createElementNS(NS, "rect");
        r.setAttribute("x", String(i * bw + 1)); r.setAttribute("y", String(A - h)); r.setAttribute("width", String(Math.max(1, bw - 2))); r.setAttribute("height", String(h)); r.setAttribute("class", "barra-views");
        const t = document.createElementNS(NS, "title"); t.textContent = `${s.dia}: ${s.views} visualizações, ${s.unicos} únicos, ${s.cliques} cliques`; r.append(t); svg.append(r);
        const h2 = (s.unicos / mx) * A; const r2 = document.createElementNS(NS, "rect");
        r2.setAttribute("x", String(i * bw + 1)); r2.setAttribute("y", String(A - h2)); r2.setAttribute("width", String(Math.max(1, bw - 2))); r2.setAttribute("height", String(h2)); r2.setAttribute("class", "barra-unicos"); svg.append(r2);
      });
      for (const [i, s] of [[0, serie[0]], [serie.length - 1, serie[serie.length - 1]]]) { const tx = document.createElementNS(NS, "text"); tx.setAttribute("x", String(i === 0 ? 0 : W)); tx.setAttribute("y", String(A + 16)); tx.setAttribute("text-anchor", i === 0 ? "start" : "end"); tx.setAttribute("class", "eixo"); tx.textContent = s.dia.slice(5).split("-").reverse().join("/"); svg.append(tx); }
      return svg;
    };
    const tabela = (cabs, linhas) => { const t = el("table", "tabela-an"); const th = el("tr"); cabs.forEach((x) => th.append(el("th", "", x))); t.append(th); for (const l of linhas) { const tr = el("tr"); l.forEach((x) => tr.append(el("td", "", x))); t.append(tr); } return t; };
    async function carregar() {
      corpo.replaceChildren(el("p", "dica", "Carregando…"));
      const q = new URLSearchParams({ tipo: H.tipo, dias: String(dias), ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}) });
      const { r, d } = await H.E.chamar("GET", `/painel/api/pagina/estatisticas?${q}`);
      corpo.replaceChildren();
      if (!r.ok) return corpo.append(el("p", "dica", d.mensagem || "Salve e publique a página para ver as análises."));
      visitasCache = d.total_geral;
      const k = el("div", "analise-numeros");
      for (const [rot, val, ant] of [["Visualizações", d.atual.views, d.anterior.views], ["Visitantes únicos", d.atual.unicos, d.anterior.unicos], ["Cliques", d.atual.cliques, d.anterior.cliques]]) { const i = el("div", "numero-an"); i.append(el("strong", "", val.toLocaleString("pt-BR")), el("span", "", rot), el("small", "", `${delta(val, ant)} vs. período anterior`)); k.append(i); }
      const i4 = el("div", "numero-an"); i4.append(el("strong", "", String(d.media_diaria)), el("span", "", "Média por dia"), el("small", "", `Taxa de cliques ${d.taxa_cliques}%`)); k.append(i4);
      corpo.append(k, grafico(d.serie), el("p", "legenda-an", "Barras claras: visualizações. Barras fortes: visitantes únicos."));
      corpo.append(el("h3", "", "Links mais clicados"), d.links.length ? tabela(["Link", "Cliques", "CTR"], d.links.map((l) => [l.titulo, l.cliques, `${l.ctr}%`])) : el("p", "dica", "Ainda sem cliques no período."));
      corpo.append(el("h3", "", "De onde vieram"), d.referencias.length ? tabela(["Origem", "Visitas"], d.referencias.map((x) => [x.host, x.visitas])) : el("p", "dica", "Visitas diretas (sem origem) ou ainda sem dados."));
      corpo.append(el("h3", "", "Dispositivos"), d.dispositivos.length ? tabela(["Tipo", "Visitas"], d.dispositivos.map((x) => [x.tipo, x.visitas])) : el("p", "dica", "Sem dados ainda."));
      corpo.append(el("h3", "", "Países"), el("p", "dica", "Indisponível: o servidor não recebe a localização de quem visita, e não inventamos números."));
      const det = el("details", "metodologia"); det.append(el("summary", "", "Como contamos"), el("p", "", d.metodologia)); corpo.append(det);
      const dt = el("details"); dt.append(el("summary", "", "Tabela dos dias (acessível)"), tabela(["Dia", "Visualizações", "Únicos", "Cliques"], d.serie.map((s) => [s.dia, s.views, s.unicos, s.cliques]))); corpo.append(dt);
    }
    carregar();
  }

  // ------------------------------------------------------------------ modelos
  function painelModelos(c) {
    const filtros = { q: "", escopo: "publico", ordem: "novos" };
    const lista = el("div", "modelos-grade");
    const st = el("p", "dica");
    st.setAttribute("role", "status");
    let partes = new Set(rec.partes_modelo.map((p) => p.id));
    const corpoPartes = el("div", "opcoes");
    for (const p of rec.partes_modelo) { const l = el("label", "opcao"); const i = el("input"); i.type = "checkbox"; i.checked = true; i.addEventListener("change", () => { if (i.checked) partes.add(p.id); else partes.delete(p.id); }); l.append(i, el("span", "", p.rotulo)); corpoPartes.append(l); }
    const corpoAplicar = (id, salvar) => ({ tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}), partes: [...partes], salvar });
    const previa = async (m) => {
      msg(st, "Montando a prévia com o SEU conteúdo…");
      const { r, d } = await H.E.chamar("POST", `/painel/api/pagina/modelos/${m.id}/aplicar`, corpoAplicar(m.id, false));
      if (!r.ok) return msg(st, d.mensagem || "Não consegui montar a prévia.", true);
      msg(st, "");
      H.definirModeloPrevia(d.pagina);
      const barra = $("e-previa-modelo");
      barra.hidden = false;
      barra.replaceChildren(el("span", "", `Pré-visualizando “${m.nome}” (nada foi salvo). `), botao("Aplicar", async () => { await H.salvarAgora(); const x = await H.E.chamar("POST", `/painel/api/pagina/modelos/${m.id}/aplicar`, corpoAplicar(m.id, true)); if (x.r.ok) { fecharPrevia(); H.trocarPg(x.d.pagina); reconstruir(); H.alterou(); msg(st, "Modelo aplicado. Seus textos, links, músicas e mídias continuam intactos."); } else msg(st, x.d.mensagem, true); }, "botao botao-pequeno"), botao("Cancelar", fecharPrevia, "mini"));
    };
    const fecharPrevia = () => { H.definirModeloPrevia(null); $("e-previa-modelo").hidden = true; };
    const desenhar = (itens) => {
      lista.replaceChildren();
      for (const m of itens) {
        const k = el("article", "modelo-cartao");
        const faixa = el("div", "modelo-faixa");
        const vis = (m.dados && m.dados.v2 && m.dados.v2.visual) || {};
        const co = vis.cores || {};
        for (const x of [co.texto, co.destaque, co.destaque2, co.cartao, (vis.fundo || {}).cor]) { const s = el("i"); s.style.background = /^#[0-9a-f]{6}$/i.test(x || "") ? x : "#444"; faixa.append(s); }
        k.append(faixa, el("h3", "", m.nome), el("p", "dica", `por ${m.autor} · layout ${(m.dados.v2 || {}).layout || "—"}`), el("p", "", m.descricao || ""));
        const tags = el("p", "tags-modelo");
        for (const t of m.tags) tags.append(el("span", "", t));
        k.append(tags, el("p", "dica", `${m.usos} usos · ${m.favoritos} favoritos${m.visibilidade !== "publico" ? ` · ${m.visibilidade === "privado" ? "privado" : "não listado"}` : ""} · ID ${m.id}`));
        const a = el("div", "bloco-acoes");
        a.append(botao("Pré-visualizar com a minha página", () => previa(m), "mini"), botao(m.favorito ? "Favorito (tirar)" : "Favoritar", async () => { const { r, d } = await H.E.chamar("POST", `/painel/api/pagina/modelos/${m.id}/favoritar`); if (r.ok) { m.favorito = d.favorito; m.favoritos += d.favorito ? 1 : -1; carregar(); } }));
        if (m.meu) {
          a.append(botao("Atualizar com o design atual", async () => { const { r, d } = await H.E.chamar("PUT", `/painel/api/pagina/modelos/${m.id}`, { atualizar_design: true, tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}) }); msg(st, r.ok ? "Modelo atualizado." : d.mensagem, !r.ok); carregar(); }),
            botao("Visibilidade", async () => { const novo = { publico: "nao_listado", nao_listado: "privado", privado: "publico" }[m.visibilidade]; const { r, d } = await H.E.chamar("PUT", `/painel/api/pagina/modelos/${m.id}`, { visibilidade: novo }); msg(st, r.ok ? `Agora é ${{ publico: "público", nao_listado: "não listado (só com o ID)", privado: "privado" }[novo]}.` : d.mensagem, !r.ok); carregar(); }),
            botao("Apagar", async () => { if (!confirm(`Apagar o modelo “${m.nome}”?`)) return; await H.E.chamar("DELETE", `/painel/api/pagina/modelos/${m.id}`); carregar(); }, "mini perigo"));
        }
        k.append(a);
        lista.append(k);
      }
      if (!itens.length) lista.append(el("p", "dica", "Nenhum modelo aqui."));
    };
    async function carregar() {
      const q = new URLSearchParams({ q: filtros.q, escopo: filtros.escopo, ordem: filtros.ordem });
      const { r, d } = await H.E.chamar("GET", `/painel/api/pagina/modelos?${q}`);
      if (r.ok) desenhar(d.modelos); else msg(st, d.mensagem, true);
    }
    const busca = el("input");
    busca.type = "search"; busca.placeholder = "Buscar por nome, descrição ou tag";
    let tb = 0;
    busca.addEventListener("input", () => { clearTimeout(tb); tb = setTimeout(() => { filtros.q = busca.value; carregar(); }, 300); });
    const porId = el("input");
    porId.type = "number"; porId.min = "1"; porId.placeholder = "ID do modelo";
    const abrirId = botao("Abrir modelo por ID", async () => { const { r, d } = await H.E.chamar("GET", `/painel/api/pagina/modelos/${Number(porId.value) || 0}`); if (r.ok) desenhar([d]); else msg(st, d.mensagem || "Modelo não encontrado.", true); });
    const nome = el("input"); nome.maxLength = 40; nome.placeholder = "Nome do modelo";
    const desc = el("input"); desc.maxLength = 140; desc.placeholder = "Descrição curta";
    const tags = el("input"); tags.placeholder = "tags separadas por vírgula (ex.: neve, rosa)";
    const vis = el("select"); for (const [v, r] of [["publico", "Público (aparece na vitrine)"], ["nao_listado", "Não listado (só com o ID)"], ["privado", "Privado (só eu)"]]) { const o = el("option", "", r); o.value = v; vis.append(o); }
    const criar = botao("Criar modelo a partir da minha página", async () => {
      await H.salvarAgora();
      const { r, d } = await H.E.chamar("POST", "/painel/api/pagina/modelos", { tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}), nome: nome.value, descricao: desc.value, tags: tags.value.split(",").map((x) => x.trim()).filter(Boolean), visibilidade: vis.value });
      if (!r.ok) return msg(st, (d.erros && Object.values(d.erros).join(" ")) || d.mensagem || "Não consegui criar.", true);
      msg(st, "Modelo criado. Só o visual vai nele: seus textos, links, músicas, widgets e mídias ficam de fora.");
      filtros.escopo = "meus"; esc.querySelector("select").value = "meus"; carregar();
    }, "botao botao-pequeno");
    const esc = selecao("Ver", [["publico", "Da comunidade"], ["meus", "Meus modelos"], ["favoritos", "Favoritos"]], "publico", (x) => { filtros.escopo = x; carregar(); });
    const ord = selecao("Ordenar", [["novos", "Mais novos"], ["usos", "Mais usados"], ["favoritos", "Mais favoritados"], ["aleatorio", "Aleatório"]], "novos", (x) => { filtros.ordem = x; carregar(); });
    c.append(grupo("Escolha o que importar", aviso("Marque só as partes que quer trazer do modelo. Textos, links, músicas, widgets e mídias seus nunca são apagados."), corpoPartes),
      grupo("Vitrine de modelos", el("div", "add-linha"), campo("Buscar", busca), lista, st, el("div", "add-linha")),
      grupo("Criar modelo", campo("Nome", nome), campo("Descrição", desc), campo("Tags", tags), campo("Visibilidade", vis), criar));
    c.querySelectorAll(".add-linha")[0].append(esc, ord);
    c.querySelectorAll(".add-linha")[1].append(porId, abrirId);
    carregar();
  }

  // ------------------------------------------------------------------ endereços e SEO
  function painelEndereco(c) {
    const V = v2();
    const seo = V.seo;
    const base = VULPUS.API;
    const slug = H.slug();
    const st = el("p", "dica");
    st.setAttribute("role", "status");
    const q = () => new URLSearchParams({ tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}) });
    const aliasBox = el("div");
    let estadoPub = H.publicada();
    const desenharAliases = async () => {
      aliasBox.replaceChildren();
      if (!slug) return aliasBox.append(el("p", "dica", "Salve a página para criar endereços extras."));
      const { r, d } = await H.E.chamar("GET", `/painel/api/pagina/enderecos?${q()}`);
      if (!r.ok) return aliasBox.append(el("p", "dica", d.mensagem || ""));
      const ul = el("ul", "selos-lista");
      ul.append(el("li", "", `Principal: /p/?u=${d.principal}`));
      for (const a of d.aliases) { const li = el("li"); li.append(document.createTextNode(`Extra: ${a} `), botao("Tornar principal", async () => { const x = await H.E.chamar("POST", "/painel/api/pagina/enderecos/principal", { tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}), alias: a }); if (x.r.ok) { $("f-slug").value = x.d.principal; msg(st, "Endereço principal trocado; o antigo continua funcionando."); } else msg(st, x.d.mensagem, true); reconstruir(); }), botao("Remover", async () => { await H.E.chamar("DELETE", `/painel/api/pagina/enderecos?${q()}&alias=${encodeURIComponent(a)}`); desenharAliases(); }, "mini perigo")); ul.append(li); }
      const novo = el("input"); novo.maxLength = 30; novo.placeholder = "novo-endereco";
      aliasBox.append(ul, campo(`Endereço extra (${d.aliases.length}/${d.max_aliases})`, novo), botao("Adicionar endereço extra", async () => { const x = await H.E.chamar("POST", "/painel/api/pagina/enderecos", { tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}), alias: novo.value.trim().toLowerCase() }); if (x.r.ok) { msg(st, "Endereço extra criado."); desenharAliases(); } else msg(st, (x.d.erros && x.d.erros.alias) || x.d.mensagem, true); }));
      aliasBox.append(el("p", "dica", `Link curto: ${d.url_curta}. ${d.dominio_proprio}`));
    };
    desenharAliases();
    const vis = marcar("Aparecer em Explorar (a vitrine pública de páginas)", false, async (x) => { const { r, d } = await H.E.chamar("PUT", "/painel/api/pagina/visibilidade", { tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}), publico: x }); if (!r.ok) { msg(st, d.mensagem || "Não consegui mudar.", true); visInput.checked = !x; } else msg(st, x ? "Sua página aparece em Explorar." : "Sua página saiu de Explorar."); }, "Só páginas no ar aparecem. A equipe pode tirar páginas que quebrem as regras.");
    const visInput = vis.querySelector("input");
    visInput.checked = !!H.publico;
    visInput.disabled = !estadoPub || !H.pode();
    const qr = el("div", "qr-previa");
    if (slug && estadoPub) { const i = el("img"); i.src = `${base}/site/pagina/${slug}/qr.svg`; i.alt = "QR code da sua página"; i.width = 140; i.height = 140; const a = el("a", "link-seta", "Baixar QR (PNG)"); a.href = `${base}/site/pagina/${slug}/qr.svg?formato=png`; a.target = "_blank"; a.rel = "noopener"; const og = el("img"); og.src = `${base}/site/pagina/${slug}/og.png`; og.alt = "Prévia de compartilhamento"; og.className = "og-previa"; qr.append(i, a, el("p", "dica", "Prévia do cartão que aparece ao colar o link no Discord e em outros apps (gerado pelo servidor):"), og); }
    else qr.append(el("p", "dica", "Publique a página para gerar o QR code e a prévia de compartilhamento."));
    c.append(grupo("Endereços extras (aliases)", aliasBox, st), grupo("Compartilhar", vis, qr),
      grupo("SEO e compartilhamento", texto("Título nos buscadores e na prévia", seo.titulo, 70, (x) => { seo.titulo = x; }), texto("Descrição", seo.descricao, 200, (x) => { seo.descricao = x; }, { linhas: 2 }),
        seletorMidia("Imagem de compartilhamento (1200×630 fica ótimo)", ["imagem"], seo.imagem, (x) => { seo.imagem = x; }, "Sem imagem, o servidor gera uma com seu nome, bio e avatar."), seletorMidia("Favicon (ícone da aba)", ["imagem"], seo.favicon, (x) => { seo.favicon = x; }),
        cor("Cor do tema (barra do navegador no celular)", seo.cor_tema || "#1c1410", (x) => { seo.cor_tema = x; }), marcar("Permitir que buscadores (Google etc.) indexem a página", seo.indexavel, (x) => { seo.indexavel = x; }, "Desligado: a página recebe “noindex”.")),
      grupo("Extras da página", marcar("Portão “clique para entrar”", V.portao.ativo, (x) => { V.portao.ativo = x; }, "Esconde a página até o primeiro toque; é também o toque que libera música e vídeo com som."), texto("Texto do portão", V.portao.texto, 24, (x) => { V.portao.texto = x; }),
        marcar("Mural de recados (visitantes logados deixam mensagens; você apaga)", V.mural.ativo, (x) => { V.mural.ativo = x; }, "Sem links, sem menções em massa, com espera entre recados e limite diário."), marcar("Mostrar contador de visitas", V.mostrar_visitas, (x) => { V.mostrar_visitas = x; })));
  }

  // ------------------------------------------------------------------ abas do editor
  const CONSTRUTORES = { visual: painelVisual, links: painelLinks, musica: painelMusica, widgets: painelWidgets, midia: painelMidia, selos: painelSelos, modelos: painelModelos, analises: painelAnalises, endereco: null };
  function construir(nome) {
    const c = nome === "endereco" ? $("p-endereco") : $(`p-${nome}`);
    if (!c) return;
    c.replaceChildren();
    const fn = nome === "endereco" ? painelEndereco : CONSTRUTORES[nome];
    if (fn) fn(c);
    if (!H.pode()) for (const x of c.querySelectorAll("input, select, textarea, button")) x.disabled = true;
  }
  function reconstruir() { if (aberto !== "basico") construir(aberto); }
  function abrir(nome) {
    aberto = nome;
    for (const p of $("e-form").querySelectorAll(".e-painel")) p.hidden = p.dataset.painel !== nome;
    for (const b of $("e-abas").querySelectorAll("button")) { const on = b.dataset.painel === nome; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; }
    construir(nome);
  }
  function montarAbas() {
    const barra = $("e-abas");
    barra.replaceChildren();
    const paineis = [...$("e-form").querySelectorAll(".e-painel")];
    for (const p of paineis) {
      const b = el("button", "editor-aba", p.dataset.rotulo);
      b.type = "button"; b.dataset.painel = p.dataset.painel; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(p.dataset.painel === aberto)); b.tabIndex = p.dataset.painel === aberto ? 0 : -1;
      b.addEventListener("click", () => abrir(p.dataset.painel));
      b.addEventListener("keydown", (e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; e.preventDefault(); const bs = [...barra.children]; const i = bs.indexOf(b) + (e.key === "ArrowRight" ? 1 : -1); const alvo = bs[(i + bs.length) % bs.length]; alvo.focus(); abrir(alvo.dataset.painel); });
      barra.append(b);
    }
  }

  // ------------------------------------------------------------------ interface com o editor.js
  function selosPrevia(V) {
    const b = V.badges;
    if (!b.mostrar) return [];
    return [...selosOficiais.filter((s) => !b.ocultos.includes(s.id)), ...b.proprios.filter((p) => p.texto).map((p, i) => ({ id: `proprio-${i}`, rotulo: p.texto, emoji: p.emoji, descricao: "Selo escrito pela própria pessoa (não verificado).", categoria: "proprio", verificado: false }))];
  }
  function v2Previa(V) {
    const out = { ...V, midias: mapaMidias(), selos: selosPrevia(V) };
    out.fundo_galeria_url = H.galeriaMapa[V.visual.fundo.galeria] || null;
    if (V.mostrar_visitas) out.visitas = visitasCache; else delete out.visitas;
    return out;
  }
  function rotuloErro(chave) {
    const p = chave.split(".");
    const base = ROTULOS_PAINEL[p[1]] || p[1] || "Página";
    const i = /^\d+$/.test(p[2] || "") ? ` (item ${Number(p[2]) + 1})` : "";
    return `${base}${i}`;
  }
  async function iniciar(host) {
    H = host;
    rec = H.recursos;
    hist = [JSON.stringify(H.pg())];
    hi = 0;
    if (!iniciou) {
      iniciou = true;
      $("b-desfazer").addEventListener("click", () => irPara(hi - 1));
      $("b-refazer").addEventListener("click", () => irPara(hi + 1));
      for (const b of document.querySelectorAll("[data-disp]")) b.addEventListener("click", () => { for (const x of document.querySelectorAll("[data-disp]")) x.setAttribute("aria-pressed", String(x === b)); $("e-moldura").dataset.disp = b.dataset.disp; });
      document.addEventListener("keydown", (e) => {
        if (!(e.ctrlKey || e.metaKey) || $("e-editor").hidden) return;
        const alvo = e.target;
        if (alvo && /^(INPUT|TEXTAREA)$/.test(alvo.tagName) && alvo.type !== "range" && alvo.type !== "checkbox") return; // dentro de um campo de texto vale o desfazer do próprio campo
        if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); irPara(hi - 1); }
        else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) { e.preventDefault(); irPara(hi + 1); }
      });
    }
    montarAbas();
    botoesHist();
    const [, s] = await Promise.all([carregarMidias(), H.E.chamar("GET", `/painel/api/pagina/selos?${new URLSearchParams({ tipo: H.tipo, ...(H.tipo === "parceiro" ? { guild_id: H.guildId } : {}) })}`)]);
    if (s.r.ok) { selosOficiais = s.d.selos; comoGanhar = s.d.como_ganhar; }
    H.previa();
    abrir(aberto);
  }

  // o tema, a fonte, a cor e o fundo escolhidos na aba Básico passam a valer também no formato novo (antes só mudavam nas páginas antigas)
  const PALETAS = { madeira: ["#2b1d12", "#231910", "#efe3cb"], pergaminho: ["#f1e6d0", "#faf4e6", "#2a1d12"], noite: ["#0f1a2b", "#17263d", "#efe3cb"], floresta: ["#14231a", "#1b3024", "#e4ecd9"], brasa: ["#1d1210", "#2a1815", "#f5e3d3"], neve: ["#e8eff6", "#f6f9fc", "#17263d"] };
  function aplicarTema(pg) {
    const V = pg.v2;
    if (!V) return;
    const [fundo, cartao, texto] = PALETAS[pg.tema] || PALETAS.madeira;
    V.visual.cores.texto = texto;
    V.visual.cores.cartao = cartao;
    V.visual.cores.destaque = /^#[0-9a-f]{6}$/i.test(pg.cor) ? pg.cor.toLowerCase() : V.visual.cores.destaque;
    if (["alegreya", "fredoka", "nunito", "silkscreen"].includes(pg.fonte)) { V.visual.fonte.familia = pg.fonte; V.visual.fonte.midia = null; }
    const f = V.visual.fundo;
    if (pg.fundo) { f.tipo = "galeria"; f.galeria = pg.fundo; f.cor = fundo; }
    else if (f.tipo === "galeria" || f.tipo === "cor") { f.tipo = "cor"; f.cor = fundo; f.galeria = null; }
    else f.cor = fundo;
    if (aberto === "visual") construir("visual");
  }

  return { iniciar, registrar, v2Previa, rotuloErro, aplicarTema };
})();
