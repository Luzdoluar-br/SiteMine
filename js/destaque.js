// Faixa "A comunidade está ao vivo" da página inicial: quem está online, o topo dos duelos e dos níveis e a última novidade.
// Usa VULPUS (js/comum.js). Sem resposta da API, a faixa continua lá com os links (só os números não aparecem).
"use strict";

(() => {
  function topo(alvo, itens, vazioTexto) {
    const { el, avatar } = VULPUS;
    if (!itens || !itens.length) return alvo.replaceChildren(el("li", "fc-vazio", vazioTexto));
    alvo.replaceChildren(
      ...itens.map((it) => {
        const li = el("li");
        li.append(avatar(it.avatar, it.nome), el("span", "nome", it.nome), el("span", "val", it.valor));
        return li;
      }),
    );
  }

  async function carregar() {
    if (typeof VULPUS === "undefined" || !document.getElementById("fcOnline")) return;
    const { $, api, el, numero } = VULPUS;
    try {
      const { r, d } = await api("/painel/api/publico/resumo");
      if (!r.ok || !d.ok) throw new Error();
      $("fcOnline").textContent = d.servidor_online ? numero(d.online) : "0";
      $("fcOnlineRot").textContent = d.servidor_online ? (d.online === 1 ? "pessoa jogando" : "pessoas jogando") : "servidor fora do ar";
      $("fcNicks").replaceChildren(...d.online_nomes.slice(0, 10).map((n) => el("span", "", n)));
      topo($("fcDuelos"), d.destaques.duelos, "Ninguém terminou a colocação ainda.");
      topo($("fcNivel"), d.destaques.nivel, "Ainda sem dados.");
      $("fcNovidade").textContent = d.novidade ? d.novidade.titulo.replace(/^\S+\s+Minecraft\s+·\s+[\d/]+:\s*/, "") : "Veja o mural de novidades.";
      $("fcEnquetes").textContent = d.enquetes_abertas ? `${d.enquetes_abertas} enquete(s) aberta(s) agora` : `${numero(d.membros)} membros no Discord`;
    } catch {
      $("fcNovidade").textContent = "Veja o mural de novidades.";
      for (const id of ["fcDuelos", "fcNivel"]) $(id).replaceChildren(el("li", "fc-vazio", "Abra a Comunidade para ver."));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    carregar();
    setInterval(carregar, 60000);
  });
})();
