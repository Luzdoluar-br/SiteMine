// Editor de página personalizada (parceiro e Kitsune). Autosave com PUT, pré-visualização FIEL com o mesmo renderizador da página pública.
// Tudo que vem da API entra por textContent/value. A permissão de verdade é decidida no servidor; aqui só se mostra.
"use strict";

(() => {
  const { $, el } = VULPUS;
  const E = ENTRADA;
  const TIPOS_BLOCO = {
    texto: "Texto", links: "Links", citacao: "Citação", galeria: "Galeria de imagens", separador: "Separador", cartao_discord: "Cartão do servidor (parceiro)", cartao_minecraft: "Cartão do Minecraft (Kitsune)",
  };
  const ROTULOS_ICONE = { discord: "Discord", youtube: "YouTube", twitch: "Twitch", tiktok: "TikTok", instagram: "Instagram", twitter: "X / Twitter", github: "GitHub", site: "Site", loja: "Loja", doacao: "Apoio", outro: "Outro" };
  const params = new URLSearchParams(location.search);
  let tipo = params.get("tipo") || "";
  let guildId = params.get("guild_id") || "";
  let galeria = { fundos: [], temas: [], fontes: [], icones: [], limites: { blocos: 12, links: 20 } };
  let recursos = null;
  let modeloPrevia = null; // página temporária vinda de "pré-visualizar modelo": só a pré-visualização muda, nada é salvo
  let galeriaMapa = {};
  let estado = { slug: "", status: "nenhuma", pagina: null, pode: false, publicada: false, bloqueio: "" };
  let pg = { tema: "madeira", fonte: "alegreya", cor: "#e5731c", fundo: null, titulo: "", bio: "", blocos: [] };
  let tempoSalvar = null;
  let tempoSlug = null;
  let salvando = false;
  let pendente = false;

  const mostrar = (qual) => {
    for (const id of ["e-carregando", "e-entrar", "e-escolher", "e-editor"]) $(id).hidden = id !== qual;
  };
  const dica = (id, texto, erro) => {
    const e = $(id);
    e.textContent = texto || "";
    e.classList.toggle("erro", !!erro);
  };

  // ------------------------------------------------------------------ pré-visualização
  // widgets de verdade também na prévia: o servidor busca os dados com a configuração que a pessoa está digitando (cache de 90 s aqui)
  const cacheWidget = new Map();
  function widgetPrevia(id, w) {
    const corpo = { tipo, ...(tipo === "parceiro" ? { guild_id: guildId } : {}), widget: w.tipo, config: w.config };
    const chave = JSON.stringify([w.tipo, w.config]);
    const antigo = cacheWidget.get(chave);
    if (antigo && Date.now() - antigo.t < 90000) return antigo.p;
    const p = E.chamar("POST", "/painel/api/pagina/widget-previa", corpo).then(({ r, d }) => (r.ok ? d : { ok: false, mensagem: d.mensagem || "Indisponível no momento." }));
    cacheWidget.set(chave, { t: Date.now(), p });
    return p;
  }
  function previa() {
    const base = modeloPrevia || pg;
    const dados = { ...base, fundo: base.fundo ? galeriaMapa[base.fundo] || null : null, blocos: base.blocos.map((b) => (b.tipo === "galeria" ? { ...b, itens: b.itens.map((i) => ({ id: i, url: galeriaMapa[i] })) } : b)) };
    if (base.v2 && (typeof EDITOR2 !== "undefined")) dados.v2 = EDITOR2.v2Previa(base.v2);
    else delete dados.v2;
    PAGINA.renderizar($("e-previa"), dados, { galeria: galeriaMapa, titulo_padrao: "Minha página", modo: "editor", widget: widgetPrevia });
  }

  // ------------------------------------------------------------------ salvar (debounce)
  function alterou(daHistoria) {
    if (!estado.pode) return;
    previa();
    if ((typeof EDITOR2 !== "undefined") && !daHistoria) EDITOR2.registrar();
    $("e-salvo").textContent = "Alterações não salvas…";
    clearTimeout(tempoSalvar);
    tempoSalvar = setTimeout(salvar, 900);
  }

  function marcarErros(erros) {
    const msgs = Object.entries(erros || {}).map(([k, v]) => v);
    if (erros && erros.slug) dica("f-slug-msg", erros.slug, true);
    dica("f-blocos-msg", msgs.filter((m) => m !== (erros || {}).slug && !/^v2\./.test(Object.keys(erros).find((k) => erros[k] === m) || "")).join(" "), true);
    const v2 = Object.entries(erros || {}).filter(([k]) => k.startsWith("v2."));
    const caixa = $("e-erros");
    caixa.hidden = !v2.length;
    caixa.replaceChildren();
    if (v2.length) {
      caixa.append(el("strong", "", "Corrija para salvar:"));
      const ul = el("ul");
      for (const [k, v] of v2) ul.append(el("li", "", `${(typeof EDITOR2 !== "undefined") ? EDITOR2.rotuloErro(k) : k}: ${v}`));
      caixa.append(ul);
    }
  }

  async function salvar() {
    if (salvando) {
      pendente = true;
      return;
    }
    salvando = true;
    $("e-salvo").textContent = "Salvando…";
    const corpo = { tipo, slug: $("f-slug").value.trim().toLowerCase(), pagina: pg };
    if (tipo === "parceiro") corpo.guild_id = guildId;
    const { r, d } = await E.chamar("PUT", "/painel/api/pagina/minha", corpo);
    salvando = false;
    if (r.status === 401) return mostrar("e-entrar");
    if (r.ok) {
      estado.slug = d.slug;
      estado.status = d.status;
      estado.publicada = d.publicada;
      $("e-salvo").textContent = `Salvo às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
      marcarErros({});
      dica("f-slug-msg", "");
      atualizarPublicar();
    } else if (r.status === 400 || r.status === 409) {
      $("e-salvo").textContent = "Não salvei: corrija o que está marcado.";
      marcarErros(d.erros || { geral: d.mensagem });
    } else {
      $("e-salvo").textContent = d.mensagem || "Não consegui salvar agora. Vou tentar de novo na próxima alteração.";
    }
    if (pendente) {
      pendente = false;
      alterou();
    }
  }

  // ------------------------------------------------------------------ endereço (checagem ao vivo)
  function checarSlug() {
    clearTimeout(tempoSlug);
    tempoSlug = setTimeout(async () => {
      const v = $("f-slug").value.trim().toLowerCase();
      if (!v) return dica("f-slug-msg", "");
      const q = new URLSearchParams({ valor: v, tipo, ...(tipo === "parceiro" ? { guild_id: guildId } : {}) });
      const { r, d } = await E.chamar("GET", `/painel/api/pagina/slug?${q}`);
      if (!r.ok) return;
      if (d.livre) dica("f-slug-msg", "Endereço livre.", false);
      else dica("f-slug-msg", `${d.motivo || "Esse endereço não serve."}${d.sugestao ? ` Sugestão: ${d.sugestao}` : ""}`, true);
    }, 450);
  }

  // ------------------------------------------------------------------ controles de aparência
  function opcoes(idAlvo, lista, atual, nome, aoMudar) {
    const alvo = $(idAlvo);
    alvo.replaceChildren();
    for (const o of lista) {
      const l = el("label", "opcao");
      const i = el("input");
      i.type = "radio";
      i.name = nome;
      i.value = o.id;
      i.checked = o.id === atual;
      i.addEventListener("change", () => aoMudar(o.id));
      l.append(i, el("span", "", o.rotulo));
      alvo.append(l);
    }
  }

  function preencherAparencia() {
    opcoes("f-temas", galeria.temas, pg.tema, "tema", (v) => { pg.tema = v; if (typeof EDITOR2 !== "undefined") EDITOR2.aplicarTema(pg); alterou(); });
    opcoes("f-fontes", galeria.fontes, pg.fonte, "fonte", (v) => { pg.fonte = v; if (typeof EDITOR2 !== "undefined") EDITOR2.aplicarTema(pg); alterou(); });
    $("f-cor").value = /^#[0-9a-f]{6}$/i.test(pg.cor) ? pg.cor : "#e5731c";
    const sel = $("f-fundo");
    sel.replaceChildren();
    const nenhum = el("option", "", "Sem imagem");
    nenhum.value = "";
    sel.append(nenhum);
    for (const f of galeria.fundos) {
      const o = el("option", "", f.rotulo);
      o.value = f.id;
      sel.append(o);
    }
    sel.value = pg.fundo || "";
    $("f-titulo").value = pg.titulo;
    $("f-bio").value = pg.bio;
    contadores();
  }

  function contadores() {
    $("c-titulo").textContent = `${$("f-titulo").value.length}/60`;
    $("c-bio").textContent = `${$("f-bio").value.length}/300`;
  }

  // ------------------------------------------------------------------ blocos
  function campo(rotulo, tag, valor, max, aoMudar, extra = {}) {
    const g = el("div", "campo");
    const id = `c${Math.random().toString(36).slice(2, 8)}`;
    const l = el("label", "", rotulo);
    l.htmlFor = id;
    const i = el(tag);
    i.id = id;
    i.value = valor || "";
    if (max) i.maxLength = max;
    if (tag === "textarea") i.rows = extra.linhas || 4;
    i.addEventListener("input", () => aoMudar(i.value));
    g.append(l, i);
    return g;
  }

  function blocoForm(b, i) {
    const li = el("li", "bloco-form");
    const topo = el("div", "bloco-topo");
    topo.append(el("strong", "", TIPOS_BLOCO[b.tipo] || b.tipo));
    const acoes = el("div", "bloco-acoes");
    const mover = (delta, rotulo) => {
      const bt = el("button", "mini", rotulo);
      bt.type = "button";
      bt.setAttribute("aria-label", `${rotulo} o bloco ${i + 1}`);
      bt.disabled = i + delta < 0 || i + delta >= pg.blocos.length;
      bt.addEventListener("click", () => {
        [pg.blocos[i], pg.blocos[i + delta]] = [pg.blocos[i + delta], pg.blocos[i]];
        desenharBlocos();
        alterou();
      });
      return bt;
    };
    const rem = el("button", "mini perigo", "Remover");
    rem.type = "button";
    rem.setAttribute("aria-label", `Remover o bloco ${i + 1}`);
    rem.addEventListener("click", () => {
      pg.blocos.splice(i, 1);
      desenharBlocos();
      alterou();
    });
    acoes.append(mover(-1, "Subir"), mover(1, "Descer"), rem);
    topo.append(acoes);
    li.append(topo);
    const corpo = el("div", "bloco-corpo");
    if (b.tipo === "texto") {
      corpo.append(campo("Título do bloco", "input", b.titulo, 60, (v) => { b.titulo = v; alterou(); }));
      corpo.append(campo("Texto", "textarea", b.texto, 1200, (v) => { b.texto = v; alterou(); }, { linhas: 5 }));
    } else if (b.tipo === "citacao") {
      corpo.append(campo("Frase", "textarea", b.texto, 200, (v) => { b.texto = v; alterou(); }, { linhas: 2 }));
      corpo.append(campo("Autor", "input", b.autor, 40, (v) => { b.autor = v; alterou(); }));
    } else if (b.tipo === "links") {
      b.itens = b.itens || [];
      const lista = el("div", "links-lista");
      const desenhar = () => {
        lista.replaceChildren();
        b.itens.forEach((it, j) => {
          const linha = el("div", "link-linha");
          linha.append(campo("Nome", "input", it.rotulo, 40, (v) => { it.rotulo = v; alterou(); }));
          linha.append(campo("Endereço (https)", "input", it.url, 300, (v) => { it.url = v; alterou(); }));
          const g = el("div", "campo");
          const idI = `i${Math.random().toString(36).slice(2, 8)}`;
          const l = el("label", "", "Ícone");
          l.htmlFor = idI;
          const s = el("select");
          s.id = idI;
          for (const k of galeria.icones) {
            const o = el("option", "", ROTULOS_ICONE[k] || k);
            o.value = k;
            s.append(o);
          }
          s.value = it.icone || "outro";
          s.addEventListener("change", () => { it.icone = s.value; alterou(); });
          g.append(l, s);
          linha.append(g);
          const r = el("button", "mini perigo", "Tirar link");
          r.type = "button";
          r.addEventListener("click", () => { b.itens.splice(j, 1); desenhar(); alterou(); });
          linha.append(r);
          lista.append(linha);
        });
      };
      desenhar();
      const add = el("button", "botao botao-fio botao-pequeno", "Adicionar link");
      add.type = "button";
      add.addEventListener("click", () => {
        const total = pg.blocos.reduce((n, x) => n + (x.tipo === "links" ? (x.itens || []).length : 0), 0);
        if (total >= galeria.limites.links) return dica("f-blocos-msg", `No máximo ${galeria.limites.links} links na página toda.`, true);
        b.itens.push({ rotulo: "", url: "https://", icone: "outro" });
        desenhar();
        alterou();
      });
      corpo.append(lista, add);
    } else if (b.tipo === "galeria") {
      b.itens = b.itens || [];
      const g = el("div", "galeria-opcoes");
      for (const f of galeria.fundos) {
        const l = el("label", "opcao");
        const c = el("input");
        c.type = "checkbox";
        c.checked = b.itens.includes(f.id);
        c.addEventListener("change", () => {
          b.itens = c.checked ? [...b.itens, f.id] : b.itens.filter((x) => x !== f.id);
          alterou();
        });
        l.append(c, el("span", "", f.rotulo));
        g.append(l);
      }
      corpo.append(g);
    } else if (b.tipo === "cartao_discord") {
      corpo.append(el("p", "dica", "Mostra o ícone, o nome, a descrição e o botão de entrar do seu servidor, com os dados da parceria aprovada."));
    } else if (b.tipo === "cartao_minecraft") {
      corpo.append(el("p", "dica", "Mostra seu nick, nível e tempo de jogo. Só aparece se o Minecraft está ligado à sua conta e o seu perfil público está ligado."));
    } else {
      corpo.append(el("p", "dica", "Uma linha tracejada para separar as partes."));
    }
    li.append(corpo);
    return li;
  }

  function desenharBlocos() {
    const lista = $("f-blocos");
    lista.replaceChildren();
    pg.blocos.forEach((b, i) => lista.append(blocoForm(b, i)));
    if (!pg.blocos.length) lista.append(el("li", "dica", "Nenhum bloco ainda. Adicione o primeiro abaixo."));
  }

  function preencherNovo() {
    const sel = $("f-novo");
    sel.replaceChildren();
    for (const [k, v] of Object.entries(TIPOS_BLOCO)) {
      if (k === "cartao_discord" && tipo !== "parceiro") continue;
      if (k === "cartao_minecraft" && tipo !== "kitsune") continue;
      const o = el("option", "", v);
      o.value = k;
      sel.append(o);
    }
  }

  function novoBloco(t) {
    return { texto: { tipo: t, titulo: "", texto: "" }, citacao: { tipo: t, texto: "", autor: "" }, links: { tipo: t, itens: [{ rotulo: "", url: "https://", icone: "outro" }] }, galeria: { tipo: t, itens: [] } }[t] || { tipo: t };
  }

  // ------------------------------------------------------------------ publicar
  function atualizarPublicar() {
    const st = estado.status;
    const bt = $("e-publicar");
    let txt = "Rascunho: ainda não está no ar.";
    bt.disabled = !estado.pode;
    bt.textContent = "Publicar";
    if (st === "publicada") {
      txt = "No ar. Alterações só aparecem quando você publicar de novo.";
      bt.textContent = "Publicar alterações";
    } else if (st === "pendente") {
      txt = "Aguardando a aprovação da equipe.";
      bt.disabled = true;
    } else if (st === "derrubada") {
      txt = "A equipe tirou esta página do ar. Fale com a equipe no Discord.";
      bt.disabled = true;
    } else if (tipo === "parceiro") bt.textContent = "Enviar para aprovação";
    $("e-estado-pub").textContent = txt;
    const ver = $("e-ver");
    ver.hidden = !(st === "publicada" && estado.slug);
    if (!ver.hidden) ver.href = `../../p/?u=${encodeURIComponent(estado.slug)}`;
  }

  async function publicar() {
    clearTimeout(tempoSalvar);
    await salvar();
    $("e-publicar").disabled = true;
    const corpo = { tipo, ...(tipo === "parceiro" ? { guild_id: guildId } : {}) };
    const { r, d } = await E.chamar("POST", "/painel/api/pagina/publicar", corpo);
    if (r.ok) {
      estado.status = d.status;
      estado.publicada = d.publicada;
      $("e-salvo").textContent = d.status === "publicada" ? "Publicada." : "Enviada para a equipe.";
    } else {
      $("e-salvo").textContent = d.mensagem || "Não consegui publicar agora.";
    }
    atualizarPublicar();
  }

  // ------------------------------------------------------------------ carregar
  function aplicar(d) {
    estado = { slug: d.slug || "", status: d.status, pagina: d.pagina, pode: !!d.pode_editar, publicada: !!d.publicada, bloqueio: d.motivo_bloqueio || "" };
    const base = d.pagina || {};
    pg = { tema: base.tema || "madeira", fonte: base.fonte || "alegreya", cor: base.cor || "#e5731c", fundo: base.fundo || null, titulo: base.titulo || "", bio: base.bio || "", blocos: JSON.parse(JSON.stringify(base.blocos || [])) };
    if (recursos && recursos.v2_padrao) pg.v2 = JSON.parse(JSON.stringify(base.v2 || recursos.v2_padrao));
    $("f-slug").value = d.slug || d.slug_sugerido || "";
    $("e-tipo").textContent = tipo === "parceiro" ? "Página do parceiro" : "Página de Kitsune";
    $("e-bloqueio").hidden = !(d.motivo_bloqueio);
    $("e-bloqueio").textContent = d.motivo_bloqueio || "";
    if (d.status === "rascunho" && d.motivo) {
      $("e-bloqueio").hidden = false;
      $("e-bloqueio").textContent = `A equipe pediu ajustes: ${d.motivo}`;
    }
    preencherAparencia();
    preencherNovo();
    desenharBlocos();
    for (const campoForm of $("e-form").querySelectorAll("input, select, textarea, button")) campoForm.disabled = !estado.pode;
    atualizarPublicar();
    mostrar("e-editor");
    if ((typeof EDITOR2 !== "undefined") && recursos) EDITOR2.iniciar(host(d));
    previa();
    if (!d.slug) $("e-salvo").textContent = "Página nova: preencha e ela salva sozinha.";
  }

  async function abrir() {
    const q = new URLSearchParams({ tipo, ...(tipo === "parceiro" ? { guild_id: guildId } : {}) });
    const [gal, minha, rec] = await Promise.all([E.chamar("GET", "/painel/api/pagina/galeria"), E.chamar("GET", `/painel/api/pagina/minha?${q}`), E.chamar("GET", "/painel/api/pagina/recursos")]);
    if (gal.r.status === 401 || minha.r.status === 401) return mostrar("e-entrar");
    recursos = rec.r.ok ? rec.d : null;
    if (!gal.r.ok || !minha.r.ok) {
      mostrar("e-carregando");
      $("e-carregando").querySelector("p").textContent = (minha.d && minha.d.mensagem) || "Não consegui abrir o editor agora. Tente de novo em instantes.";
      return;
    }
    galeria = gal.d;
    galeriaMapa = Object.fromEntries(galeria.fundos.map((f) => [f.id, f.url]));
    aplicar(minha.d);
  }

  // ------------------------------------------------------------------ escolher qual página (quando a URL não diz)
  async function escolher() {
    const lista = $("e-escolhas");
    lista.replaceChildren();
    const itens = [];
    const k = await E.chamar("GET", "/painel/api/pagina/minha?tipo=kitsune");
    if (k.r.status === 401) return mostrar("e-entrar");
    if (k.r.ok && k.d.pode_editar) itens.push({ rotulo: "Minha página de Kitsune", href: "?tipo=kitsune" });
    const p = await E.chamar("GET", "/painel/api/parceiros/portal");
    if (p.r.ok) {
      for (const s of p.d.servidores || []) {
        if (s.parceria && (s.parceria.status === "ativa" || s.parceria.status === "pausada")) itens.push({ rotulo: `Página do parceiro: ${s.nome}`, href: `?tipo=parceiro&guild_id=${encodeURIComponent(s.guild_id)}` });
      }
    }
    for (const it of itens) {
      const li = el("li");
      const a = el("a", "link-seta", it.rotulo);
      a.href = it.href;
      li.append(a);
      lista.append(li);
    }
    $("e-escolher-vazio").hidden = itens.length > 0;
    mostrar("e-escolher");
  }

  // ponte com o editor v2 (js/editor2.js): ele mexe em pg.v2 e avisa por alterou()
  function host(d) {
    return {
      E, $, el, dica, tipo, guildId, recursos, galeriaMapa,
      pg: () => pg,
      trocarPg: (novo) => { for (const k of Object.keys(pg)) delete pg[k]; Object.assign(pg, novo); preencherAparencia(); desenharBlocos(); $("f-slug").value = $("f-slug").value; },
      alterou, previa: () => previa(),
      slug: () => estado.slug,
      publicada: () => estado.status === "publicada",
      pode: () => estado.pode,
      salvarAgora: async () => { clearTimeout(tempoSalvar); await salvar(); },
      definirModeloPrevia: (p) => { modeloPrevia = p; previa(); },
      status: () => estado.status,
      pagina: d && d.pagina,
      publico: !!(d && d.publico),
    };
  }

  // ------------------------------------------------------------------ ligações
  $("e-entrar-bt").addEventListener("click", () => E.entrar("pagina/editar"));
  $("f-slug").addEventListener("input", () => { alterou(); checarSlug(); });
  $("f-cor").addEventListener("input", () => { pg.cor = $("f-cor").value; if (typeof EDITOR2 !== "undefined") EDITOR2.aplicarTema(pg); alterou(); });
  $("f-fundo").addEventListener("change", () => { pg.fundo = $("f-fundo").value || null; if (typeof EDITOR2 !== "undefined") EDITOR2.aplicarTema(pg); alterou(); });
  $("f-titulo").addEventListener("input", () => { pg.titulo = $("f-titulo").value; contadores(); alterou(); });
  $("f-bio").addEventListener("input", () => { pg.bio = $("f-bio").value; contadores(); alterou(); });
  $("f-novo-bt").addEventListener("click", () => {
    if (pg.blocos.length >= galeria.limites.blocos) return dica("f-blocos-msg", `No máximo ${galeria.limites.blocos} blocos.`, true);
    dica("f-blocos-msg", "");
    pg.blocos.push(novoBloco($("f-novo").value));
    desenharBlocos();
    alterou();
  });
  $("e-publicar").addEventListener("click", publicar);
  $("e-form").addEventListener("submit", (e) => e.preventDefault());

  (async function iniciar() {
    const volta = E.receberLogin("../../");
    if (volta === "indo") return;
    if (volta === "erro") {
      mostrar("e-entrar");
      $("e-aviso").hidden = false;
      $("e-aviso").textContent = "O login expirou ou foi interrompido. Tente de novo.";
      return;
    }
    if (!E.tem()) return mostrar("e-entrar");
    if (tipo !== "parceiro" && tipo !== "kitsune") return escolher();
    if (tipo === "parceiro" && !/^\d{5,22}$/.test(guildId)) return escolher();
    abrir();
  })();
})();
