// Componentes reutilizáveis do Painel da Kiza: avisos (toasts), confirmação, interruptor, campos e seletor com busca.
// Tudo que vem da API entra por textContent/value (nunca HTML). As cores dinâmicas usam style.setProperty (permitido pela política de conteúdo do site).
"use strict";

const PUI = (() => {
  const { el } = VULPUS;
  const NS = "http://www.w3.org/2000/svg";

  /** Ícone do sprite da página (ver os <symbol id="p-..."> no HTML). */
  function icone(nome, extra = "") {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("class", `i ${extra}`.trim());
    s.setAttribute("aria-hidden", "true");
    const u = document.createElementNS(NS, "use");
    u.setAttribute("href", `#${nome}`);
    s.append(u);
    return s;
  }

  // ------------------------------------------------------------------ avisos
  function toast(texto, tipo = "") {
    const caixa = document.getElementById("pk-toasts");
    if (!caixa) return;
    const t = el("div", `pk-toast ${tipo}`.trim(), texto);
    caixa.append(t);
    setTimeout(() => t.remove(), tipo === "erro" ? 7000 : 3800);
  }

  function confirmar({ titulo, texto, ok = "Confirmar", perigo = false }) {
    return new Promise((resolver) => {
      const fundo = el("div", "pk-modal-fundo");
      const m = el("div", "pk-modal");
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      const fechar = (r) => { fundo.remove(); document.removeEventListener("keydown", tecla); resolver(r); };
      const tecla = (e) => { if (e.key === "Escape") fechar(false); };
      const sim = el("button", `pk-btn ${perigo ? "pk-btn-perigo" : "pk-btn-primario"}`, ok);
      sim.type = "button";
      const nao = el("button", "pk-btn", "Cancelar");
      nao.type = "button";
      sim.addEventListener("click", () => fechar(true));
      nao.addEventListener("click", () => fechar(false));
      fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(false); });
      const acoes = el("div", "pk-acoes");
      acoes.append(nao, sim);
      m.append(el("h3", "", titulo), el("p", "", texto), acoes);
      fundo.append(m);
      document.body.append(fundo);
      document.addEventListener("keydown", tecla);
      nao.focus();
    });
  }

  /** Botão com estado de carregamento: roda `fn` e desativa o botão enquanto espera. */
  function comCarga(botao, fn) {
    botao.addEventListener("click", async () => {
      if (botao.classList.contains("carregando")) return;
      botao.classList.add("carregando");
      try { await fn(); } finally { botao.classList.remove("carregando"); }
    });
    return botao;
  }

  // ------------------------------------------------------------------ interruptor
  function interruptor({ marcado = false, aoMudar, rotulo = "", desabilitado = false }) {
    const l = el("label", "pk-switch");
    if (rotulo) l.setAttribute("aria-label", rotulo);
    const i = el("input");
    i.type = "checkbox";
    i.checked = marcado;
    i.disabled = desabilitado;
    i.addEventListener("change", () => aoMudar && aoMudar(i.checked));
    l.append(i, el("span"));
    l.entrada = i;
    return l;
  }

  // ------------------------------------------------------------------ campos
  function dicaTip(texto) {
    const i = el("span", "pk-i", "i");
    i.setAttribute("data-dica", texto);
    i.tabIndex = 0;
    return i;
  }

  /** Campo de texto (ou área). Devolve { raiz, entrada, valor(), erro(msg) }. */
  function campo({ rotulo, valor = "", placeholder = "", max = 0, dica = "", tip = "", area = false, tipo = "text", aoMudar, min, maxNum }) {
    const raiz = el("div", "pk-campo");
    const l = el("label", "", rotulo);
    if (tip) l.append(dicaTip(tip));
    const cont = el("span", "pk-contador");
    if (max) l.append(cont);
    const entrada = el(area ? "textarea" : "input", area ? "pk-area" : "pk-input");
    if (!area) entrada.type = tipo;
    if (tipo === "number") { if (min !== undefined) entrada.min = min; if (maxNum !== undefined) entrada.max = maxNum; }
    entrada.value = valor ?? "";
    entrada.placeholder = placeholder;
    if (max) entrada.maxLength = max + 200; // deixa passar para o contador mostrar o estouro; o servidor confere
    const id = `pk-c-${Math.random().toString(36).slice(2, 9)}`;
    entrada.id = id;
    l.htmlFor = id;
    const msgErro = el("p", "pk-erro-txt");
    msgErro.hidden = true;
    const atualizar = () => {
      if (max) { cont.textContent = `${entrada.value.length}/${max}`; cont.classList.toggle("estourou", entrada.value.length > max); }
    };
    entrada.addEventListener("input", () => { atualizar(); entrada.classList.remove("erro"); msgErro.hidden = true; if (aoMudar) aoMudar(entrada.value); });
    atualizar();
    raiz.append(l, entrada);
    if (dica) raiz.append(el("p", "pk-dica", dica));
    raiz.append(msgErro);
    return {
      raiz, entrada, valor: () => entrada.value,
      definir: (v) => { entrada.value = v ?? ""; atualizar(); },
      erro: (m) => { msgErro.textContent = m || ""; msgErro.hidden = !m; entrada.classList.toggle("erro", !!m); },
    };
  }

  // ------------------------------------------------------------------ seletor com busca
  /**
   * Seletor de verdade (canais, cargos, membros, embeds): lista os itens que a API devolveu, com busca.
   * itens: [{ valor, rotulo, sub, grupo, cor, hash, desabilitado }]. `buscar(q)`: busca remota (membros). Devolve { raiz, valor(), definir(v) }.
   * O ID manual fica como alternativa avançada (nunca é o caminho principal).
   */
  function seletor({ rotulo, tip = "", dica = "", valor = "", carregar, buscar = null, vazio = "Nada encontrado.", nenhum = "Nenhum", avancado = true, aoMudar }) {
    const raiz = el("div", "pk-campo");
    const l = el("label", "", rotulo);
    if (tip) l.append(dicaTip(tip));
    const caixa = el("div", "pk-select");
    const btn = el("button", "pk-select-btn");
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    const txt = el("span", "pk-sel-txt pk-sel-vazio", "Selecionar…");
    btn.append(txt, icone("p-seta"));
    const lista = el("div", "pk-select-lista");
    lista.hidden = true;
    const busca = el("div", "pk-select-busca");
    const campoBusca = el("input", "pk-input");
    campoBusca.type = "search";
    campoBusca.placeholder = buscar ? "Digite para buscar…" : "Pesquisar…";
    busca.append(campoBusca);
    const itensEl = el("div", "pk-select-itens");
    itensEl.setAttribute("role", "listbox");
    lista.append(busca, itensEl);
    caixa.append(btn, lista);

    let atual = String(valor || "");
    let itens = [];
    let carregado = false;
    const porValor = new Map();

    const rotuloDe = (v) => {
      if (!v) return "";
      const it = porValor.get(v);
      return it ? it.rotulo : `ID ${v}`;
    };
    const mostrar = () => {
      const r = rotuloDe(atual);
      txt.textContent = r || "Selecionar…";
      txt.classList.toggle("pk-sel-vazio", !r);
    };
    const escolher = (v) => {
      atual = v;
      mostrar();
      fechar();
      if (aoMudar) aoMudar(v);
    };
    const itemEl = (it) => {
      const b = el("button");
      b.type = "button";
      b.setAttribute("role", "option");
      b.disabled = !!it.desabilitado;
      if (it.cor) { const p = el("span", "pk-bolinha"); p.style.setProperty("background", it.cor); b.append(p); }
      else if (it.hash) b.append(el("span", "pk-hash", it.hash));
      b.append(el("span", "pk-sel-txt", it.rotulo));
      if (it.sub) b.append(el("small", "", it.sub));
      b.addEventListener("click", () => escolher(it.valor));
      return b;
    };
    const desenhar = (filtro = "") => {
      itensEl.replaceChildren();
      const f = filtro.trim().toLowerCase();
      const n = el("button");
      n.type = "button";
      n.append(el("span", "pk-sel-txt", nenhum));
      n.addEventListener("click", () => escolher(""));
      if (!f) itensEl.append(n);
      let grupo = null;
      let qtd = 0;
      for (const it of itens) {
        if (f && !`${it.rotulo} ${it.sub || ""} ${it.grupo || ""}`.toLowerCase().includes(f)) continue;
        if (it.grupo && it.grupo !== grupo) { grupo = it.grupo; itensEl.append(el("div", "pk-select-grupo", grupo)); }
        itensEl.append(itemEl(it));
        qtd += 1;
      }
      if (!qtd) itensEl.append(el("div", "pk-select-vazio", vazio));
    };
    const carregarItens = async () => {
      if (carregado || !carregar) return;
      itensEl.replaceChildren(el("div", "pk-select-vazio", "Carregando…"));
      try {
        itens = (await carregar()) || [];
        carregado = true;
        porValor.clear();
        for (const it of itens) porValor.set(String(it.valor), it);
        mostrar();
      } catch {
        itensEl.replaceChildren(el("div", "pk-select-vazio", "Não consegui carregar a lista."));
      }
    };
    let tBusca = null;
    campoBusca.addEventListener("input", () => {
      if (!buscar) return desenhar(campoBusca.value);
      clearTimeout(tBusca);
      tBusca = setTimeout(async () => {
        const q = campoBusca.value.trim();
        if (q.length < 2) { itens = []; return itensEl.replaceChildren(el("div", "pk-select-vazio", "Digite pelo menos 2 letras.")); }
        itensEl.replaceChildren(el("div", "pk-select-vazio", "Buscando…"));
        try {
          itens = (await buscar(q)) || [];
          for (const it of itens) porValor.set(String(it.valor), it);
          desenhar("");
        } catch { itensEl.replaceChildren(el("div", "pk-select-vazio", "A busca falhou. Tente de novo.")); }
      }, 300);
    });
    const fora = (e) => { if (!caixa.contains(e.target)) fechar(); };
    const tecla = (e) => { if (e.key === "Escape") { fechar(); btn.focus(); } };
    function abrir() {
      lista.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      document.addEventListener("mousedown", fora);
      document.addEventListener("keydown", tecla);
      campoBusca.value = "";
      if (buscar) itensEl.replaceChildren(el("div", "pk-select-vazio", "Digite pelo menos 2 letras para buscar."));
      else carregarItens().then(() => desenhar(""));
      campoBusca.focus();
    }
    function fechar() {
      lista.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    }
    btn.addEventListener("click", () => (lista.hidden ? abrir() : fechar()));

    raiz.append(l, caixa);
    // o rótulo do valor salvo aparece sem precisar abrir: carrega a lista em segundo plano (menos nos seletores de busca remota)
    if (carregar && !buscar) carregarItens().then(mostrar);
    else mostrar();

    // ID manual: alternativa avançada
    let manual = null;
    if (avancado) {
      const alt = el("button", "pk-avancado", "Avançado: digitar o ID");
      alt.type = "button";
      manual = el("input", "pk-input");
      manual.hidden = true;
      manual.placeholder = "Cole o ID numérico";
      manual.inputMode = "numeric";
      alt.addEventListener("click", () => { manual.hidden = !manual.hidden; if (!manual.hidden) { manual.value = atual; manual.focus(); } });
      manual.addEventListener("change", () => {
        const v = manual.value.trim();
        if (v === "" || /^\d{5,25}$/.test(v)) escolher(v);
        else toast("O ID tem só números (de 5 a 25 dígitos).", "erro");
      });
      raiz.append(alt, manual);
    }
    if (dica) raiz.append(el("p", "pk-dica", dica));
    return { raiz, valor: () => atual, definir: (v) => { atual = String(v || ""); mostrar(); } };
  }

  return { icone, toast, confirmar, comCarga, interruptor, campo, seletor, dicaTip };
})();
