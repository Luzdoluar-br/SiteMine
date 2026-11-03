// Comunidade: números ao vivo, busca de jogadores, quem está no topo, enquetes (com voto pelo site) e novidades.
"use strict";

(() => {
  const { $, api, el, numero, linhaRanking, post, vazio, linkPerfil, avatar, sessao } = VULPUS;

  async function resumo() {
    try {
      const { r, d } = await api("/painel/api/publico/resumo");
      if (!r.ok || !d.ok) throw new Error();
      $("online").textContent = d.servidor_online ? numero(d.online) : "–";
      $("online-rot").textContent = d.servidor_online ? (d.online === 1 ? "pessoa no servidor agora" : "pessoas no servidor agora") : "servidor fora do ar agora";
      $("ponto").classList.toggle("ligado", d.servidor_online);
      const nomes = $("online-nomes");
      nomes.replaceChildren(...d.online_nomes.map((n) => el("span", "", n)));
      $("membros").textContent = numero(d.membros);
      $("ligadas").textContent = numero(d.contas_ligadas);
      $("jogadores").textContent = numero(d.jogadores);
      for (const [tipo, alvo] of [["nivel", "top-nivel"], ["duelos", "top-duelos"], ["abates", "top-abates"]]) {
        const lista = d.destaques[tipo] || [];
        if (lista.length) $(alvo).replaceChildren(...lista.map(linhaRanking));
        else vazio($(alvo), tipo === "duelos" ? "Ninguém terminou a colocação ainda. Que tal ser o primeiro?" : "Ainda sem dados.");
      }
    } catch {
      for (const alvo of ["top-nivel", "top-duelos", "top-abates"]) vazio($(alvo), "Não consegui carregar agora.");
    }
  }

  // ---------------------------------------------------------------- busca
  let espera = 0;
  let ultimaBusca = "";
  async function buscar(q) {
    const alvo = $("resultados");
    if (q.length < 2) return alvo.replaceChildren();
    ultimaBusca = q;
    const { d } = await api(`/painel/api/publico/busca?q=${encodeURIComponent(q)}`);
    if (q !== ultimaBusca) return; // chegou resposta de uma busca antiga
    if (!d.ok || !d.itens.length) return vazio(alvo, "Ninguém com esse nome (ou o perfil é privado).");
    alvo.replaceChildren(
      ...d.itens.map((it) => {
        const a = el("a");
        a.href = linkPerfil(it);
        const txt = el("span");
        txt.append(el("strong", "", it.nome));
        if (it.nick && it.nick !== it.nome) txt.append(document.createTextNode(" "), el("small", "", `· ${it.nick}`));
        a.append(avatar(it.avatar, it.nome), txt);
        return a;
      }),
    );
  }

  // ---------------------------------------------------------------- enquetes
  async function enquetes() {
    const alvo = $("enquetes");
    try {
      const { d } = await api("/painel/api/publico/enquetes");
      if (!d.ok) throw new Error();
      $("enquetes-dica").textContent = !d.logado ? "Entre na sua conta para votar (só Kitsunes votam)." : d.pode_votar ? "Toque numa opção para votar. Dá para trocar até o fim." : "Só quem tem o selo Kitsune vota (regra do Discord).";
      const cartoes = [...d.abertas.map((e) => cartao(e, true, d)), ...d.encerradas.slice(0, 2).map((e) => cartao(e, false, d))];
      if (!cartoes.length) return vazio(alvo, "Nenhuma enquete no momento.");
      alvo.replaceChildren(...cartoes);
    } catch {
      vazio(alvo, "Não consegui carregar as enquetes agora.");
    }
  }

  function cartao(e, aberta, d) {
    const art = el("article", "enquete");
    art.append(el("h3", "", e.titulo));
    const meu = d.meus_votos[String(e.id)];
    const podeVotar = aberta && d.pode_votar;
    e.opcoes.forEach((o, i) => {
      const pct = e.total ? Math.round((o.votos / e.total) * 100) : 0;
      const op = el(podeVotar ? "button" : "div", "opcao" + (meu === i ? " minha" : ""));
      if (podeVotar) {
        op.type = "button";
        op.addEventListener("click", () => votar(e.id, i, art));
      }
      const enche = el("span", "enche");
      enche.style.width = `${pct}%`;
      op.append(enche, el("span", "rot", o.texto), el("span", "pct", `${pct}%`));
      art.append(op);
    });
    const fim = new Date(e.encerra_em * 1000);
    art.append(el("p", "rodape-e", `${e.total} voto(s) · ${aberta ? `encerra ${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às ${fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "encerrada"}`));
    return art;
  }

  async function votar(id, opcao, art) {
    for (const b of art.querySelectorAll("button")) b.disabled = true;
    const { d } = await api("/painel/api/enquetes/votar", { method: "POST", body: JSON.stringify({ id, opcao }) });
    if (!d.ok) {
      const msg = { so_kitsune: "Só quem tem o selo Kitsune vota.", encerrada: "Essa enquete já acabou.", sem_sessao: "Entre na sua conta para votar." }[d.erro] || "Não deu para votar agora.";
      art.append(el("p", "rodape-e", msg));
    }
    await enquetes();
  }

  // ---------------------------------------------------------------- novidades
  async function novidades() {
    const alvo = $("novidades");
    try {
      const { d } = await api("/painel/api/publico/mural");
      if (!d.ok) throw new Error();
      const itens = [...d.jogo.slice(0, 2).map((x) => post(x, "jogo")), ...d.transparencia.slice(0, 1).map((x) => post(x, "transp"))];
      if (!itens.length) return vazio(alvo, "Sem novidades por enquanto.");
      alvo.replaceChildren(...itens);
    } catch {
      vazio(alvo, "Não consegui carregar as novidades agora.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (sessao()) $("cta-conta").hidden = true;
    $("busca").addEventListener("input", (ev) => {
      clearTimeout(espera);
      const q = ev.target.value.trim();
      espera = setTimeout(() => buscar(q), 280);
    });
    resumo();
    enquetes();
    novidades();
    setInterval(resumo, 60000);
  });
})();
