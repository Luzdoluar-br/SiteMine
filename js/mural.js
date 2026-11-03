// Mural: novidades do Minecraft, da Kiza e transparências da equipe, com filtro.
"use strict";

(() => {
  const { $, api, post, vazio } = VULPUS;
  let dados = null;
  let filtro = "tudo";

  function desenhar() {
    const alvo = $("mural");
    if (!dados) return;
    const itens = [];
    if (filtro === "tudo" || filtro === "jogo") itens.push(...dados.jogo.map((x) => post(x, "jogo")));
    if (filtro === "tudo" || filtro === "transp") itens.push(...dados.transparencia.map((x) => post(x, "transp")));
    if (filtro === "tudo" || filtro === "bot") itens.push(...dados.bot.map((x) => post(x, "bot")));
    if (!itens.length) return vazio(alvo, filtro === "transp" ? "Nenhuma transparência publicada ainda." : "Nada por aqui ainda.");
    alvo.replaceChildren(...itens);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    for (const b of document.querySelectorAll(".aba")) {
      b.addEventListener("click", () => {
        filtro = b.dataset.filtro;
        for (const o of document.querySelectorAll(".aba")) o.setAttribute("aria-selected", String(o === b));
        desenhar();
      });
    }
    try {
      const { d } = await api("/painel/api/publico/mural");
      if (!d.ok) throw new Error();
      dados = d;
      desenhar();
    } catch {
      vazio($("mural"), "Não consegui carregar o mural agora. Tente de novo em instantes.");
    }
  });
})();
