// Editor visual de embeds do Discord, com prévia em tempo real parecida com a do Discord. Os limites são os do Discord (o servidor confere de novo).
// A prévia monta DOM (nunca HTML): o texto do embed entra sempre por textContent, e só links https viram link.
"use strict";

const PEMBED = (() => {
  const { el } = VULPUS;
  const LIM = { titulo: 256, descricao: 4096, campo_nome: 256, campo_valor: 1024, rodape: 2048, autor: 256, campos: 25, total: 6000 };
  const VARIAVEIS = [["{@user}", "Menção de quem entrou"], ["{user.name}", "Nome de quem entrou"], ["{guild.name}", "Nome do servidor"], ["{guild.size}", "Total de membros"]];

  const vazioEmbed = () => ({
    titulo: "", titulo_url: "", descricao: "", cor: "#e5731c", autor: { nome: "", url: "", icone: "" }, imagem: "", thumbnail: "",
    campos: [], rodape: { texto: "", icone: "" }, timestamp: false,
  });
  const mesclar = (d) => ({ ...vazioEmbed(), ...(d || {}), autor: { ...vazioEmbed().autor, ...((d || {}).autor || {}) }, rodape: { ...vazioEmbed().rodape, ...((d || {}).rodape || {}) }, campos: [...((d || {}).campos || [])] });

  // ------------------------------------------------------------------ markdown do Discord (subconjunto) -> DOM
  const RE_LINK = /^https:\/\/[^\s<>"']{4,500}$/;
  function inline(texto, amostra, pai) {
    const re = /(`[^`\n]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[[^\]\n]+\]\(https:\/\/[^)\s]+\))|(\{[@\w.]+\})/g;
    let ult = 0;
    let m;
    while ((m = re.exec(texto))) {
      if (m.index > ult) pai.append(document.createTextNode(texto.slice(ult, m.index)));
      const s = m[0];
      let n;
      if (m[1]) { n = el("span", "pk-md-cod"); n.textContent = s.slice(1, -1); }
      else if (m[2]) { n = el("strong"); inline(s.slice(2, -2), amostra, n); }
      else if (m[3]) { n = el("u"); inline(s.slice(2, -2), amostra, n); }
      else if (m[4]) { n = el("s"); inline(s.slice(2, -2), amostra, n); }
      else if (m[5] || m[6]) { n = el("em"); inline(s.slice(1, -1), amostra, n); }
      else if (m[7]) {
        const mm = s.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
        if (mm && RE_LINK.test(mm[2])) { n = el("a", "pk-md-link", mm[1]); n.href = mm[2]; n.target = "_blank"; n.rel = "noopener noreferrer"; }
        else n = document.createTextNode(s);
      } else if (amostra[s] !== undefined) { n = el("span", "pk-md-var", amostra[s] || s); } else { n = document.createTextNode(s); }
      pai.append(n);
      ult = m.index + s.length;
    }
    if (ult < texto.length) pai.append(document.createTextNode(texto.slice(ult)));
  }
  function md(texto, amostra) {
    const f = document.createDocumentFragment();
    const partes = String(texto || "").split(/```/);
    partes.forEach((p, i) => {
      if (i % 2 === 1) { const b = el("span", "pk-md-bloco"); b.textContent = p.replace(/^\w*\n/, "").replace(/\n$/, ""); f.append(b); }
      else inline(p, amostra, f);
    });
    return f;
  }

  // ------------------------------------------------------------------ prévia
  function previa(e, ctx) {
    const amostra = ctx.amostra || { "{user}": "NovaPessoa", "{@user}": "@NovaPessoa", "{username}": "NovaPessoa", "{server}": ctx.servidor || "Seu servidor", "{count}": "128" };
    // links: um https de verdade, ou {user.avatar} / {guild.icon} trocados pelo valor real
    const url = (u) => (RE_LINK.test(u || "") ? u : (amostra[u] && RE_LINK.test(amostra[u]) ? amostra[u] : ""));
    const raiz = el("div", "pk-previa-moldura");
    raiz.append(el("div", "pk-previa-cab", "Prévia no Discord"));
    const msg = el("div", "pk-msg");
    msg.append(el("div", "pk-msg-avatar", "K"));
    const corpo = el("div", "pk-msg-corpo");
    const nome = el("div", "pk-msg-nome", "Kiza");
    nome.append(el("em", "", "APP"), el("small", "", "hoje"));
    corpo.append(nome);
    if (ctx.conteudo) { const t = el("div", "pk-msg-texto"); t.append(md(ctx.conteudo, amostra)); corpo.append(t); }
    const tem = e.titulo || e.descricao || e.campos.length || e.imagem || e.thumbnail || e.autor.nome || e.rodape.texto;
    if (tem) {
      const box = el("div", `pk-dc-embed${e.thumbnail ? " com-thumb" : ""}`);
      box.style.setProperty("border-left-color", /^#[0-9a-fA-F]{6}$/.test(e.cor) ? e.cor : "#e5731c");
      if (e.autor.nome) {
        const a = el("div", "pk-dc-autor");
        if (url(e.autor.icone)) { const i = el("img"); i.src = url(e.autor.icone); i.alt = ""; i.referrerPolicy = "no-referrer"; a.append(i); }
        const sp = el("span"); sp.append(md(e.autor.nome, amostra)); a.append(sp);
        box.append(a);
      }
      if (e.titulo) {
        const t = el("div", "pk-dc-titulo");
        if (url(e.titulo_url)) { const a = el("a"); a.href = url(e.titulo_url); a.target = "_blank"; a.rel = "noopener noreferrer"; a.append(md(e.titulo, amostra)); t.append(a); }
        else t.append(md(e.titulo, amostra));
        box.append(t);
      }
      if (e.descricao) { const d = el("div", "pk-dc-desc"); d.append(md(e.descricao, amostra)); box.append(d); }
      if (e.campos.length) {
        const g = el("div", "pk-dc-campos");
        for (const c of e.campos) {
          const x = el("div", `pk-dc-campo${c.lado_a_lado ? " lado" : ""}`);
          const n = el("b"); n.append(md(c.nome, amostra));
          const v = el("span"); v.append(md(c.valor, amostra));
          x.append(n, v);
          g.append(x);
        }
        box.append(g);
      }
      if (url(e.thumbnail)) { const i = el("img", "pk-dc-thumb"); i.src = url(e.thumbnail); i.alt = ""; i.referrerPolicy = "no-referrer"; box.append(i); }
      if (url(e.imagem)) { const i = el("img", "pk-dc-img"); i.src = url(e.imagem); i.alt = ""; i.referrerPolicy = "no-referrer"; box.append(i); }
      if (e.rodape.texto || e.timestamp) {
        const r = el("div", "pk-dc-rodape");
        if (e.rodape.icone && e.rodape.texto && url(e.rodape.icone)) { const i = el("img"); i.src = url(e.rodape.icone); i.alt = ""; i.referrerPolicy = "no-referrer"; r.append(i); }
        const sp = el("span");
        if (e.rodape.texto) sp.append(md(e.rodape.texto, amostra));
        if (e.rodape.texto && e.timestamp) sp.append(document.createTextNode(" • "));
        if (e.timestamp) sp.append(document.createTextNode(new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })));
        r.append(sp);
        box.append(r);
      }
      corpo.append(box);
    } else if (!ctx.conteudo) {
      corpo.append(el("div", "pk-msg-texto", "O embed está vazio. Preencha um título ou uma descrição para ver a prévia."));
    }
    msg.append(corpo);
    raiz.append(msg);
    return raiz;
  }

  const somaTextos = (e) => e.titulo.length + e.descricao.length + e.autor.nome.length + e.rodape.texto.length + e.campos.reduce((n, c) => n + c.nome.length + c.valor.length, 0);

  // ------------------------------------------------------------------ editor
  /**
   * ctx: { gid, servidor, chamar(metodo, caminho, corpo), carregarCanais(), aoSalvar(id), embedInicial: {id, nome, dados, conteudo} }
   * Devolve { raiz }.
   */
  function editor(ctx) {
    const estado = { id: ctx.embedInicial?.id || 0, nome: ctx.embedInicial?.nome || "", dados: mesclar(ctx.embedInicial?.dados), conteudo: ctx.embedInicial?.conteudo || "", canal: "" };
    const raiz = el("div", "pk-embeds");
    const form = el("div", "pk-embed-form");
    const colPrevia = el("div", "pk-previa-caixa");
    const alvoPrevia = el("div");
    const resumo = el("p", "pk-dica");
    const erros = el("div");
    colPrevia.append(alvoPrevia, resumo, erros);
    const campos = {}; // referência por chave, para mostrar erros do servidor

    let sujo = false;
    const marcar = () => { sujo = true; desenhar(); };
    const desenhar = () => {
      alvoPrevia.replaceChildren(previa(estado.dados, { servidor: ctx.servidor, conteudo: estado.conteudo, amostra: ctx.amostra }));
      const t = somaTextos(estado.dados);
      resumo.textContent = `Soma dos textos: ${t}/${LIM.total} · campos: ${estado.dados.campos.length}/${LIM.campos}`;
      resumo.style.setProperty("color", t > LIM.total ? "#e46257" : "");
    };

    const bloco = (titulo, ...filhos) => { const b = el("div", "pk-bloco"); b.append(el("h4", "", titulo), ...filhos); form.append(b); return b; };
    const reg = (chave, c) => { campos[chave] = c; return c; };

    // identificação
    const nome = reg("nome", PUI.campo({ rotulo: "Nome do embed (só você vê)", valor: estado.nome, max: 60, placeholder: "Ex.: Regras do servidor", aoMudar: (v) => { estado.nome = v; sujo = true; } }));
    const conteudo = reg("conteudo", PUI.campo({ rotulo: "Texto acima do embed (opcional)", valor: estado.conteudo, max: 1800, area: true, aoMudar: (v) => { estado.conteudo = v; marcar(); } }));
    bloco("Identificação", nome.raiz, conteudo.raiz);

    // conteúdo principal
    const titulo = reg("titulo", PUI.campo({ rotulo: "Título", valor: estado.dados.titulo, max: LIM.titulo, aoMudar: (v) => { estado.dados.titulo = v; marcar(); } }));
    const tituloUrl = reg("titulo_url", PUI.campo({ rotulo: "Link do título (https)", valor: estado.dados.titulo_url, placeholder: "https://…", tip: "O título vira um link clicável. Só links https.", aoMudar: (v) => { estado.dados.titulo_url = v; marcar(); } }));
    const desc = reg("descricao", PUI.campo({ rotulo: "Descrição", valor: estado.dados.descricao, max: LIM.descricao, area: true, tip: "Aceita **negrito**, *itálico*, __sublinhado__, ~~riscado~~, `código` e [texto](https://link).", aoMudar: (v) => { estado.dados.descricao = v; marcar(); } }));
    const vars = el("div", "pk-variaveis");
    for (const [v, d] of (ctx.variaveis || VARIAVEIS)) {
      const b = el("button", "pk-chip", v);
      b.type = "button";
      b.setAttribute("data-dica", `${d}. Variáveis de pessoa só têm valor nas boas-vindas e saídas; ao publicar à mão viram "membro".`);
      b.addEventListener("click", () => {
        const a = desc.entrada;
        const i = a.selectionStart ?? a.value.length;
        a.value = a.value.slice(0, i) + v + a.value.slice(a.selectionEnd ?? i);
        a.dispatchEvent(new Event("input"));
        a.focus();
      });
      vars.append(b);
    }
    const cor = el("input", "pk-input");
    cor.type = "color";
    cor.value = estado.dados.cor;
    const corTxt = el("input", "pk-input");
    corTxt.value = estado.dados.cor;
    corTxt.maxLength = 7;
    cor.addEventListener("input", () => { estado.dados.cor = cor.value; corTxt.value = cor.value; marcar(); });
    corTxt.addEventListener("input", () => { if (/^#[0-9a-fA-F]{6}$/.test(corTxt.value)) { estado.dados.cor = corTxt.value; cor.value = corTxt.value; marcar(); } });
    const campoCor = el("div", "pk-campo");
    const lc = el("label", "", "Cor da barra");
    campoCor.append(lc, cor, corTxt);
    bloco("Conteúdo", titulo.raiz, tituloUrl.raiz, desc.raiz, vars, campoCor);

    // autor
    const aNome = reg("autor.nome", PUI.campo({ rotulo: "Nome do autor", valor: estado.dados.autor.nome, max: LIM.autor, aoMudar: (v) => { estado.dados.autor.nome = v; marcar(); } }));
    const aUrl = reg("autor.url", PUI.campo({ rotulo: "Link do autor (https)", valor: estado.dados.autor.url, placeholder: "https://…", aoMudar: (v) => { estado.dados.autor.url = v; marcar(); } }));
    const aIcone = reg("autor.icone", PUI.campo({ rotulo: "Ícone do autor (imagem https)", valor: estado.dados.autor.icone, placeholder: "https://…", aoMudar: (v) => { estado.dados.autor.icone = v; marcar(); } }));
    const linhaA = el("div", "pk-linha");
    linhaA.append(aUrl.raiz, aIcone.raiz);
    bloco("Autor", aNome.raiz, linhaA);

    // imagens
    const thumb = reg("thumbnail", PUI.campo({ rotulo: "Miniatura (imagem https)", valor: estado.dados.thumbnail, placeholder: "https://…", dica: "Imagem pequena no canto do embed.", aoMudar: (v) => { estado.dados.thumbnail = v; marcar(); } }));
    const img = reg("imagem", PUI.campo({ rotulo: "Imagem grande (https)", valor: estado.dados.imagem, placeholder: "https://…", dica: "Aparece embaixo do texto.", aoMudar: (v) => { estado.dados.imagem = v; marcar(); } }));
    const linhaI = el("div", "pk-linha");
    linhaI.append(thumb.raiz, img.raiz);
    bloco("Imagens", linhaI);

    // campos (fields)
    const lista = el("div", "pk-campos-lista");
    const desenharCampos = () => {
      lista.replaceChildren();
      estado.dados.campos.forEach((c, i) => {
        const caixa = el("div", "pk-campo-embed");
        const topo = el("div", "pk-campo-embed-topo");
        topo.append(el("b", "", `Campo ${i + 1}`));
        const acoes = el("div", "pk-acoes");
        const mov = (d) => { const j = i + d; if (j < 0 || j >= estado.dados.campos.length) return; [estado.dados.campos[i], estado.dados.campos[j]] = [estado.dados.campos[j], estado.dados.campos[i]]; desenharCampos(); marcar(); };
        const bSobe = el("button", "pk-btn pk-btn-pequeno", "↑"); bSobe.type = "button"; bSobe.setAttribute("aria-label", "Subir"); bSobe.addEventListener("click", () => mov(-1));
        const bDesce = el("button", "pk-btn pk-btn-pequeno", "↓"); bDesce.type = "button"; bDesce.setAttribute("aria-label", "Descer"); bDesce.addEventListener("click", () => mov(1));
        const bTira = el("button", "pk-btn pk-btn-pequeno pk-btn-perigo", "Remover"); bTira.type = "button";
        bTira.addEventListener("click", () => { estado.dados.campos.splice(i, 1); desenharCampos(); marcar(); });
        acoes.append(bSobe, bDesce, bTira);
        topo.append(acoes);
        const n = reg(`campos.${i}.nome`, PUI.campo({ rotulo: "Nome", valor: c.nome, max: LIM.campo_nome, aoMudar: (v) => { c.nome = v; marcar(); } }));
        const v = reg(`campos.${i}.valor`, PUI.campo({ rotulo: "Valor", valor: c.valor, max: LIM.campo_valor, area: true, aoMudar: (x) => { c.valor = x; marcar(); } }));
        const lado = el("label", "pk-campo");
        const linha = el("div", "pk-acoes");
        const sw = PUI.interruptor({ marcado: !!c.lado_a_lado, rotulo: "Lado a lado", aoMudar: (x) => { c.lado_a_lado = x; marcar(); } });
        linha.append(sw, el("span", "pk-dica", "Mostrar lado a lado com os outros campos (até 3 por linha)"));
        lado.append(linha);
        caixa.append(topo, n.raiz, v.raiz, lado);
        lista.append(caixa);
      });
    };
    const add = el("button", "pk-btn", "+ Adicionar campo");
    add.type = "button";
    add.addEventListener("click", () => {
      if (estado.dados.campos.length >= LIM.campos) return PUI.toast(`O Discord aceita no máximo ${LIM.campos} campos.`, "erro");
      estado.dados.campos.push({ nome: "", valor: "", lado_a_lado: false });
      desenharCampos();
      marcar();
    });
    desenharCampos();
    bloco("Campos", lista, add);

    // rodapé
    const rTxt = reg("rodape.texto", PUI.campo({ rotulo: "Texto do rodapé", valor: estado.dados.rodape.texto, max: LIM.rodape, aoMudar: (v) => { estado.dados.rodape.texto = v; marcar(); } }));
    const rIcone = reg("rodape.icone", PUI.campo({ rotulo: "Ícone do rodapé (imagem https)", valor: estado.dados.rodape.icone, placeholder: "https://…", aoMudar: (v) => { estado.dados.rodape.icone = v; marcar(); } }));
    const ts = el("div", "pk-acoes");
    ts.append(PUI.interruptor({ marcado: estado.dados.timestamp, rotulo: "Mostrar data e hora", aoMudar: (x) => { estado.dados.timestamp = x; marcar(); } }), el("span", "pk-dica", "Mostra a data e a hora do envio no rodapé"));
    bloco("Rodapé", rTxt.raiz, rIcone.raiz, ts);

    // publicar
    const canal = PUI.seletor({
      rotulo: "Canal de destino", tip: "Só aparecem os canais que a Kiza enxerga. Os que ela não pode usar aparecem bloqueados com o motivo.", nenhum: "Escolha um canal",
      valor: "", carregar: async () => (await ctx.carregarCanais()).map((c) => ({ valor: c.id, rotulo: c.nome, hash: "#", sub: c.pode_enviar ? c.categoria : `sem permissão: ${c.faltas.join(", ")}`, grupo: c.categoria || "Sem categoria", desabilitado: !c.pode_enviar })),
      aoMudar: (v) => { estado.canal = v; },
    });
    const botoes = el("div", "pk-acoes");
    const salvar = PUI.comCarga(el("button", "pk-btn pk-btn-primario", "Salvar embed"), async () => { await salvarEmbed(); });
    salvar.type = "button";
    const publicar = PUI.comCarga(el("button", "pk-btn", "Publicar no canal"), async () => {
      if (!estado.canal) return PUI.toast("Escolha o canal de destino primeiro.", "erro");
      const ok = await PUI.confirmar({ titulo: "Publicar agora?", texto: "A Kiza vai mandar esta mensagem no canal escolhido. Dá para apagar depois no próprio Discord.", ok: "Publicar" });
      if (!ok) return;
      const corpo = { guild_id: ctx.gid, canal_id: estado.canal, conteudo: estado.conteudo, ...(estado.id && !sujo ? { embed_id: estado.id } : { dados: estado.dados }) };
      const { r, d } = await ctx.chamar("POST", "/painel/api/kiza/embeds/publicar", corpo);
      if (r.ok) PUI.toast("Publicado! O Discord já mostra a mensagem.", "ok");
      else { mostrarErros(d.erros); PUI.toast(d.mensagem || Object.values(d.erros || {}).join(" ") || "Não consegui publicar.", "erro"); }
    });
    publicar.type = "button";
    const apagar = PUI.comCarga(el("button", "pk-btn pk-btn-perigo", "Apagar embed salvo"), async () => {
      if (!estado.id) return;
      const ok = await PUI.confirmar({ titulo: "Apagar este embed?", texto: "Ele some da lista. Mensagens que você já publicou no Discord continuam lá. Funções que usavam este embed voltam a mandar só o texto.", ok: "Apagar", perigo: true });
      if (!ok) return;
      const { r } = await ctx.chamar("DELETE", `/painel/api/kiza/embeds/${estado.id}?guild_id=${encodeURIComponent(ctx.gid)}`);
      if (r.ok) { PUI.toast("Embed apagado.", "ok"); if (ctx.aoApagar) ctx.aoApagar(); } else PUI.toast("Não consegui apagar.", "erro");
    });
    apagar.type = "button";
    botoes.append(salvar, publicar);
    if (estado.id) botoes.append(apagar);
    bloco("Salvar e publicar", canal.raiz, botoes);

    function mostrarErros(e) {
      for (const [chave, c] of Object.entries(campos)) c.erro("");
      erros.replaceChildren();
      for (const [chave, msg] of Object.entries(e || {})) {
        if (campos[chave]) campos[chave].erro(msg);
        else erros.append(el("p", "pk-aviso erro", msg));
      }
    }
    async function salvarEmbed() {
      mostrarErros({});
      const { r, d } = await ctx.chamar("PUT", "/painel/api/kiza/embeds", { guild_id: ctx.gid, id: estado.id || undefined, nome: estado.nome, dados: estado.dados });
      if (!r.ok) { mostrarErros(d.erros); return PUI.toast(d.mensagem || "Corrija os campos em vermelho e salve de novo.", "erro"); }
      estado.id = d.id;
      sujo = false;
      PUI.toast("Embed salvo.", "ok");
      if (ctx.aoSalvar) ctx.aoSalvar(d.id);
    }

    raiz.append(form, colPrevia);
    desenhar();
    return { raiz, sujo: () => sujo };
  }

  /** Botões de variáveis que inserem a chave no campo de texto, na posição do cursor. */
  function chips(entrada, lista) {
    const caixa = el("div", "pk-variaveis");
    for (const [v, d] of lista || VARIAVEIS) {
      const b = el("button", "pk-chip", v);
      b.type = "button";
      b.setAttribute("data-dica", d);
      b.addEventListener("click", () => {
        const i = entrada.selectionStart ?? entrada.value.length;
        entrada.value = entrada.value.slice(0, i) + v + entrada.value.slice(entrada.selectionEnd ?? i);
        entrada.dispatchEvent(new Event("input"));
        entrada.focus();
      });
      caixa.append(b);
    }
    return caixa;
  }

  return { editor, previa, vazioEmbed, mesclar, md, chips };
})();
