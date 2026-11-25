// Página inicial: números ao vivo (herói e "agora na toca") e as últimas novidades do mural. Tudo vem da API do bot; sem resposta,
// os textos de carregamento viram avisos honestos e o resto da página continua inteiro.
"use strict";

(() => {
  const { $, api, el, numero, post, vazio, semEmoji } = VULPUS;

  function listaTop(alvo, itens, vazioTexto) {
    if (!itens || !itens.length) return alvo.replaceChildren(el("li", "fc-vazio", vazioTexto));
    alvo.replaceChildren(
      ...itens.slice(0, 5).map((it) => {
        const li = el("li");
        li.append(el("span", "nome", it.nome), el("span", "val", it.valor));
        return li;
      }),
    );
  }

  async function resumo() {
    try {
      const { r, d } = await api("/painel/api/publico/resumo");
      if (!r.ok || !d.ok) throw new Error("sem dados");
      const no = d.servidor_online;
      // herói
      $("hOnline").textContent = no ? `${numero(d.online)}/${numero(d.maximo || 12)}` : "0/12";
      $("hOnlineRot").textContent = no ? "players jogando" : "(servidor fora do ar)";
      $("hPonto").classList.toggle("ligado", no && d.online > 0);
      $("hMembros").textContent = numero(d.membros);
      // agora na toca
      $("fcOnline").textContent = no ? `${numero(d.online)}/${numero(d.maximo || 12)}` : "0/12";
      $("fcOnlineRot").textContent = no ? "players jogando agora" : "servidor fora do ar agora";
      $("fcNicks").replaceChildren(...d.online_nomes.slice(0, 12).map((n) => el("li", "", n)));
      listaTop($("fcNivel"), d.destaques.nivel, "Ainda sem dados.");
      listaTop($("fcDuelos"), d.destaques.duelos, "Ninguém terminou a colocação ainda.");
      $("fcEnquetes").textContent = d.enquetes_abertas ? `${d.enquetes_abertas} enquete(s) aberta(s) agora na comunidade.` : "";
    } catch {
      $("hOnline").textContent = "–";
      $("hMembros").textContent = "–";
      $("fcOnline").textContent = "–";
      $("fcOnlineRot").textContent = "dados indisponíveis agora";
      for (const id of ["fcNivel", "fcDuelos"]) $(id).replaceChildren(el("li", "fc-vazio", "Não consegui carregar agora."));
    }
  }

  async function novidades() {
    const alvo = $("novidades");
    try {
      const { d } = await api("/painel/api/publico/mural");
      if (!d.ok) throw new Error();
      const itens = d.jogo.slice(0, 3).map((x) => post(x, "jogo"));
      if (!itens.length) return vazio(alvo, "Sem novidades por enquanto.");
      alvo.replaceChildren(...itens);
    } catch {
      vazio(alvo, "Não consegui carregar as novidades agora.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    resumo();
    novidades();
    setInterval(() => {
      if (!document.hidden) resumo();
    }, 60000);
  });
  void semEmoji;
})();
