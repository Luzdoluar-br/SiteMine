// Árvore de Talentos (habilidades/index.html): desenha a árvore que vem do bot, deixa montar um rascunho e confirma no servidor.
// Quem decide tudo é o servidor (pontos, custos, requisitos); aqui só se mostra e se pede. Texto entra por textContent, nunca HTML.
"use strict";

(() => {
  const { $, api, el, numero, sessao } = VULPUS;
  const IMAGEM_RAMO = { min: "cristal_lua", len: "bonsai_sakura", faz: "vaso_flores", com: "estatua_raposa", toca: "pelucia_kitsune" };
  const ERROS = {
    requisito: "Falta um pré-requisito.", sem_pontos: "Pontos insuficientes.", so_adiciona: "Para tirar talentos confirmados, use Redistribuir.",
    espera: "Ainda não dá para redistribuir.", muitos_pedidos: "Muitos pedidos seguidos. Espere um minuto.", pedido_invalido: "Pedido inválido.",
  };

  let arvore = null; // { ramos, nos, niveis_hab, marcos, ... }
  let conta = null; // resposta de /painel/api/talentos (null = sem login)
  let rascunho = {};
  let ramoAtivo = "min";
  let porId = {};
  let aberto = "";
  let enviando = false;

  // ------------------------------------------------------------------ contas
  const nivel = (esc, id) => esc[id] || 0;
  const custo = (esc) => Object.entries(esc).reduce((s, [id, n]) => s + (porId[id] ? porId[id].custos.slice(0, n).reduce((a, b) => a + b, 0) : 0), 0);
  const total = () => (conta ? conta.pontos.total : 0);
  const livres = () => total() - custo(rascunho);
  const confirmado = (id) => (conta ? nivel(conta.escolhas, id) : 0);
  const mudou = () => Object.keys(porId).some((id) => nivel(rascunho, id) !== confirmado(id));
  const requisitosOk = (no, esc = rascunho) => no.requer.every(([r, m]) => nivel(esc, r) >= m);
  const efeitoDe = (no, n) => no.efeito.replace("{v}", numero(no.valores[n - 1]));

  function podeMais(no) {
    const n = nivel(rascunho, no.id);
    if (!conta || n >= no.max || !requisitosOk(no)) return false;
    return livres() >= no.custos[n];
  }
  function motivoNao(no) {
    const n = nivel(rascunho, no.id);
    if (!conta) return "Entre com o Discord para escolher.";
    if (n >= no.max) return "Este talento já está no máximo.";
    if (!requisitosOk(no)) return "Pegue antes os pré-requisitos.";
    if (livres() < no.custos[n]) return `Faltam ${no.custos[n] - livres()} ponto(s). Suba o nível das habilidades no jogo.`;
    return "";
  }
  function podeMenos(no) {
    const n = nivel(rascunho, no.id);
    if (n <= confirmado(no.id)) return false;
    // ninguém do rascunho pode depender deste nível
    return arvore.nos.every((o) => nivel(rascunho, o.id) === 0 || o.requer.every(([r, m]) => r !== no.id || m <= n - 1));
  }

  // ------------------------------------------------------------------ Kiza
  function kiza(texto, humor = "feliz") {
    const img = $("kiza-rosto");
    img.src = `../img/humor-${humor}.webp`;
    img.classList.remove("pula");
    void img.offsetWidth;
    img.classList.add("pula");
    const b = $("kiza-fala");
    b.textContent = texto;
    b.style.animation = "none";
    void b.offsetWidth;
    b.style.animation = "";
  }
  function dica() {
    if (!conta) return kiza("Dá uma olhada na árvore. Para escolher, entra com o Discord ali embaixo.", "piscando");
    if (!conta.vinculado) return kiza("Liga sua conta do Minecraft primeiro. Os pontos vêm do jogo, eu só guardo aqui.", "lado");
    if (total() === 0) return kiza("Ainda sem pontos. Minera, corta árvore, colhe ou caça: cada nível de habilidade vale 1 ponto.", "normal");
    const l = livres();
    if (l <= 0) return kiza("Tudo gasto! Sobe mais um nível no jogo e volta aqui.", "feliz");
    const chaves = [["min_vein", "VeinMiner"], ["len_capitator", "Tree Capitator"], ["faz_colheita", "a colheita em área"]].filter(([id]) => !nivel(rascunho, id));
    if (chaves.length && l >= 2) return kiza(`Você tem ${l} ponto(s). Dica: ${chaves[0][1]} custa só 2 e muda o jogo.`, "piscando");
    kiza(`Você tem ${l} ponto(s) para usar. Pensa no que você mais faz no servidor.`, "feliz");
  }

  // ------------------------------------------------------------------ desenho
  function contar(alvo, valor) {
    const de = Number(alvo.dataset.v || 0);
    alvo.dataset.v = valor;
    if (de === valor || matchMedia("(prefers-reduced-motion: reduce)").matches) return void (alvo.textContent = numero(valor));
    const t0 = performance.now();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / 600);
      alvo.textContent = numero(Math.round(de + (valor - de) * (1 - (1 - k) ** 3)));
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    alvo.classList.remove("mudou");
    void alvo.offsetWidth;
    alvo.classList.add("mudou");
  }

  function desenharPontos() {
    const t = total(), g = custo(rascunho), l = Math.max(0, t - g);
    contar($("pt-livres"), l);
    $("pt-total").textContent = numero(t);
    $("pt-gastos").textContent = numero(g);
    $("anel").style.strokeDashoffset = String(326.7 * (1 - (t ? g / t : 0)));
  }

  function desenharHabilidades() {
    const alvo = $("tal-habs");
    alvo.replaceChildren();
    const cores = { min: "#7fd3ff", len: "#ffb661", faz: "#9be37a", com: "#ff8a7a", pvp: "#e7a6ff" };
    arvore.habilidades.forEach((h, i) => {
      const n = conta ? conta.niveis[h.id] || 0 : 0;
      const c = el("div", "hab");
      c.style.setProperty("--i", i);
      c.style.setProperty("--cor", cores[h.id]);
      const topo = el("div", "hab-topo");
      topo.append(el("b", "", h.nome), el("span", "nv", `Nv ${n}`));
      const barra = el("div", "barra");
      const enche = el("span");
      barra.append(enche);
      requestAnimationFrame(() => (enche.style.width = `${(n / arvore.nivel_max) * 100}%`));
      const pts = n + arvore.marcos.filter((m) => n >= m).length;
      c.append(topo, barra, el("span", "det", conta ? `${pts} ponto(s) de talento` : "entre para ver"));
      alvo.append(c);
    });
  }

  function cartaoNo(no, ramo) {
    const n = nivel(rascunho, no.id), c0 = confirmado(no.id);
    const b = el("button", "no");
    b.type = "button";
    b.dataset.id = no.id;
    b.style.setProperty("--cor", ramo.cor);
    if (n >= no.max) b.classList.add("cheio");
    if (n > 0) b.classList.add("tem");
    if (n > c0) b.classList.add("novo");
    if (podeMais(no)) b.classList.add("pode");
    else if (n === 0 && !requisitosOk(no)) b.classList.add("falta");
    const pips = el("span", "pips");
    for (let i = 1; i <= no.max; i++) pips.append(el("i", i <= c0 ? "on" : i <= n ? "novo" : ""));
    const prox = n < no.max ? `${no.custos[n]} ✦` : "máximo";
    b.append(el("span", "ic", no.emoji), el("span", "nm", no.nome), pips, el("span", "cst", prox));
    b.setAttribute("aria-label", `${no.nome}, nível ${n} de ${no.max}. ${n < no.max ? `Próximo custa ${no.custos[n]} pontos.` : "No máximo."}`);
    b.addEventListener("click", () => abrir(no.id));
    const mais = el("span", "mais", "+");
    mais.setAttribute("role", "button");
    mais.setAttribute("aria-label", `Adicionar um nível de ${no.nome}`);
    mais.addEventListener("click", (ev) => {
      ev.stopPropagation();
      adicionar(no.id);
    });
    b.append(mais);
    return b;
  }

  function desenharArvore() {
    const alvo = $("arvore");
    const fios = $("fios");
    alvo.replaceChildren(fios);
    const abas = $("tal-abas");
    abas.replaceChildren();
    arvore.ramos.forEach((ramo, i) => {
      const nos = arvore.nos.filter((n) => n.ramo === ramo.id);
      const sec = el("section", `ramo${ramo.id === ramoAtivo ? " ativo" : ""}`);
      sec.style.setProperty("--cor", ramo.cor);
      sec.style.setProperty("--i", i);
      sec.dataset.ramo = ramo.id;
      const topo = el("header", "ramo-topo");
      const img = el("img");
      img.src = `../img/decor/${IMAGEM_RAMO[ramo.id]}.png`;
      img.alt = "";
      img.width = 52;
      img.height = 52;
      const gasto = custo(Object.fromEntries(nos.map((n) => [n.id, nivel(rascunho, n.id)])));
      topo.append(img, el("h3", "", `${ramo.emoji} ${ramo.nome}`), el("p", "", ramo.lema), el("span", "gasto", `${gasto} ✦ investidos`));
      sec.append(topo);
      const linhas = [...new Set(nos.map((n) => n.linha))].sort((a, b) => a - b);
      for (const l of linhas) {
        const fileira = el("div", "fileira");
        for (const no of nos.filter((n) => n.linha === l)) fileira.append(cartaoNo(no, ramo));
        sec.append(fileira);
      }
      alvo.append(sec);
      const aba = el("button", "aba", `${ramo.emoji} ${ramo.nome}`);
      aba.type = "button";
      aba.setAttribute("role", "tab");
      aba.setAttribute("aria-selected", String(ramo.id === ramoAtivo));
      aba.addEventListener("click", () => {
        ramoAtivo = ramo.id;
        desenharTudo(false);
      });
      abas.append(aba);
    });
    requestAnimationFrame(desenharFios);
  }

  /** Linhas entre o pré-requisito e o talento (acesas quando o pré-requisito já está cumprido). */
  function desenharFios() {
    const svg = $("fios");
    const caixa = $("arvore").getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${caixa.width} ${caixa.height}`);
    const NS = "http://www.w3.org/2000/svg";
    svg.replaceChildren();
    for (const no of arvore.nos) {
      const b = document.querySelector(`.no[data-id="${no.id}"]`);
      if (!b || !b.offsetParent) continue;
      const rb = b.getBoundingClientRect();
      for (const [r, m] of no.requer) {
        const a = document.querySelector(`.no[data-id="${r}"]`);
        if (!a || !a.offsetParent) continue;
        const ra = a.getBoundingClientRect();
        const p = document.createElementNS(NS, "path");
        if (rb.left >= ra.right - 1) {
          // árvore deitada (computador): da direita do pré-requisito para a esquerda do talento
          const x1 = ra.right - caixa.left, y1 = ra.top + ra.height / 2 - caixa.top;
          const x2 = rb.left - caixa.left, y2 = rb.top + rb.height / 2 - caixa.top;
          const meio = (x1 + x2) / 2;
          p.setAttribute("d", `M${x1},${y1} C${meio},${y1} ${meio},${y2} ${x2},${y2}`);
        } else {
          // árvore em pé (celular): de baixo do pré-requisito para cima do talento
          const x1 = ra.left + ra.width / 2 - caixa.left, y1 = ra.bottom - caixa.top;
          const x2 = rb.left + rb.width / 2 - caixa.left, y2 = rb.top - caixa.top;
          const meio = (y1 + y2) / 2;
          p.setAttribute("d", `M${x1},${y1} C${x1},${meio} ${x2},${meio} ${x2},${y2}`);
        }
        if (nivel(rascunho, r) >= m) p.setAttribute("class", "aceso");
        p.style.setProperty("--cor", getComputedStyle(b).getPropertyValue("--cor"));
        svg.append(p);
      }
    }
  }

  function desenharTabelas() {
    const corpo = $("tab-ativos").tBodies[0];
    corpo.replaceChildren();
    const esc = conta ? conta.escolhas : {};
    for (const no of arvore.nos) {
      const n = nivel(esc, no.id);
      if (!n) continue;
      const tr = el("tr");
      tr.append(el("td", "", `${no.emoji} ${no.nome}`), el("td", "", `${n}/${no.max}`), el("td", "", efeitoDe(no, n)));
      corpo.append(tr);
    }
    $("ativos-vazio").hidden = corpo.children.length > 0;
    const tn = $("tab-niveis").tBodies[0];
    tn.replaceChildren();
    for (let n = 1; n <= arvore.nivel_max; n++) {
      const tr = el("tr");
      const extra = arvore.marcos.includes(n);
      tr.append(el("td", "", `Nível ${n}`), el("td", "", numero(arvore.niveis_hab[n])), el("td", extra ? "marco" : "", extra ? "+2 ✦" : "+1 ✦"));
      tn.append(tr);
    }
  }

  function desenharConfirmar() {
    const m = conta && mudou();
    $("confirma").hidden = !m;
    if (m) {
      const g = custo(rascunho) - custo(conta.escolhas);
      $("confirma-txt").textContent = `${g} ponto(s) escolhido(s) · sobra(m) ${livres()}`;
    }
    const r = $("redistribuir");
    r.disabled = !conta || !Object.keys(conta.escolhas).length || conta.redistribuir_em > 0;
    $("redist-texto").textContent = conta && conta.redistribuir_em > 0
      ? `Você já redistribuiu. A próxima fica liberada em ${new Date(conta.redistribuir_em * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.`
      : `Devolve todos os pontos para você escolher de novo. Grátis, uma vez a cada ${arvore.redistribuir_dias} dias.`;
  }

  function desenharTudo(comKiza = true) {
    desenharPontos();
    desenharHabilidades();
    desenharArvore();
    desenharTabelas();
    desenharConfirmar();
    if (aberto) preencherDetalhe(aberto);
    if (comKiza) dica();
  }

  // ------------------------------------------------------------------ detalhe
  function abrir(id) {
    aberto = id;
    preencherDetalhe(id);
    const d = $("detalhe");
    if (!d.open) d.showModal();
  }
  function preencherDetalhe(id) {
    const no = porId[id];
    const ramo = arvore.ramos.find((r) => r.id === no.ramo);
    const d = $("detalhe");
    d.style.setProperty("--cor", ramo.cor);
    $("d-emoji").textContent = no.emoji;
    $("d-ramo").textContent = `${ramo.nome} · nível ${nivel(rascunho, id)} de ${no.max}`;
    $("d-nome").textContent = no.nome;
    const corpo = $("d-niveis").tBodies[0];
    corpo.replaceChildren();
    for (let n = 1; n <= no.max; n++) {
      const tr = el("tr", n === nivel(rascunho, id) ? "atual" : "");
      tr.append(el("td", "", `${n}`), el("td", "", efeitoDe(no, n)), el("td", "", `${no.custos[n - 1]} ✦`));
      corpo.append(tr);
    }
    const req = $("d-req");
    req.replaceChildren();
    for (const [r, m] of no.requer) {
      const ok = nivel(rascunho, r) >= m;
      req.append(el("li", ok ? "ok" : "nao", `${ok ? "✓" : "✗"} Precisa de ${porId[r].nome} no nível ${m}`));
    }
    $("d-nota").textContent = no.nota || "";
    $("d-nota").hidden = !no.nota;
    $("d-msg").textContent = podeMais(no) ? "" : motivoNao(no);
    $("d-mais").disabled = !podeMais(no);
    $("d-mais").textContent = nivel(rascunho, id) < no.max ? `+ Adicionar nível (${no.custos[nivel(rascunho, id)]} ✦)` : "No máximo";
    $("d-menos").hidden = !podeMenos(no);
  }

  // ------------------------------------------------------------------ ações
  function faiscas(alvo, cor) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !alvo) return;
    const r = alvo.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const f = el("i", "faisca");
      const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 50;
      f.style.left = `${r.left + r.width / 2}px`;
      f.style.top = `${r.top + r.height / 2}px`;
      f.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
      f.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
      f.style.setProperty("--c", cor);
      document.body.append(f);
      setTimeout(() => f.remove(), 900);
    }
  }

  function adicionar(id) {
    const no = porId[id];
    if (!podeMais(no)) {
      aviso(motivoNao(no), true);
      return;
    }
    rascunho = { ...rascunho, [id]: nivel(rascunho, id) + 1 };
    desenharTudo(false);
    const b = document.querySelector(`.no[data-id="${id}"]`);
    if (b) {
      b.classList.add("estoura");
      faiscas(b, getComputedStyle(b).getPropertyValue("--cor"));
    }
    kiza(`${no.nome} no nível ${rascunho[id]}! Sobra(m) ${livres()}. Confirma lá embaixo quando terminar.`, "feliz");
  }

  function tirar(id) {
    const no = porId[id];
    if (!podeMenos(no)) return;
    const n = nivel(rascunho, id) - 1;
    rascunho = { ...rascunho };
    if (n > 0) rascunho[id] = n;
    else delete rascunho[id];
    desenharTudo(false);
  }

  let tempoAviso = 0;
  function aviso(texto, erro = false) {
    const t = $("toast");
    t.textContent = texto;
    t.className = `toast${erro ? " erro" : ""}`;
    t.hidden = false;
    clearTimeout(tempoAviso);
    tempoAviso = setTimeout(() => (t.hidden = true), 3200);
  }

  async function confirmar() {
    if (enviando || !conta || !mudou()) return;
    enviando = true;
    $("confirmar").disabled = true;
    const novos = Object.keys(rascunho).filter((id) => nivel(rascunho, id) > confirmado(id));
    try {
      const { r, d } = await api("/painel/api/talentos/salvar", { method: "POST", body: JSON.stringify({ escolhas: rascunho }) });
      if (r.status === 401) return sairDaConta();
      if (!d.ok) {
        if (d.pontos) {
          conta = d;
          rascunho = { ...d.escolhas };
        }
        aviso(ERROS[d.erro] || "Não deu certo. Tente de novo.", true);
        kiza("Opa, algo não bateu. Atualizei a árvore com o que vale agora.", "surpresa");
        return desenharTudo(false);
      }
      conta = d;
      rascunho = { ...d.escolhas };
      desenharTudo(false);
      for (const id of novos) {
        const b = document.querySelector(`.no[data-id="${id}"]`);
        if (b) faiscas(b, getComputedStyle(b).getPropertyValue("--cor"));
      }
      aviso("Talentos confirmados! Chegam no jogo em até um minuto.");
      kiza("Prontinho! Entra no servidor que em até um minuto já está valendo.", "piscando");
    } catch {
      aviso("Sem conexão com o servidor agora. Tente de novo.", true);
    } finally {
      enviando = false;
      $("confirmar").disabled = false;
    }
  }

  async function redistribuir() {
    if (!conta || !confirm("Devolver todos os pontos para escolher de novo? Isso só pode ser feito uma vez a cada 7 dias.")) return;
    const { r, d } = await api("/painel/api/talentos/redistribuir", { method: "POST" });
    if (r.status === 401) return sairDaConta();
    if (d.pontos) {
      conta = d;
      rascunho = { ...d.escolhas };
    }
    if (!d.ok) aviso(ERROS[d.erro] || "Não deu certo.", true);
    else {
      aviso("Pontos devolvidos. Escolha com calma!");
      kiza("Árvore zerada. Agora é escolher de novo, sem pressa.", "envergonhada");
    }
    desenharTudo(false);
  }

  function sairDaConta() {
    try {
      localStorage.removeItem("vulpus_sessao");
    } catch {
      // sem armazenamento
    }
    conta = null;
    rascunho = {};
    $("tal-entrar").hidden = false;
    desenharTudo();
  }

  // ------------------------------------------------------------------ início
  async function carregar() {
    try {
      const { r, d } = await api("/painel/api/publico/talentos");
      if (!r.ok || !d.ok) throw new Error();
      arvore = d;
      porId = Object.fromEntries(d.nos.map((n) => [n.id, n]));
    } catch {
      $("arvore").replaceChildren(el("p", "vazio-c", "Não consegui carregar a árvore agora. Tente de novo em instantes."));
      return kiza("O servidor não respondeu. Tenta de novo daqui a pouquinho?", "triste");
    }
    if (sessao()) {
      try {
        const { r, d } = await api("/painel/api/talentos");
        if (r.ok && d.ok) {
          conta = d;
          rascunho = { ...d.escolhas };
        }
      } catch {
        // sem conexão: mostra como visitante
      }
    }
    $("tal-entrar").hidden = !!conta;
    $("tal-vincular").hidden = !conta || conta.vinculado;
    desenharTudo();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("confirmar").addEventListener("click", confirmar);
    $("desfazer").addEventListener("click", () => {
      rascunho = conta ? { ...conta.escolhas } : {};
      desenharTudo(false);
      kiza("Desfeito. Nada mudou.", "normal");
    });
    $("redistribuir").addEventListener("click", redistribuir);
    $("d-mais").addEventListener("click", () => adicionar(aberto));
    $("d-menos").addEventListener("click", () => tirar(aberto));
    $("d-fechar").addEventListener("click", () => $("detalhe").close());
    $("detalhe").addEventListener("close", () => (aberto = ""));
    $("detalhe").addEventListener("click", (ev) => {
      if (ev.target === $("detalhe")) $("detalhe").close();
    });
    let redim = 0;
    addEventListener("resize", () => {
      cancelAnimationFrame(redim);
      redim = requestAnimationFrame(() => arvore && desenharFios());
    });
    addEventListener("beforeunload", (ev) => {
      if (conta && mudou()) ev.preventDefault();
    });
    carregar();
  });
})();
