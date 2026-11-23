// Painel da Kiza (/kiza/painel/): escolhe o servidor, liga/desliga as funções (todas começam desligadas), ajusta os valores e cola a chave de IA.
// Tudo que vem da API entra por textContent/value (nunca HTML). As regras de verdade (permissão ao vivo, limites, o que está disponível) são do servidor.
"use strict";

(() => {
  const { $, el } = VULPUS;
  const E = ENTRADA;
  let gid = "";
  let equipe = false;

  const mostrar = (qual) => {
    for (const id of ["k-carregando", "k-entrar", "k-lista", "k-servidor"]) $(id).hidden = id !== qual;
    window.scrollTo({ top: 0 });
  };
  const aviso = (t, erro = false) => {
    const a = $("k-msg");
    a.hidden = !t;
    a.textContent = t || "";
    a.classList.toggle("erro", !!erro);
  };
  const dataHora = (s) => new Date(s * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const q = (g) => encodeURIComponent(g);

  async function listar() {
    const { r, d } = await E.chamar("GET", "/painel/api/kiza/servidores");
    if (r.status === 401) return mostrar("k-entrar");
    if (!r.ok) {
      mostrar("k-carregando");
      $("k-carregando").querySelector("p").textContent = d.mensagem || "Não consegui abrir o painel agora.";
      return;
    }
    equipe = !!d.equipe;
    const ul = $("k-servidores");
    ul.replaceChildren();
    for (const s of d.servidores) {
      const li = el("li");
      const b = el("button", "botao botao-fio", s.nome + (s.kiza_presente ? "" : " (a Kiza não está aqui)"));
      b.type = "button";
      b.addEventListener("click", () => abrir(s));
      li.append(b);
      ul.append(li);
    }
    $("k-vazio").hidden = d.servidores.length > 0;
    mostrar("k-lista");
  }

  // ------------------------------------------------------------------ servidor
  async function abrir(s) {
    gid = s.guild_id;
    $("k-nome").textContent = s.nome;
    $("k-equipe").hidden = !(equipe && s.casa);
    aviso("");
    mostrar("k-servidor");
    await Promise.all([modulos(), ia(), auditoria()]);
  }

  function campo(m, nome, c, valor, entradas) {
    const rot = el("label", "campo");
    rot.append(el("span", "", nome.replace(/_/g, " ")));
    const i = el("input");
    i.type = c.tipo === "int" ? "number" : "text";
    if (c.tipo === "int") { i.min = c.min; i.max = c.max; }
    i.value = valor ?? c.padrao ?? "";
    if (c.tipo === "canal" || c.tipo === "cargo") i.placeholder = "id (número) — copie no Discord";
    entradas[nome] = i;
    rot.append(i);
    return rot;
  }

  async function modulos() {
    const { r, d } = await E.chamar("GET", `/painel/api/kiza/modulos?guild_id=${q(gid)}`);
    const alvo = $("k-modulos");
    alvo.replaceChildren();
    if (!r.ok) return aviso(d.mensagem || "Não consegui abrir as funções.", true);
    for (const m of d.modulos) {
      if (m.chave === "ia_propria") continue; // tem a seção própria logo abaixo
      const caixa = el("div", "grupo");
      caixa.append(el("h3", "", m.nome), el("p", "pequeno", m.aviso));
      if (!m.disponivel) {
        caixa.append(el("p", "dica", "Em breve."));
        alvo.append(caixa);
        continue;
      }
      const entradas = {};
      for (const [nome, c] of Object.entries(m.campos)) caixa.append(campo(m, nome, c, m.config[nome], entradas));
      const chave = el("label", "campo");
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = m.ligada;
      chave.append(cb, el("span", "", m.ligada ? "Ligada" : "Desligada (padrão)"));
      const salvar = el("button", "botao botao-pequeno", "Salvar");
      salvar.type = "button";
      salvar.addEventListener("click", async () => {
        const config = {};
        for (const [nome, i] of Object.entries(entradas)) config[nome] = i.value;
        const { r: r2, d: d2 } = await E.chamar("PUT", "/painel/api/kiza/modulos", { guild_id: gid, chave: m.chave, ligada: cb.checked, config });
        if (r2.ok) { aviso(`${m.nome}: salvo.`); await Promise.all([modulos(), auditoria()]); }
        else aviso(d2.mensagem || Object.values(d2.erros || {}).join(" ") || "Não consegui salvar.", true);
      });
      caixa.append(chave, salvar);
      alvo.append(caixa);
    }
  }

  // ------------------------------------------------------------------ chave de IA própria
  async function ia() {
    const { r, d } = await E.chamar("GET", `/painel/api/kiza/ia?guild_id=${q(gid)}`);
    const alvo = $("k-ia");
    alvo.replaceChildren();
    if (!r.ok) return alvo.append(el("p", "dica", d.mensagem || "Não consegui abrir esta parte."));
    alvo.append(
      el("p", "pequeno", "Opcional. Sem chave, a Kiza usa só as respostas prontas (grátis). Com a sua chave da Anthropic, o gasto é seu e você define os limites. A chave fica cifrada e nunca volta para esta tela; nunca cole chave no chat do Discord."),
      el("p", "pequeno", d.aviso),
    );
    alvo.append(guiaProvedores());
    if (!d.cofre_disponivel) {
      alvo.append(el("p", "aviso", "O cofre de chaves ainda não está ativo no servidor da Kiza. Fale com a equipe da Vulpus."));
      return;
    }
    if (d.tem_chave) {
      alvo.append(el("p", "", `Chave guardada (termina em ${d.ultimos4}) · estado: ${d.estado}`));
      alvo.append(el("p", "pequeno", `Gasto estimado no mês: ${(d.gasto_mes_centavos / 100).toFixed(4)} US$ de ${(d.limite_mes_centavos / 100).toFixed(2)} US$ · ${d.respostas_mes} respostas · máximo ${d.max_pessoa_dia} por pessoa por dia`));
    }
    const campoChave = el("input");
    campoChave.type = "password";
    campoChave.autocomplete = "off";
    campoChave.placeholder = "sk-ant-...";
    const testar = el("button", "botao botao-pequeno", d.tem_chave ? "Trocar a chave (testar e salvar)" : "Testar e salvar");
    testar.type = "button";
    testar.addEventListener("click", async () => {
      testar.disabled = true;
      aviso("Testando a chave…");
      const { r: r2, d: d2 } = await E.chamar("PUT", "/painel/api/kiza/ia/chave", { guild_id: gid, chave: campoChave.value });
      campoChave.value = "";
      testar.disabled = false;
      aviso(d2.mensagem || (r2.ok ? "Chave guardada." : "Não consegui."), !r2.ok);
      await Promise.all([ia(), auditoria()]);
    });
    alvo.append(campoChave, testar);
    if (d.tem_chave) {
      const lig = el("button", "botao botao-pequeno botao-fio", "Ligar o modo IA");
      lig.type = "button";
      lig.addEventListener("click", async () => {
        const { r: r2, d: d2 } = await E.chamar("PUT", "/painel/api/kiza/modulos", { guild_id: gid, chave: "ia_propria", ligada: true });
        aviso(r2.ok ? "Modo IA ligado." : d2.mensagem || "Não consegui ligar.", !r2.ok);
        await auditoria();
      });
      const apagar = el("button", "botao botao-pequeno botao-fio perigo-bt", "Apagar a chave");
      apagar.type = "button";
      apagar.addEventListener("click", async () => {
        const { r: r2, d: d2 } = await E.chamar("DELETE", `/painel/api/kiza/ia/chave?guild_id=${q(gid)}`);
        aviso(d2.mensagem || (r2.ok ? "Chave apagada." : "Não consegui."), !r2.ok);
        await Promise.all([ia(), auditoria()]);
      });
      alvo.append(lig, apagar);
    }
  }

  // guia de escolha da IA: palpites honestos, sem prometer preço (planos e preços mudam: conferir sempre no site do provedor)
  function guiaProvedores() {
    const caixa = el("div", "grupo");
    caixa.append(el("h3", "", "1 · Escolher a IA"));
    caixa.append(el("p", "pequeno", "Preços, planos gratuitos e regras de privacidade mudam. Confira sempre no site do provedor antes de colar a chave."));
    const cartoes = [
      ["Anthropic (Claude)", "Disponível agora. Melhor conversa em português e o modelo pequeno é barato por resposta. Paga por uso, na conta de API (não é a assinatura do chat). Recomendada.", "https://console.anthropic.com/"],
      ["OpenAI (ChatGPT)", "Em breve. Atenção: a assinatura do ChatGPT NÃO gera chave de API; a chave vem de uma conta de API cobrada por uso.", ""],
      ["Google Gemini", "Em breve. Tem plano gratuito com limites que mudam; no plano gratuito o Google pode usar as mensagens para treinar modelos (confira o texto atual). Evite em servidor com muita gente.", ""],
      ["Groq (modelos abertos)", "Em breve. Plano gratuito e rápida, mas costuma perder o personagem e a conversa fica fraca.", ""],
    ];
    for (const [nome, texto, url] of cartoes) {
      const c = el("div", "grupo");
      c.append(el("h4", "", nome), el("p", "pequeno", texto));
      if (url) { const a = el("a", "link-seta", "Abrir o site do provedor"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; c.append(a); }
      caixa.append(c);
    }
    caixa.append(el("h3", "", "2 · Pegar a chave"), el("p", "pequeno", "No site do provedor, crie uma chave de API e copie. Coloque um limite de gasto lá também."));
    caixa.append(el("h3", "", "3 · Colar e testar"), el("p", "pequeno", "Cole abaixo e use \"Testar e salvar\". A Kiza faz uma chamada mínima para conferir; depois a chave fica cifrada e nunca mais aparece."));
    return caixa;
  }

  async function auditoria() {
    const { r, d } = await E.chamar("GET", `/painel/api/kiza/auditoria?guild_id=${q(gid)}`);
    const ul = $("k-aud");
    ul.replaceChildren();
    if (!r.ok) return;
    if (!d.registros.length) ul.append(el("li", "", "Nada mudou ainda."));
    for (const x of d.registros) ul.append(el("li", "", `${dataHora(x.quando)} · ${x.chave} · por ${x.quem === "0" ? "a Kiza (automático)" : x.quem}`));
  }

  async function saude() {
    const { r, d } = await E.chamar("GET", "/painel/api/kiza/equipe/saude");
    $("k-saude").textContent = r.ok ? JSON.stringify(d, null, 2) : d.mensagem || "Não consegui.";
  }

  // ------------------------------------------------------------------ ligações
  $("k-entrar-bt").addEventListener("click", () => E.entrar("kiza/painel"));
  $("k-sair").addEventListener("click", () => { E.chamar("POST", "/painel/api/sair"); E.sair(); mostrar("k-entrar"); });
  $("k-voltar").addEventListener("click", () => listar());
  $("k-saude-bt").addEventListener("click", saude);

  (function iniciar() {
    const volta = E.receberLogin("../../");
    if (volta === "indo") return;
    if (volta === "erro") {
      mostrar("k-entrar");
      $("k-aviso").hidden = false;
      $("k-aviso").textContent = "O login expirou ou foi interrompido. Tente de novo.";
      return;
    }
    if (!E.tem()) return mostrar("k-entrar");
    listar();
  })();
})();
