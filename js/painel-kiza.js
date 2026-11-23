// Painel da Kiza (/kiza/painel/): dashboard do servidor. Barra lateral, visão geral, funções (interruptores, tudo desligado até ligar), mensagens e embeds,
// chave de IA própria e registro de alterações. Tudo que vem da API entra por textContent/value (nunca HTML). As regras de verdade são do servidor.
"use strict";

(() => {
  const { $, el } = VULPUS;
  const E = ENTRADA;
  const K_ULT = "vulpus_painel_servidor";

  const estado = { servidores: [], equipe: false, gid: "", servidor: null, vista: "inicio", modulos: [], dirty: new Set(), cache: {}, usuario: "" };

  // ------------------------------------------------------------------ textos amigáveis (nomes e dicas dos campos)
  const ROTULOS = {
    canal_id: ["Canal", "Escolha na lista. Só aparecem canais que a Kiza enxerga; os sem permissão aparecem bloqueados com o motivo."],
    cargo_id: ["Cargo automático (opcional)", "Cargo que a Kiza dá a quem entra. Só funciona com cargos abaixo do cargo dela e se ela tiver a permissão Gerenciar Cargos."],
    mensagem: ["Mensagem", "Use {user}, {username}, {server} e {count}."],
    embed_id: ["Embed da mensagem (opcional)", "Escolha um embed criado na aba Mensagens e embeds."],
    hora_ini: ["Começa às (hora)", "Horário de Brasília."], hora_fim: ["Termina às (hora)", "Horário de Brasília."],
    espera_s: ["Espera antes de responder (segundos)", "Se alguém responder nesse tempo, a Kiza fica quieta."],
    limite_pessoa_horas: ["Uma resposta por pessoa a cada (horas)", ""], teto_hora: ["Máximo de respostas por hora no canal", ""],
    por_dia: ["Perguntas por dia", "1 ou 2."], silencio_ini: ["Silêncio começa às (hora)", "Sem perguntas nesse intervalo."], silencio_fim: ["Silêncio termina às (hora)", ""],
    dias: ["Dias sem atividade", "Só para o relatório."], provedor: ["Provedor", ""], limite_mes_centavos: ["Limite do mês (centavos de dólar)", "200 = US$ 2,00."], max_pessoa_dia: ["Máximo por pessoa por dia", ""],
  };
  const ICONES = { conversa: "p-conversa", aprende: "p-livro", antivacuo: "p-ola", boas_vindas: "p-ola", perguntas: "p-pergunta", ia_propria: "p-ia", limpeza_inativos: "p-limpeza" };

  // ------------------------------------------------------------------ dados reais do servidor, com cache por servidor
  const chamar = (m, c, b) => E.chamar(m, c, b);
  const q = (g) => encodeURIComponent(g);
  async function dados(chave, caminho) {
    const k = `${estado.gid}:${chave}`;
    if (!estado.cache[k]) {
      estado.cache[k] = chamar("GET", `${caminho}${caminho.includes("?") ? "&" : "?"}guild_id=${q(estado.gid)}`).then(({ r, d }) => {
        if (!r.ok) { delete estado.cache[k]; throw new Error(d.mensagem || "falhou"); }
        return d;
      });
    }
    return estado.cache[k];
  }
  const canais = async () => (await dados("canais", "/painel/api/kiza/canais")).canais;
  const cargos = async () => (await dados("cargos", "/painel/api/kiza/cargos")).cargos;
  const embedsSalvos = async () => (await dados("embeds", "/painel/api/kiza/embeds")).embeds;
  const esquecer = (chave) => { delete estado.cache[`${estado.gid}:${chave}`]; };

  const dataHora = (s) => new Date(s * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const iniciais = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  const aviso = (texto, tipo = "") => el("div", `pk-aviso ${tipo}`.trim(), texto);
  const titulo = (h, d) => { const f = document.createDocumentFragment(); f.append(el("h2", "pk-secao-titulo", h)); if (d) f.append(el("p", "pk-secao-desc", d)); return f; };

  // ------------------------------------------------------------------ casca: telas, navegação, servidor
  const tela = (qual) => {
    $("pk-carregando").hidden = qual !== "carregando";
    $("pk-entrar").hidden = qual !== "entrar";
    $("pk-app").hidden = qual !== "app";
  };
  const VISTAS = [
    { id: "inicio", rotulo: "Visão geral", icone: "p-inicio", titulo: "Visão geral", sub: "Como a Kiza está no seu servidor." },
    { id: "funcoes", rotulo: "Funções", icone: "p-funcoes", titulo: "Funções da Kiza", sub: "Ligue só o que você quiser. Tudo vem desligado." },
    { id: "mensagens", rotulo: "Mensagens e embeds", icone: "p-mensagens", titulo: "Mensagens e embeds", sub: "Crie, edite e publique mensagens bonitas no Discord." },
    { id: "ia", rotulo: "Conversa com IA", icone: "p-ia", titulo: "Conversa com IA", sub: "Use a sua própria chave. O gasto é seu e você define o limite." },
    { id: "registro", rotulo: "Registro de alterações", icone: "p-registro", titulo: "Registro de alterações", sub: "Quem mudou o quê, e quando." },
    { id: "equipe", rotulo: "Saúde da Kiza", icone: "p-saude", titulo: "Saúde da Kiza", sub: "Só para a equipe da Vulpus.", equipe: true },
  ];

  function desenharNav() {
    const nav = $("pk-nav");
    nav.replaceChildren(el("div", "pk-nav-titulo", "Servidor"));
    for (const v of VISTAS) {
      if (v.equipe && !(estado.equipe && estado.servidor && estado.servidor.casa)) continue;
      const b = el("button");
      b.type = "button";
      b.append(PUI.icone(v.icone), el("span", "", v.rotulo));
      if (v.id === "funcoes" && estado.dirty.size) b.append(el("span", "pk-pill", `${estado.dirty.size} sem salvar`));
      if (v.id === estado.vista) b.setAttribute("aria-current", "page");
      b.addEventListener("click", () => irPara(v.id));
      nav.append(b);
    }
    $("pk-usuario").replaceChildren(el("span", "pk-icone", iniciais(estado.usuario)), el("span", "", estado.usuario || ""));
  }

  function iconeServidor(s) {
    const ic = el("span", "pk-icone");
    if (s && s.icone) { const i = el("img"); i.src = s.icone; i.alt = ""; i.referrerPolicy = "no-referrer"; ic.append(i); } else ic.textContent = iniciais(s ? s.nome : "?");
    return ic;
  }

  function desenharServidor() {
    const caixa = $("pk-servidor");
    caixa.replaceChildren();
    const s = estado.servidor;
    const btn = el("button", "pk-servidor-btn");
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.append(iconeServidor(s), el("span", "", s ? s.nome : "Escolher servidor"), PUI.icone("p-seta"));
    const lista = el("div", "pk-lista-flutuante");
    lista.hidden = true;
    for (const x of estado.servidores) {
      const b = el("button");
      b.type = "button";
      b.setAttribute("role", "option");
      b.setAttribute("aria-selected", String(x.guild_id === estado.gid));
      b.append(iconeServidor(x), el("span", "", x.nome), el("small", "", x.kiza_presente ? "" : "sem a Kiza"));
      b.addEventListener("click", () => { lista.hidden = true; escolherServidor(x.guild_id); });
      lista.append(b);
    }
    btn.addEventListener("click", () => { lista.hidden = !lista.hidden; });
    caixa.append(btn, lista);
    caixa.lista = lista;
  }
  document.addEventListener("mousedown", (e) => { const c = $("pk-servidor"); if (c && c.lista && !c.contains(e.target)) c.lista.hidden = true; });

  const confirmarSair = () => (estado.dirty.size
    ? PUI.confirmar({ titulo: "Há alterações sem salvar", texto: "Se continuar, o que você mudou e não salvou será perdido.", ok: "Continuar sem salvar", perigo: true })
    : Promise.resolve(true));

  async function escolherServidor(gid) {
    if (gid === estado.gid) return;
    if (!(await confirmarSair())) return;
    estado.dirty.clear();
    estado.gid = gid;
    estado.servidor = estado.servidores.find((x) => x.guild_id === gid) || null;
    estado.modulos = [];
    try { localStorage.setItem(K_ULT, gid); } catch { /* sem armazenamento: tudo bem */ }
    desenharServidor();
    await irPara(estado.vista === "equipe" && !(estado.equipe && estado.servidor && estado.servidor.casa) ? "inicio" : estado.vista, true);
  }

  async function irPara(id, forcar = false) {
    if (!forcar && id !== estado.vista && estado.dirty.size && !(await confirmarSair())) return;
    if (id !== estado.vista) estado.dirty.clear();
    estado.vista = id;
    $("pk-app").classList.remove("menu-aberto");
    const v = VISTAS.find((x) => x.id === id) || VISTAS[0];
    $("pk-titulo").textContent = v.titulo;
    $("pk-subtitulo").textContent = v.sub;
    desenharNav();
    const alvo = $("pk-vista");
    alvo.replaceChildren(el("div", "pk-skeleton"));
    window.scrollTo({ top: 0 });
    if (!estado.servidor) return semServidor(alvo);
    if (!estado.servidor.kiza_presente) return semKiza(alvo);
    try {
      await ({ inicio: vistaInicio, funcoes: vistaFuncoes, mensagens: vistaMensagens, ia: vistaIa, registro: vistaRegistro, equipe: vistaEquipe }[id])(alvo);
    } catch (e) {
      alvo.replaceChildren(aviso(e.message || "Não consegui carregar esta parte. Tente de novo.", "erro"));
    }
  }

  function semServidor(alvo) {
    alvo.replaceChildren(titulo("Escolha um servidor", "No topo da página, escolha o servidor que você quer ajustar."),
      estado.servidores.length ? el("p", "pk-dica", "Só aparecem os servidores onde você tem a permissão Gerenciar Servidor.")
        : aviso("Nenhum servidor encontrado. Você precisa ter a permissão Gerenciar Servidor e ter entrado de novo depois de receber a permissão.", "alerta"));
  }
  async function semKiza(alvo) {
    const f = document.createDocumentFragment();
    f.append(titulo("A Kiza não está nesse servidor", "Convide a Kiza para usar o painel."));
    // o convite vem do servidor da Kiza (o mesmo do Portal do parceiro), nunca escrito aqui
    const { r, d } = await chamar("GET", "/painel/api/parceiros/portal");
    if (r.ok && d.convite_kiza) {
      const a = el("a", "pk-btn pk-btn-primario", "Convidar a Kiza");
      a.href = d.convite_kiza;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      f.append(a);
    }
    f.append(aviso("Depois de convidar a Kiza, saia e entre de novo no painel para a lista atualizar."));
    alvo.replaceChildren(f);
  }

  // ------------------------------------------------------------------ visão geral
  async function carregarModulos() {
    const { r, d } = await chamar("GET", `/painel/api/kiza/modulos?guild_id=${q(estado.gid)}`);
    if (!r.ok) throw new Error(d.mensagem || "Não consegui abrir as funções.");
    estado.modulos = d.modulos;
    return d.modulos;
  }

  async function vistaInicio(alvo) {
    const [mods, aud] = await Promise.all([carregarModulos(), chamar("GET", `/painel/api/kiza/auditoria?guild_id=${q(estado.gid)}`)]);
    const ligadas = mods.filter((m) => m.ligada);
    const f = document.createDocumentFragment();
    f.append(titulo(estado.servidor.nome, "Um resumo do que a Kiza faz neste servidor."));
    const stats = el("div", "pk-stats");
    const stat = (n, t) => { const s = el("div", "pk-stat"); s.append(el("b", "", String(n)), el("span", "", t)); return s; };
    const regs = aud.r.ok ? aud.d.registros : [];
    stats.append(stat(ligadas.length, "funções ligadas"), stat(mods.filter((m) => m.disponivel).length - ligadas.length, "funções disponíveis desligadas"), stat(regs.length, "alterações recentes"));
    f.append(stats);
    const grade = el("div", "pk-grade");
    const c1 = el("div", "pk-card");
    c1.append(el("h3", "", "Funções"));
    const ul = el("ul", "pk-lista");
    for (const m of mods) {
      const li = el("li");
      li.append(PUI.icone(ICONES[m.chave] || "p-funcoes"), el("span", "", m.nome), el("span", `pk-estado ${m.ligada ? "on" : m.disponivel ? "" : "breve"}`, m.ligada ? "ligada" : m.disponivel ? "desligada" : "em breve"));
      ul.append(li);
    }
    const b = el("button", "pk-btn pk-btn-primario", "Ajustar funções");
    b.type = "button";
    b.addEventListener("click", () => irPara("funcoes"));
    const rod = el("div", "pk-card-rodape");
    rod.append(b);
    c1.append(ul, rod);
    const c2 = el("div", "pk-card");
    c2.append(el("h3", "", "Últimas alterações"));
    const ul2 = el("ul", "pk-lista");
    if (!regs.length) ul2.append(el("li", "", "Nada mudou ainda."));
    for (const r of regs.slice(0, 6)) { const li = el("li"); li.append(el("span", "", r.chave), el("small", "", dataHora(r.quando))); ul2.append(li); }
    c2.append(ul2);
    grade.append(c1, c2);
    f.append(grade);
    alvo.replaceChildren(f);
  }

  // ------------------------------------------------------------------ funções (módulos)
  function criarCampo(nome, c, valorInicial, leitor) {
    const [rot, dica] = ROTULOS[nome] || [nome.replace(/_/g, " "), ""];
    const reg = (obj) => { leitor.get[nome] = () => obj.valor(); return obj.raiz; };
    if (c.tipo === "canal") {
      return reg(PUI.seletor({ rotulo: rot, tip: dica, valor: valorInicial ? String(valorInicial) : "", nenhum: "Nenhum canal", vazio: "Nenhum canal disponível.",
        carregar: async () => (await canais()).map((x) => ({ valor: x.id, rotulo: x.nome, hash: "#", sub: x.pode_enviar ? x.tipo : `sem permissão: ${x.faltas.join(", ")}`, grupo: x.categoria || "Sem categoria", desabilitado: !x.pode_enviar })),
        aoMudar: () => leitor.sujar() }));
    }
    if (c.tipo === "cargo") {
      return reg(PUI.seletor({ rotulo: rot, tip: dica, valor: valorInicial ? String(valorInicial) : "", nenhum: "Nenhum cargo", vazio: "Nenhum cargo disponível.",
        carregar: async () => (await cargos()).map((x) => ({ valor: x.id, rotulo: x.nome, cor: x.cor, sub: x.gerenciavel ? "" : "a Kiza não consegue dar", desabilitado: !x.gerenciavel })),
        aoMudar: () => leitor.sujar() }));
    }
    if (c.tipo === "embed") {
      return reg(PUI.seletor({ rotulo: rot, tip: dica, valor: valorInicial ? String(valorInicial) : "", nenhum: "Sem embed (só o texto)", vazio: "Você ainda não criou nenhum embed.", avancado: false,
        carregar: async () => (await embedsSalvos()).map((x) => ({ valor: String(x.id), rotulo: x.nome, sub: x.titulo || "" })), aoMudar: () => leitor.sujar() }));
    }
    if (c.tipo === "texto") {
      const t = PUI.campo({ rotulo: rot, valor: valorInicial ?? "", area: nome === "mensagem", max: c.max || 0, tip: dica, aoMudar: () => leitor.sujar() });
      leitor.get[nome] = () => t.valor();
      return t.raiz;
    }
    const t = PUI.campo({ rotulo: rot, valor: valorInicial ?? "", tipo: "number", min: c.min, maxNum: c.max, tip: dica, aoMudar: () => leitor.sujar() });
    leitor.get[nome] = () => t.valor();
    return t.raiz;
  }

  function botoesBoasVindas() {
    const caixa = el("div", "pk-bloco");
    caixa.append(el("h4", "", "Prévia e teste"));
    const previa = el("div");
    const ver = PUI.comCarga(el("button", "pk-btn", "Ver prévia"), async () => {
      const { r, d } = await chamar("GET", `/painel/api/kiza/boas_vindas/previa?guild_id=${q(estado.gid)}`);
      if (!r.ok) return PUI.toast(d.mensagem || "Não consegui montar a prévia.", "erro");
      previa.replaceChildren(PEMBED.previa(PEMBED.mesclar(d.embed), { servidor: estado.servidor.nome, conteudo: d.previa }));
    });
    ver.type = "button";
    const teste = PUI.comCarga(el("button", "pk-btn", "Enviar mensagem de teste"), async () => {
      const { r, d } = await chamar("POST", "/painel/api/kiza/boas_vindas/teste", { guild_id: estado.gid });
      PUI.toast(d.mensagem || (r.ok ? "Teste enviado." : "Não consegui enviar."), r.ok ? "ok" : "erro");
    });
    teste.type = "button";
    const linha = el("div", "pk-acoes");
    linha.append(ver, teste);
    caixa.append(el("p", "pk-dica", "A prévia e o teste usam o que está SALVO. Salve antes de testar."), linha, previa);
    return caixa;
  }

  function cartaoModulo(m) {
    const card = el("div", `pk-card${m.ligada ? " pk-ligado" : ""}`);
    const topo = el("div", "pk-card-topo");
    const ic = el("div", "pk-card-icone");
    ic.append(PUI.icone(ICONES[m.chave] || "p-funcoes"));
    const txt = el("div");
    txt.append(el("h3", "", m.nome), el("p", "pk-card-desc", m.aviso));
    topo.append(ic, txt);
    if (!m.disponivel) {
      topo.append(el("span", "pk-estado breve", "em breve"));
      card.append(topo);
      return card;
    }
    let ligada = m.ligada;
    const etiqueta = el("span", `pk-estado ${m.ligada ? "on" : ""}`, m.ligada ? "ligada" : "desligada");
    const sujoMsg = el("span", "pk-aviso-sujo", "Alterações não salvas");
    sujoMsg.hidden = true;
    const marcarSujo = (s) => {
      sujoMsg.hidden = !s;
      card.classList.toggle("pk-sujo", s);
      if (s) estado.dirty.add(m.chave); else estado.dirty.delete(m.chave);
      desenharNav();
    };
    const leitor = { get: {}, sujar: () => marcarSujo(true) };
    topo.append(PUI.interruptor({ marcado: m.ligada, rotulo: `Ligar ${m.nome}`, aoMudar: (v) => { ligada = v; marcarSujo(true); } }));
    card.append(topo);
    const corpo = el("div", "pk-corpo");
    const numeros = el("div", "pk-linha");
    for (const [n, c] of Object.entries(m.campos)) (c.tipo === "int" ? numeros : corpo).append(criarCampo(n, c, m.config[n], leitor));
    if (numeros.childNodes.length) corpo.append(numeros);
    if (m.chave === "boas_vindas") corpo.append(botoesBoasVindas());
    card.append(corpo);
    const salvar = PUI.comCarga(el("button", "pk-btn pk-btn-primario", "Salvar"), async () => {
      const config = {};
      for (const [n, f] of Object.entries(leitor.get)) config[n] = f();
      const { r, d } = await chamar("PUT", "/painel/api/kiza/modulos", { guild_id: estado.gid, chave: m.chave, ligada, config });
      if (!r.ok) return PUI.toast(d.mensagem || Object.values(d.erros || {}).join(" ") || "Não consegui salvar.", "erro");
      PUI.toast(`${m.nome}: salvo.`, "ok");
      m.ligada = ligada;
      Object.assign(m.config, config);
      card.classList.toggle("pk-ligado", ligada);
      etiqueta.textContent = ligada ? "ligada" : "desligada";
      etiqueta.className = `pk-estado ${ligada ? "on" : ""}`;
      marcarSujo(false);
    });
    salvar.type = "button";
    const rod = el("div", "pk-card-rodape");
    rod.append(salvar, etiqueta, sujoMsg);
    card.append(rod);
    return card;
  }

  async function vistaFuncoes(alvo) {
    const mods = await carregarModulos();
    const f = document.createDocumentFragment();
    f.append(titulo("Funções da Kiza", "Cada função começa desligada. Ligue com o interruptor, ajuste os valores e clique em Salvar."));
    const grade = el("div", "pk-grade");
    for (const m of mods) if (m.chave !== "ia_propria") grade.append(cartaoModulo(m));
    f.append(grade);
    alvo.replaceChildren(f);
  }

  // ------------------------------------------------------------------ mensagens e embeds
  async function vistaMensagens(alvo) {
    const f = document.createDocumentFragment();
    f.append(titulo("Mensagens e embeds", "Monte um embed com prévia ao vivo, salve e publique direto num canal. Os embeds salvos também podem ser usados nas boas-vindas."));
    const lista = el("div", "pk-bloco");
    const editorAlvo = el("div");
    f.append(lista, editorAlvo);
    alvo.replaceChildren(f);

    const abrir = async (id) => {
      let inicial = { id: 0, nome: "", dados: null, conteudo: "" };
      if (id) {
        const { r, d } = await chamar("GET", `/painel/api/kiza/embeds/${id}?guild_id=${q(estado.gid)}`);
        if (!r.ok) return PUI.toast(d.mensagem || "Não consegui abrir esse embed.", "erro");
        inicial = { id, nome: d.nome, dados: d.dados, conteudo: "" };
      }
      editorAlvo.replaceChildren(PEMBED.editor({
        gid: estado.gid, servidor: estado.servidor.nome, chamar, carregarCanais: canais, embedInicial: inicial,
        aoSalvar: async (novoId) => { esquecer("embeds"); await desenharLista(novoId); },
        aoApagar: async () => { esquecer("embeds"); editorAlvo.replaceChildren(); await desenharLista(0); },
      }).raiz);
      if (id) editorAlvo.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const desenharLista = async (ativo) => {
      lista.replaceChildren(el("h4", "", "Seus embeds"));
      let itens = [];
      try { itens = await embedsSalvos(); } catch { lista.append(aviso("Não consegui carregar a lista.", "erro")); return; }
      const ul = el("ul", "pk-lista");
      if (!itens.length) ul.append(el("li", "", "Você ainda não criou nenhum embed."));
      for (const it of itens) {
        const li = el("li");
        const cor = el("span", "pk-bolinha");
        cor.style.setProperty("background", it.cor || "#e5731c");
        const b = el("button", `pk-btn pk-btn-pequeno${it.id === ativo ? " pk-btn-primario" : ""}`, "Editar");
        b.type = "button";
        b.addEventListener("click", () => abrir(it.id));
        li.append(cor, el("span", "", it.nome), el("small", "", it.titulo || dataHora(it.atualizado_em)), b);
        ul.append(li);
      }
      const novo = el("button", "pk-btn pk-btn-primario", "+ Novo embed");
      novo.type = "button";
      novo.addEventListener("click", () => abrir(0));
      const rod = el("div", "pk-card-rodape");
      rod.append(novo);
      lista.append(ul, rod);
    };
    await desenharLista(0);
    await abrir(0);
  }

  // ------------------------------------------------------------------ conversa com IA (chave própria)
  async function vistaIa(alvo) {
    const { r, d } = await chamar("GET", `/painel/api/kiza/ia?guild_id=${q(estado.gid)}`);
    if (!r.ok) throw new Error(d.mensagem || "Não consegui abrir esta parte.");
    const f = document.createDocumentFragment();
    f.append(titulo("Conversa com IA", "Opcional. Sem chave, a Kiza usa só as respostas prontas (grátis). Com a sua chave, o gasto é seu e você define os limites."));
    const grade = el("div", "pk-grade");

    const guia = el("div", "pk-card");
    guia.append(el("h3", "", "1 · Escolher a IA"), el("p", "pk-card-desc", "Preços, planos gratuitos e privacidade mudam. Confira sempre no site do provedor."));
    const cartoes = [
      ["Anthropic (Claude)", "Disponível agora. Melhor conversa em português; o modelo pequeno é barato por resposta. Paga por uso, na conta de API (não é a assinatura do chat). Recomendada.", "https://console.anthropic.com/", "on", "disponível"],
      ["OpenAI (ChatGPT)", "Em breve. A assinatura do ChatGPT NÃO gera chave de API: a chave vem de uma conta de API cobrada por uso.", "", "breve", "em breve"],
      ["Google Gemini", "Em breve. Plano gratuito com limites que mudam; no gratuito o Google pode usar as mensagens para treinar modelos (confira o texto atual).", "", "breve", "em breve"],
      ["Groq (modelos abertos)", "Em breve. Plano gratuito e rápido, mas costuma perder o personagem.", "", "breve", "em breve"],
    ];
    const gc = el("div", "pk-corpo");
    for (const [nome, texto, url, cls, rot] of cartoes) {
      const c = el("div", "pk-bloco");
      const t = el("div", "pk-acoes");
      t.append(el("h4", "", nome), el("span", `pk-estado ${cls}`, rot));
      c.append(t, el("p", "pk-dica", texto));
      if (url) { const a = el("a", "pk-btn pk-btn-pequeno", "Abrir o site do provedor"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; c.append(a); }
      gc.append(c);
    }
    guia.append(gc, el("h3", "", "2 · Pegar a chave"), el("p", "pk-card-desc", "No site do provedor, crie uma chave de API e copie. Defina um limite de gasto lá também."));
    grade.append(guia);

    const chave = el("div", "pk-card");
    chave.append(el("h3", "", "3 · Colar e testar"), el("p", "pk-card-desc", "A Kiza faz uma chamada mínima para conferir. Depois, a chave fica cifrada e nunca mais aparece. Nunca cole chave no chat do Discord."));
    const corpo = el("div", "pk-corpo");
    if (!d.cofre_disponivel) corpo.append(aviso("O cofre de chaves ainda não está ativo no servidor da Kiza. Fale com a equipe da Vulpus.", "alerta"));
    else {
      if (d.tem_chave) {
        const linha = el("div", "pk-acoes");
        linha.append(el("span", `pk-estado ${d.estado === "ok" ? "on" : "alerta"}`, d.estado === "ok" ? "chave ativa" : `chave: ${d.estado}`), el("span", "pk-dica", `termina em ${d.ultimos4}`));
        corpo.append(linha, el("p", "pk-dica", `Gasto estimado no mês: US$ ${(d.gasto_mes_centavos / 100).toFixed(4)} de US$ ${(d.limite_mes_centavos / 100).toFixed(2)} · ${d.respostas_mes} respostas · máximo ${d.max_pessoa_dia} por pessoa por dia`));
      }
      const campoChave = PUI.campo({ rotulo: d.tem_chave ? "Trocar a chave" : "Chave de API", tipo: "password", placeholder: "sk-ant-…", tip: "Fica cifrada. Só os 4 últimos caracteres aparecem depois." });
      campoChave.entrada.autocomplete = "off";
      const testar = PUI.comCarga(el("button", "pk-btn pk-btn-primario", d.tem_chave ? "Testar e trocar" : "Testar e salvar"), async () => {
        const { r: r2, d: d2 } = await chamar("PUT", "/painel/api/kiza/ia/chave", { guild_id: estado.gid, chave: campoChave.valor() });
        campoChave.definir("");
        PUI.toast(d2.mensagem || (r2.ok ? "Chave guardada." : "Não consegui."), r2.ok ? "ok" : "erro");
        await irPara("ia", true);
      });
      testar.type = "button";
      const acoes = el("div", "pk-acoes");
      acoes.append(testar);
      if (d.tem_chave) {
        const lig = PUI.comCarga(el("button", "pk-btn", "Ligar o modo IA"), async () => {
          const { r: r2, d: d2 } = await chamar("PUT", "/painel/api/kiza/modulos", { guild_id: estado.gid, chave: "ia_propria", ligada: true });
          PUI.toast(r2.ok ? "Modo IA ligado." : d2.mensagem || "Não consegui ligar.", r2.ok ? "ok" : "erro");
        });
        lig.type = "button";
        const apagar = PUI.comCarga(el("button", "pk-btn pk-btn-perigo", "Apagar a chave"), async () => {
          const ok = await PUI.confirmar({ titulo: "Apagar a chave?", texto: "O modo IA será desligado e a Kiza volta às respostas prontas.", ok: "Apagar", perigo: true });
          if (!ok) return;
          const { r: r2, d: d2 } = await chamar("DELETE", `/painel/api/kiza/ia/chave?guild_id=${q(estado.gid)}`);
          PUI.toast(d2.mensagem || (r2.ok ? "Chave apagada." : "Não consegui."), r2.ok ? "ok" : "erro");
          await irPara("ia", true);
        });
        apagar.type = "button";
        acoes.append(lig, apagar);
      }
      corpo.append(campoChave.raiz, acoes, el("p", "pk-dica", d.aviso));
    }
    chave.append(corpo);
    grade.append(chave);
    f.append(grade);
    alvo.replaceChildren(f);
  }

  // ------------------------------------------------------------------ registro e saúde
  async function vistaRegistro(alvo) {
    const { r, d } = await chamar("GET", `/painel/api/kiza/auditoria?guild_id=${q(estado.gid)}`);
    if (!r.ok) throw new Error(d.mensagem || "Não consegui abrir o registro.");
    const f = document.createDocumentFragment();
    f.append(titulo("Registro de alterações", "Cada mudança nas funções fica aqui. Chaves e senhas nunca são guardadas no registro."));
    const c = el("div", "pk-card");
    const ul = el("ul", "pk-lista");
    if (!d.registros.length) ul.append(el("li", "", "Nada mudou ainda."));
    for (const x of d.registros) {
      const li = el("li");
      li.append(el("b", "", x.chave), el("span", "", x.quem === "0" ? "a Kiza (automático)" : `por ${x.quem}`), el("small", "", dataHora(x.quando)));
      ul.append(li);
    }
    c.append(ul);
    f.append(c);
    alvo.replaceChildren(f);
  }

  async function vistaEquipe(alvo) {
    const f = document.createDocumentFragment();
    f.append(titulo("Saúde da Kiza", "Versão, laços, parcerias e erros recentes (sem segredos)."));
    const c = el("div", "pk-card");
    const pre = el("pre", "pk-saude", "Clique em Atualizar.");
    const b = PUI.comCarga(el("button", "pk-btn pk-btn-primario", "Atualizar"), async () => {
      const { r, d } = await chamar("GET", "/painel/api/kiza/equipe/saude");
      pre.textContent = r.ok ? JSON.stringify(d, null, 2) : d.mensagem || "Não consegui.";
    });
    b.type = "button";
    const rod = el("div", "pk-card-rodape");
    rod.append(b);
    c.append(pre, rod);
    f.append(c);
    alvo.replaceChildren(f);
  }

  // ------------------------------------------------------------------ início
  async function iniciar() {
    const volta = E.receberLogin("../../");
    if (volta === "indo") return;
    if (volta === "erro") {
      tela("entrar");
      $("pk-aviso-entrar").hidden = false;
      $("pk-aviso-entrar").textContent = "O login expirou ou foi interrompido. Tente de novo.";
      return;
    }
    if (!E.tem()) return tela("entrar");
    const { r, d } = await chamar("GET", "/painel/api/kiza/servidores");
    if (r.status === 401) return tela("entrar");
    if (!r.ok) { $("pk-carregando-txt").textContent = d.mensagem || "Não consegui abrir o painel agora. Tente de novo em instantes."; return tela("carregando"); }
    estado.servidores = d.servidores;
    estado.equipe = !!d.equipe;
    const eu = await chamar("GET", "/painel/api/eu");
    estado.usuario = eu.r.ok && eu.d.ok ? (eu.d.nome || (eu.d.usuario && eu.d.usuario.nome) || "") : "";
    let ult = "";
    try { ult = localStorage.getItem(K_ULT) || ""; } catch { /* ok */ }
    const inicial = estado.servidores.find((s) => s.guild_id === ult) || (estado.servidores.length === 1 ? estado.servidores[0] : null);
    estado.gid = inicial ? inicial.guild_id : "";
    estado.servidor = inicial;
    tela("app");
    desenharServidor();
    await irPara("inicio", true);
  }

  $("pk-entrar-bt").addEventListener("click", () => E.entrar("kiza/painel"));
  $("pk-sair").addEventListener("click", async () => { if (!(await confirmarSair())) return; E.chamar("POST", "/painel/api/sair"); E.sair(); tela("entrar"); });
  $("pk-menu-btn").addEventListener("click", () => $("pk-app").classList.toggle("menu-aberto"));
  $("pk-fundo-menu").addEventListener("click", () => $("pk-app").classList.remove("menu-aberto"));
  window.addEventListener("beforeunload", (e) => { if (estado.dirty.size) { e.preventDefault(); e.returnValue = ""; } });
  iniciar();
})();
