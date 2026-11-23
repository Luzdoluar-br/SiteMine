// Portal do parceiro (/parceiros/portal/): login com Discord, escolha do servidor e um assistente em 5 etapas que SALVA SOZINHO.
// Depois de aprovada, o mesmo lugar vira o painel do parceiro. Tudo que vem da API entra por textContent/value (nunca HTML).
// As regras de verdade (permissão, requisitos, tamanhos, aprovação) são do servidor; aqui só se mostra e se coleta.
"use strict";

(() => {
  const { $, el } = VULPUS;
  const E = ENTRADA;
  const ETAPAS = ["Servidor", "Apresentação", "A Kiza", "Revisão", "Enviar"];
  const ROTULO_ST = { rascunho: "rascunho salvo", em_analise: "em análise", ativa: "parceria ativa", pausada: "pausada", recusada: "recusada", encerrada: "encerrada" };
  const CAMPO_ETAPA = { nome: 1, convite: 1, descricao: 2, texto: 2, sem_vetos: 3, equipe_ativa: 3, canal_id: 3 };
  const NOME_CAMPO = { nome: "o nome do servidor", convite: "o convite permanente", descricao: "o resumo", texto: "o texto de apresentação", sem_vetos: "a confirmação das regras", equipe_ativa: "a confirmação da equipe ativa", canal_id: "o canal onde a Kiza divulga" };
  let portal = null;
  let srv = null;
  let rasc = null;
  let etapa = 1;
  let check = null;
  let tSalvar = null;
  let tSonda = null;
  let salvando = false;
  let sujo = {};
  let editandoCartao = false;

  const mostrar = (qual) => {
    for (const id of ["p-carregando", "p-entrar", "p-lista", "p-servidor"]) $(id).hidden = id !== qual;
    window.scrollTo({ top: 0 });
  };
  const salvoMsg = (t) => { $("p-salvo").textContent = t || ""; };
  const hora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dataHora = (s) => new Date(s * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const urlImg = (u) => (u ? E.API + u : "");

  // ------------------------------------------------------------------ carregar o portal e a lista de servidores
  async function carregar() {
    clearInterval(tSonda);
    const { r, d } = await E.chamar("GET", "/painel/api/parceiros/portal");
    if (r.status === 401) return mostrar("p-entrar");
    if (!r.ok) {
      mostrar("p-carregando");
      $("p-carregando").querySelector("p").textContent = d.mensagem || "Não consegui abrir o portal agora. Tente de novo em instantes.";
      return;
    }
    portal = d;
    desenharLista();
    mostrar("p-lista");
    const direto = new URLSearchParams(location.search).get("guild_id");
    const alvo = direto && portal.servidores.find((s) => s.guild_id === direto);
    if (alvo) abrir(alvo);
  }

  function desenharLista() {
    $("p-ola").textContent = `Olá, ${portal.usuario.nome}`;
    const ul = $("p-servidores");
    ul.replaceChildren();
    $("p-vazio").hidden = portal.servidores.length > 0;
    $("p-lista-texto").hidden = portal.servidores.length === 0;
    for (const s of portal.servidores) {
      const li = el("li", "srv");
      if (s.icone && /^https:\/\/cdn\.discordapp\.com\//.test(s.icone)) {
        const i = el("img", "srv-icone");
        i.src = s.icone;
        i.alt = "";
        li.append(i);
      } else li.append(el("span", "srv-icone"));
      const meio = el("div");
      meio.append(el("h2", "", s.nome));
      const st = s.parceria ? s.parceria.status : "";
      const linha = el("p");
      if (st) linha.append(el("span", `etiqueta-st st-${st}`, ROTULO_ST[st] || st), document.createTextNode(" "));
      linha.append(document.createTextNode(s.kiza_presente ? "A Kiza já está neste servidor." : "A Kiza ainda não está neste servidor."));
      meio.append(linha);
      const bt = el("button", "botao botao-pequeno", !st || st === "recusada" || st === "encerrada" ? "Pedir parceria" : st === "rascunho" ? "Continuar o pedido" : "Abrir");
      bt.type = "button";
      bt.addEventListener("click", () => abrir(s));
      li.append(meio, bt);
      ul.append(li);
    }
  }

  // ------------------------------------------------------------------ abrir um servidor
  async function abrir(s) {
    srv = s;
    editandoCartao = false;
    $("p-srv-nome").textContent = s.nome;
    const st = s.parceria ? s.parceria.status : "";
    mostrar("p-servidor");
    $("p-conteudo").replaceChildren(el("p", "estado", "Carregando…"));
    if (["em_analise", "ativa", "pausada"].includes(st)) return painel();
    $("p-srv-sobre").textContent = "Pedido de parceria";
    const { r, d } = await E.chamar("GET", `/painel/api/parceiros/rascunho?guild_id=${encodeURIComponent(s.guild_id)}`);
    if (r.status === 401) return mostrar("p-entrar");
    if (!r.ok) return $("p-conteudo").replaceChildren(el("p", "aviso", d.mensagem || "Não consegui abrir o rascunho."));
    rasc = d || { nome: s.nome, convite: "", modalidade_pedida: "normal", descricao: "", texto: "", cor: "#e5731c", banner_id: null, logo_id: null, equipe_ativa: false, sem_vetos: false, contato: "", canal_id: null, etapa: 1, faltando: [], pronto_para_enviar: false };
    etapa = rasc.etapa || 1;
    sujo = {};
    if (!rasc.nome) {  // o nome já vem do servidor: grava de uma vez para o pedido não ficar "sem nome" no servidor
      rasc.nome = s.nome;
      sujo.nome = s.nome;
      tSalvar = setTimeout(salvar, 600);
    }
    desenharAssistente();
  }

  // ------------------------------------------------------------------ salvar sozinho
  function marcar(campo, valor) {
    rasc[campo] = valor;
    sujo[campo] = valor;
    salvoMsg("Alterações não salvas…");
    clearTimeout(tSalvar);
    tSalvar = setTimeout(salvar, 800);
  }

  async function salvar() {
    if (salvando) return setTimeout(salvar, 400);
    if (!Object.keys(sujo).length) return;
    const envio = { ...sujo };
    sujo = {};
    salvando = true;
    salvoMsg("Salvando…");
    const { r, d } = await E.chamar("PUT", `/painel/api/parceiros/rascunho?guild_id=${encodeURIComponent(srv.guild_id)}`, envio);
    salvando = false;
    if (r.status === 401) return mostrar("p-entrar");
    if (r.status === 409) {
      salvoMsg(d.mensagem || "O pedido já foi enviado.");
      return carregar();
    }
    if (r.ok || r.status === 400) {
      rasc.faltando = d.faltando || rasc.faltando;
      rasc.pronto_para_enviar = d.pronto_para_enviar;
      for (const [campo, msg] of Object.entries(d.erros || {})) {
        const e = $(`erro-${campo}`);
        if (e) e.textContent = msg;
      }
      if (r.ok) {
        for (const e of document.querySelectorAll(".erro-campo")) e.textContent = "";
        salvoMsg(`Salvo às ${hora()}`);
      } else salvoMsg("Não salvei tudo: corrija o que está marcado.");
    } else {
      sujo = { ...envio, ...sujo };
      salvoMsg(d.mensagem || "Não consegui salvar agora. Vou tentar de novo na próxima alteração.");
    }
  }

  async function ir(n) {
    clearTimeout(tSalvar);
    clearInterval(tSonda);
    await salvar();
    etapa = n;
    if (n === 5) await atualizarFaltando(); // a etapa 5 é desenhada de uma vez: o que falta precisa estar atualizado antes
    sujo.etapa = n;
    E.chamar("PUT", `/painel/api/parceiros/rascunho?guild_id=${encodeURIComponent(srv.guild_id)}`, { etapa: n });
    sujo = {};
    desenharAssistente();
  }

  // ------------------------------------------------------------------ peças de formulário
  function campo(rotulo, id, tipo, valor, max, aoMudar, dicaTxt) {
    const g = el("div");
    const l = el("label", "", rotulo);
    l.htmlFor = id;
    const i = tipo === "textarea" ? el("textarea") : el("input");
    if (tipo !== "textarea") i.type = tipo;
    i.id = id;
    i.value = valor || "";
    if (max) i.maxLength = max;
    if (tipo === "textarea") i.rows = id === "f-texto" ? 9 : 3;
    const cont = el("span", "contador", "");
    const atualizaCont = () => { cont.textContent = max ? `${i.value.length}/${max}` : ""; };
    atualizaCont();
    l.append(cont);
    i.addEventListener("input", () => { atualizaCont(); aoMudar(i.value); });
    g.append(l, i);
    if (dicaTxt) g.append(el("p", "dica", dicaTxt));
    g.append(Object.assign(el("p", "erro-campo"), { id: `erro-${id.replace(/^f-/, "")}` }));
    return g;
  }

  function escolha(tipo, nome, valor, marcado, titulo, texto, aoMudar) {
    const l = el("label", "escolha");
    const i = el("input");
    i.type = tipo;
    i.name = nome;
    i.value = valor;
    i.checked = marcado;
    i.addEventListener("change", () => aoMudar(i));
    const t = el("span");
    t.append(el("b", "", titulo));
    if (texto) t.append(document.createTextNode(texto));
    l.append(i, t);
    return l;
  }

  function imagemCampo(tipo, rotulo, dica) {
    const g = el("div");
    g.append(el("span", "rotulo", rotulo));
    const linha = el("div", "imagem-linha");
    const idCampo = tipo === "banner" ? "banner_id" : "logo_id";
    const previa = el("img", `imagem-previa ${tipo === "logo" ? "logo" : ""}`);
    previa.alt = "";
    const arq = el("input");
    arq.type = "file";
    arq.accept = "image/png,image/jpeg,image/webp";
    arq.id = `f-arq-${tipo}`;
    const lab = el("label", "botao botao-fio botao-pequeno", rasc[idCampo] ? "Trocar imagem" : "Escolher imagem");
    lab.htmlFor = arq.id;
    lab.style.margin = "0";
    arq.style.position = "absolute";
    arq.style.opacity = "0";
    arq.style.width = "1px";
    const rem = el("button", "botao botao-fio botao-pequeno", "Tirar");
    rem.type = "button";
    const mostrarPrevia = () => {
      const url = rasc[`${idCampo}_url`] || (rasc[idCampo] ? `/painel/api/parceiros/imagem/${rasc[idCampo]}` : "");
      previa.hidden = !url;
      rem.hidden = !url;
      if (url) previa.src = urlImg(url);
      lab.firstChild.textContent = url ? "Trocar imagem" : "Escolher imagem";
    };
    arq.addEventListener("change", async () => {
      const f = arq.files[0];
      if (!f) return;
      const erro = $(`erro-${idCampo}`);
      erro.textContent = "";
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return (erro.textContent = "Use PNG, JPG ou WebP.");
      if (f.size > 3 * 1024 * 1024) return (erro.textContent = "A imagem passa de 3 MB. Reduza e tente de novo.");
      salvoMsg("Enviando a imagem…");
      const fd = new FormData();
      fd.append("arquivo", f);
      const { r, d } = await E.chamar("POST", `/painel/api/parceiros/imagem?guild_id=${encodeURIComponent(srv.guild_id)}&tipo=${tipo}`, fd);
      if (!r.ok) {
        salvoMsg("");
        return (erro.textContent = d.mensagem || "Não consegui enviar a imagem.");
      }
      rasc[`${idCampo}_url`] = d.url;
      marcar(idCampo, d.imagem_id);
      mostrarPrevia();
    });
    rem.addEventListener("click", () => {
      rasc[`${idCampo}_url`] = "";
      marcar(idCampo, null);
      mostrarPrevia();
    });
    linha.append(previa, lab, arq, rem);
    g.append(linha);
    if (dica) g.append(el("p", "dica", dica));
    g.append(Object.assign(el("p", "erro-campo"), { id: `erro-${idCampo}` }));
    mostrarPrevia();
    return g;
  }

  // ------------------------------------------------------------------ assistente
  function desenharAssistente() {
    const raiz = $("p-conteudo");
    raiz.replaceChildren();
    const ol = el("ol", "passos");
    ETAPAS.forEach((nome, i) => {
      const li = el("li");
      const bt = el("button", "passo-bt" + (i + 1 < etapa ? " feito" : ""));
      bt.type = "button";
      bt.append(el("b", "", `ETAPA ${i + 1}`), document.createTextNode(nome));
      if (i + 1 === etapa) bt.setAttribute("aria-current", "step");
      bt.addEventListener("click", () => ir(i + 1));
      li.append(bt);
      ol.append(li);
    });
    raiz.append(ol);
    const corpo = el("div", "etapa");
    [null, etapa1, etapa2, etapa3, etapa4, etapa5][etapa](corpo);
    const nav = el("div", "nav-etapas");
    const voltar = el("button", "botao botao-fio", etapa === 1 ? "Meus servidores" : "Voltar");
    voltar.type = "button";
    voltar.addEventListener("click", () => (etapa === 1 ? (clearInterval(tSonda), salvar().then(carregar)) : ir(etapa - 1)));
    nav.append(voltar);
    if (etapa < 5) {
      const seguir = el("button", "botao", "Continuar");
      seguir.type = "button";
      seguir.addEventListener("click", () => ir(etapa + 1));
      nav.append(seguir);
    }
    corpo.append(nav);
    raiz.append(corpo);
    $("p-srv-sobre").textContent = `Pedido de parceria · etapa ${etapa} de 5`;
  }

  function etapa1(c) {
    c.append(el("h2", "", "Seu servidor e o tipo de parceria"));
    c.append(el("p", "", "Escolha o tipo. Dá para mudar depois, e a equipe sempre lê o pedido antes de decidir."));
    const req = portal.requisitos;
    c.append(escolha("radio", "mod", "normal", rasc.modalidade_pedida === "normal", "Parceria", ` Registro e mensagem oficial para divulgar. A Kiza só fica no seu servidor se você quiser. Pede ${req.normal.membros}+ membros e ${req.normal.dias}+ dias de servidor.`, () => marcar("modalidade_pedida", "normal")));
    c.append(escolha("radio", "mod", "mega", rasc.modalidade_pedida === "mega", "Mega Parceria", ` A Kiza divulga os dois servidores de vez em quando, e a sua página entra no site. Pede ${req.mega.membros}+ membros, ${req.mega.dias}+ dias e equipe ativa. Vagas: ${req.mega_ativas} de ${req.teto_mega} ocupadas.`, () => marcar("modalidade_pedida", "mega")));
    c.append(campo("Nome do servidor", "f-nome", "text", rasc.nome, 80, (v) => marcar("nome", v)));
    c.append(campo("Convite permanente do servidor", "f-convite", "text", rasc.convite, 80, (v) => marcar("convite", v), "Um convite sem validade, do seu servidor (ex.: https://discord.gg/seucodigo). É o que as pessoas vão usar para entrar."));
    c.append(campo("Contato extra (opcional)", "f-contato", "text", rasc.contato, 120, (v) => marcar("contato", v), "Se a equipe precisar falar com você fora do Discord, ou alguém que combinou a parceria com você."));
  }

  function etapa2(c) {
    c.append(el("h2", "", "Como o seu servidor aparece"));
    c.append(el("p", "", "Este texto vira o post do seu servidor no canal de parcerias da Vulpus. Escreva do seu jeito: você pode usar quebras de linha, **negrito** e emojis do Discord."));
    c.append(campo("Resumo curto", "f-descricao", "textarea", rasc.descricao, 300, (v) => marcar("descricao", v), "Uma ou duas frases. Aparece na lista e na página do site."));
    c.append(campo("Texto de apresentação", "f-texto", "textarea", rasc.texto, 3500, (v) => marcar("texto", v), "Menções em massa (@everyone, @here) e de pessoas são removidas."));
    const cor = el("div");
    const l = el("label", "", "Cor do post");
    l.htmlFor = "f-cor";
    const i = el("input");
    i.type = "color";
    i.id = "f-cor";
    i.value = /^#[0-9a-f]{6}$/i.test(rasc.cor) ? rasc.cor : "#e5731c";
    i.addEventListener("input", () => marcar("cor", i.value));
    cor.append(l, i, Object.assign(el("p", "erro-campo"), { id: "erro-cor" }));
    c.append(cor);
    c.append(imagemCampo("banner", "Banner (opcional)", "Uma imagem larga, até 3 MB. A equipe vê antes de aprovar."));
    c.append(imagemCampo("logo", "Logo (opcional)", "Quadrada, até 3 MB. Se não enviar, usamos o ícone do seu servidor."));
  }

  async function sondar() {
    const { r, d } = await E.chamar("GET", `/painel/api/parceiros/checagem?guild_id=${encodeURIComponent(srv.guild_id)}`);
    if (!r.ok) return;
    check = d;
    const st = $("kiza-estado");
    if (st) {
      st.textContent = d.kiza_presente ? "A Kiza já está no seu servidor." : "Ainda não vi a Kiza no seu servidor. Assim que ela entrar, esta página percebe sozinha.";
      st.className = d.kiza_presente ? "m-ok" : "m-nd";
    }
    if (d.kiza_presente) desenharCanais();
  }

  function desenharCanais() {
    const alvo = $("canais-area");
    if (!alvo || rasc.modalidade_pedida !== "mega" || !check) return;
    const sel = el("select");
    sel.id = "f-canal";
    const vazio = el("option", "", "Escolha um canal");
    vazio.value = "";
    sel.append(vazio);
    for (const ch of check.canais) {
      const o = el("option", "", `#${ch.nome}${ch.pode_enviar ? "" : " (a Kiza não consegue falar aqui)"}`);
      o.value = ch.id;
      o.disabled = !ch.pode_enviar;
      sel.append(o);
    }
    sel.value = rasc.canal_id || "";
    sel.addEventListener("change", async () => {
      if (!sel.value) return;
      const { r, d } = await E.chamar("POST", "/painel/api/parceiros/canal", { guild_id: srv.guild_id, canal_id: sel.value });
      $("erro-canal_id").textContent = r.ok ? "" : d.mensagem || "Não deu para usar esse canal.";
      if (r.ok) {
        rasc.canal_id = sel.value;
        salvoMsg(`Canal salvo às ${hora()}`);
      }
    });
    const l = el("label", "", "Canal onde a Kiza pode divulgar a Vulpus");
    l.htmlFor = "f-canal";
    alvo.replaceChildren(l, sel, el("p", "dica", "Só aparecem canais onde a Kiza consegue enviar mensagens e incorporar links. Ela divulga só ali."), Object.assign(el("p", "erro-campo"), { id: "erro-canal_id" }));
  }

  function etapa3(c) {
    c.append(el("h2", "", "Convide a Kiza"));
    const mega = rasc.modalidade_pedida === "mega";
    c.append(el("p", "", mega ? "Na Mega Parceria a Kiza precisa estar no seu servidor para divulgar a Vulpus onde você escolher." : "Na Parceria a Kiza pode ficar no seu servidor, se vocês quiserem. Se não quiserem, pule este convite."));
    const a = el("a", "botao", "Convidar a Kiza");
    a.href = portal.convite_kiza;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    c.append(el("p", "acoes"), a, el("p", "dica", "Ela pede só três permissões: ver o canal, enviar mensagens e incorporar links."));
    c.append(el("p", "", ""), Object.assign(el("p", "m-nd"), { id: "kiza-estado", textContent: "Conferindo se a Kiza já entrou…" }));
    const areaCanais = el("div");
    areaCanais.id = "canais-area";
    if (mega) c.append(areaCanais);
    c.append(el("h2", "", "Confirmações"));
    c.append(escolha("checkbox", "decl", "sem_vetos", !!rasc.sem_vetos, "O servidor é em português (Brasil) e não tem conteúdo adulto, golpe, discurso de ódio ou raid.", "", (i) => marcar("sem_vetos", i.checked)));
    if (mega) c.append(escolha("checkbox", "decl2", "equipe", !!rasc.equipe_ativa, "A equipe do servidor está ativa e acompanha a parceria.", "", (i) => marcar("equipe_ativa", i.checked)));
    c.append(Object.assign(el("p", "erro-campo"), { id: "erro-sem_vetos" }));
    sondar();
    tSonda = setInterval(() => { if (!check || !check.kiza_presente) sondar(); }, 6000);
  }

  function itemCheck(i) {
    const li = el("li");
    const ok = i.ok === true ? ["ok", "m-ok"] : i.ok === false ? ["não", "m-no"] : ["—", "m-nd"];
    li.append(el("span", `marca ${ok[1]}`, ok[0]));
    const t = el("div");
    t.append(el("b", "", i.rotulo));
    if (i.detalhe) t.append(document.createTextNode(` · ${i.detalhe}`));
    li.append(t);
    return li;
  }

  function previaPost(p) {
    const caixa = el("div", "previa-post");
    caixa.style.setProperty("--cor", /^#[0-9a-f]{6}$/i.test(p.cor) ? p.cor : "#e5731c");
    caixa.append(el("h3", "", p.titulo || "Seu servidor"));
    for (const par of String(p.descricao || "").split(/\n{2,}/)) if (par.trim()) caixa.append(el("p", "", par));
    if (p.banner) {
      const i = el("img");
      i.src = urlImg(p.banner);
      i.alt = "";
      caixa.append(i);
    }
    if (p.convite) caixa.append(el("p", "convite", p.convite));
    return caixa;
  }

  async function etapa4(c) {
    c.append(el("h2", "", "Revisão"));
    const lugar = el("div"); // o conteúdo chega depois (rede): este espaço já fica no lugar certo, acima dos botões de navegação
    const carregando = el("p", "dica", "Conferindo o seu servidor…");
    lugar.append(carregando);
    c.append(lugar);
    await salvar();
    const [ch, pv] = await Promise.all([E.chamar("GET", `/painel/api/parceiros/checagem?guild_id=${encodeURIComponent(srv.guild_id)}`), E.chamar("GET", `/painel/api/parceiros/previa?guild_id=${encodeURIComponent(srv.guild_id)}`)]);
    carregando.remove();
    await atualizarFaltando();
    const falt = (rasc.faltando || []).filter((f) => CAMPO_ETAPA[f]);
    if (falt.length) {
      const f = el("p", "faltando", "Ainda falta preencher: ");
      falt.forEach((nome, k) => {
        const b = el("button", "", NOME_CAMPO[nome] || nome);
        b.type = "button";
        b.addEventListener("click", () => ir(CAMPO_ETAPA[nome]));
        f.append(b, document.createTextNode(k < falt.length - 1 ? ", " : "."));
      });
      lugar.append(f);
    }
    if (ch.r.ok) {
      check = ch.d;
      lugar.append(el("p", "rotulo", "Pontuação do checklist (a equipe decide, a pontuação só ajuda)"), el("p", "pontos", `${ch.d.pontuacao}%`));
      const ul = el("ul", "checks");
      for (const i of ch.d.itens) ul.append(itemCheck(i));
      lugar.append(ul);
    } else lugar.append(el("p", "aviso", ch.d.mensagem || "Não consegui conferir o servidor agora."));
    if (pv.r.ok) {
      lugar.append(el("h2", "", "Como o seu post vai aparecer"), previaPost(pv.d.embed));
    }
    // a etapa 4 é assíncrona: os botões de navegação já foram desenhados depois dela
  }

  /** Pergunta ao servidor o que ainda falta (o canal, por exemplo, é salvo por outra rota e não volta na resposta do rascunho). */
  async function atualizarFaltando() {
    const { r, d } = await E.chamar("GET", `/painel/api/parceiros/rascunho?guild_id=${encodeURIComponent(srv.guild_id)}`);
    if (r.ok && d) {
      rasc.faltando = d.faltando || [];
      rasc.pronto_para_enviar = d.pronto_para_enviar;
    }
  }

  function etapa5(c) {
    c.append(el("h2", "", "Enviar para a equipe"));
    c.append(el("p", "", "Quando você enviar, a equipe da Vulpus recebe o pedido, o texto e as imagens. Uma pessoa lê e decide: não existe aprovação automática. A resposta aparece aqui mesmo."));
    const falt = (rasc.faltando || []).filter((f) => CAMPO_ETAPA[f]);
    if (falt.length) {
      c.append(el("p", "faltando", `Ainda falta: ${falt.map((f) => NOME_CAMPO[f] || f).join(", ")}. Volte à revisão para ver onde.`));
    }
    const msg = el("p", "erro-campo");
    const bt = el("button", "botao", "Enviar pedido de parceria");
    bt.type = "button";
    bt.disabled = falt.length > 0;
    bt.addEventListener("click", async () => {
      bt.disabled = true;
      clearTimeout(tSalvar);
      await salvar();
      const { r, d } = await E.chamar("POST", "/painel/api/parceiros/enviar", { guild_id: srv.guild_id });
      if (r.ok) {
        const novo = await E.chamar("GET", "/painel/api/parceiros/portal");
        if (novo.r.ok) {
          portal = novo.d;
          srv = portal.servidores.find((s) => s.guild_id === srv.guild_id) || srv;
        }
        return painel();
      }
      bt.disabled = false;
      msg.textContent = d.mensagem || "Não consegui enviar agora.";
      if (d.faltando) {
        rasc.faltando = d.faltando;
        etapa5(c);
      }
    });
    c.append(bt, msg);
  }

  // ------------------------------------------------------------------ painel (pedido enviado ou parceria ativa)
  async function painel() {
    clearInterval(tSonda);
    const raiz = $("p-conteudo");
    raiz.replaceChildren(el("p", "estado", "Carregando…"));
    const [st, pv] = await Promise.all([E.chamar("GET", `/painel/api/parceiros/status?guild_id=${encodeURIComponent(srv.guild_id)}`), E.chamar("GET", `/painel/api/parceiros/previa?guild_id=${encodeURIComponent(srv.guild_id)}`)]);
    if (st.r.status === 401) return mostrar("p-entrar");
    raiz.replaceChildren();
    const d = st.d;
    $("p-srv-sobre").textContent = "Parceria";
    const topo = el("p");
    topo.append(el("span", `etiqueta-st st-${d.status}`, ROTULO_ST[d.status] || d.status));
    if (d.modalidade) topo.append(document.createTextNode(` ${d.modalidade === "mega" ? "Mega Parceria" : "Parceria"}`));
    raiz.append(topo);
    if (d.status === "em_analise") raiz.append(el("p", "lead", "A equipe recebeu o seu pedido e vai analisar. Você não precisa fazer mais nada: o resultado aparece aqui."));
    if (d.mensagem_equipe) raiz.append(el("p", "faltando", `Recado da equipe: ${d.mensagem_equipe}`));
    if ((d.pendencias || []).length) raiz.append(el("p", "faltando", `Aguardando a equipe aprovar: ${d.pendencias.join(", ")}. Enquanto isso continua valendo o que estava antes.`));
    if (pv.r.ok) raiz.append(el("h2", "", "Seu cartão no canal de parcerias"), previaPost(pv.d.embed));
    if (["ativa", "pausada"].includes(d.status)) painelAtivo(raiz, d);
    raiz.append(el("h2", "", "Histórico"));
    const ul = el("ul", "historico");
    for (const h of d.historico || []) {
      const li = el("li");
      li.append(el("time", "", dataHora(h.quando)), document.createTextNode(h.texto));
      ul.append(li);
    }
    if (!(d.historico || []).length) ul.append(el("li", "", "Nada por enquanto."));
    raiz.append(ul);
  }

  async function acao(nome, rotuloOk) {
    salvoMsg("Um instante…");
    const { r, d } = await E.chamar("POST", `/painel/api/parceiros/${nome}`, { guild_id: srv.guild_id });
    if (r.status === 429 && d.liberado_em) salvoMsg(`${d.mensagem} (libera em ${dataHora(d.liberado_em)})`);
    else salvoMsg(r.ok ? rotuloOk : d.mensagem || "Não consegui agora.");
    if (r.ok) {
      const novo = await E.chamar("GET", "/painel/api/parceiros/portal");
      if (novo.r.ok) {
        portal = novo.d;
        srv = portal.servidores.find((s) => s.guild_id === srv.guild_id) || srv;
      }
      painel();
    }
  }

  async function painelAtivo(raiz, d) {
    const acoes = el("div", "acoes-painel");
    const bt = (rotulo, fn, extra = "") => {
      const b = el("button", `botao botao-pequeno ${extra}`, rotulo);
      b.type = "button";
      b.addEventListener("click", fn);
      acoes.append(b);
      return b;
    };
    if (d.status === "ativa") {
      bt("Renovar o post agora", () => acao("renovar", "Post renovado no canal de parcerias."));
      bt("Enviar divulgação agora", () => acao("enviar_agora", "Divulgação enviada. (Um pedido por dia.)"), "botao-fio");
      bt("Pausar", () => acao("pausar", "Parceria pausada."), "botao-fio");
    } else bt("Reativar", () => acao("reativar", "Parceria reativada."));
    bt("Editar o cartão", () => { editandoCartao = !editandoCartao; formEdicao.hidden = !editandoCartao; }, "botao-fio");
    const sair = bt("Sair da parceria", () => { conf.hidden = false; sair.hidden = true; }, "botao-fio perigo-bt");
    const conf = el("div", "confirma");
    conf.hidden = true;
    conf.append(el("p", "", "Sair encerra a parceria, tira o seu post do canal e a Kiza deixa o seu servidor. Tem certeza?"));
    const sim = el("button", "botao botao-pequeno perigo-bt", "Sim, sair da parceria");
    sim.type = "button";
    sim.addEventListener("click", () => acao("sair", "Parceria encerrada."));
    const nao = el("button", "botao botao-fio botao-pequeno", "Voltar");
    nao.type = "button";
    nao.addEventListener("click", () => { conf.hidden = true; sair.hidden = false; });
    conf.append(sim, document.createTextNode(" "), nao);
    raiz.append(acoes, conf);
    if (d.modalidade === "mega") {
      const pg = el("p");
      const a = el("a", "link-seta", "Editar a página do meu servidor");
      a.href = `../../pagina/editar/?tipo=parceiro&guild_id=${encodeURIComponent(srv.guild_id)}`;
      pg.append(a);
      raiz.append(pg);
    }
    // edição do cartão (vai para a equipe aprovar)
    const formEdicao = el("div", "etapa");
    formEdicao.hidden = true;
    const cur = (await E.chamar("GET", `/painel/api/parceiros/previa?guild_id=${encodeURIComponent(srv.guild_id)}`)).d.embed || {};
    rasc = { descricao: cur.descricao || "", texto: cur.descricao || "", cor: cur.cor || "#e5731c", banner_id: null, logo_id: null };
    const edit = { };
    formEdicao.append(el("h2", "", "Editar o cartão"), el("p", "", "A mudança vai para a equipe aprovar. Enquanto isso, continua valendo o que está no ar."));
    formEdicao.append(campo("Texto de apresentação", "f-texto", "textarea", rasc.texto, 3500, (v) => { edit.texto = v; }));
    formEdicao.append(campo("Resumo curto", "f-descricao", "textarea", "", 300, (v) => { edit.descricao = v; }));
    const cor = el("input");
    cor.type = "color";
    cor.id = "f-cor";
    cor.value = /^#[0-9a-f]{6}$/i.test(rasc.cor) ? rasc.cor : "#e5731c";
    cor.addEventListener("input", () => { edit.cor = cor.value; });
    const lc = el("label", "", "Cor do post");
    lc.htmlFor = "f-cor";
    formEdicao.append(lc, cor);
    const enviar = el("button", "botao", "Enviar edição para a equipe");
    enviar.type = "button";
    const msg = el("p", "erro-campo");
    enviar.addEventListener("click", async () => {
      const { r, d: x } = await E.chamar("PUT", "/painel/api/parceiros/editar", { guild_id: srv.guild_id, ...edit });
      msg.textContent = r.ok ? "Edição enviada. A equipe vai avaliar." : x.mensagem || Object.values(x.erros || {}).join(" ") || "Não consegui enviar.";
      if (r.ok) painel();
    });
    formEdicao.append(enviar, msg);
    raiz.append(formEdicao);
    // estatísticas
    const est = await E.chamar("GET", `/painel/api/parceiros/estatisticas?guild_id=${encodeURIComponent(srv.guild_id)}`);
    if (est.r.ok) {
      raiz.append(el("h2", "", "Números da parceria"));
      const dl = el("dl", "estat");
      const mes = (est.d.entradas_mes || [])[0];
      const par = (t, v) => { const g = el("div"); g.append(el("dt", "", t), el("dd", "", v)); dl.append(g); };
      par("Entradas pelo seu convite (mês mais recente)", mes ? `${mes.parceiro_na_vulpus}` : "0");
      par("Divulgações feitas", String(est.d.divulgacoes || 0));
      par("Próxima divulgação", est.d.proxima ? dataHora(est.d.proxima) : "—");
      for (const dest of est.d.destinos || []) {
        // estado visível de cada canal: funcionando, ou pausado e o motivo (para ninguém ficar sem saber por que "não manda nada")
        par(dest.rotulo, dest.pausado ? `Pausado: ${dest.motivo || "erro no canal"}. Confira o canal e as permissões da Kiza.` : dest.proxima ? `Funcionando. Próxima: ${dataHora(dest.proxima)}` : "Funcionando.");
      }
      if (est.d.ultimo_erro) par("Último erro de envio", `${est.d.ultimo_erro.texto} (${dataHora(est.d.ultimo_erro.em)})`);
      if (est.d.modalidade === "normal") par("Divulgação repetida", "Só a Mega Parceria divulga de tempos em tempos; a normal usa o cartão fixo (renove quando quiser).");
      raiz.append(dl);
    }
  }

  // ------------------------------------------------------------------ ligações
  $("p-entrar-bt").addEventListener("click", () => E.entrar("parceiros/portal"));
  $("p-sair").addEventListener("click", () => { E.chamar("POST", "/painel/api/sair"); E.sair(); mostrar("p-entrar"); });
  $("p-voltar").addEventListener("click", () => { clearInterval(tSonda); salvar().then(() => carregar()); });
  window.addEventListener("pagehide", () => { if (Object.keys(sujo).length) salvar(); });

  (function iniciar() {
    const volta = E.receberLogin("../../");
    if (volta === "indo") return;
    if (volta === "erro") {
      mostrar("p-entrar");
      $("p-aviso").hidden = false;
      $("p-aviso").textContent = "O login expirou ou foi interrompido. Tente de novo.";
      return;
    }
    const erro = new URLSearchParams(location.search).get("erro");
    if (erro) {
      mostrar("p-entrar");
      $("p-aviso").hidden = false;
      $("p-aviso").textContent = { login: "O login expirou ou foi interrompido. Tente de novo.", discord: "O Discord não respondeu agora. Tente de novo.", servidor: "O sistema está iniciando. Tente de novo em instantes.", nao_configurado: "O login com Discord ainda não foi ativado pela equipe." }[erro] || "Não consegui entrar. Tente de novo.";
      return;
    }
    if (!E.tem()) return mostrar("p-entrar");
    carregar();
  })();
})();
