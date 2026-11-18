// Plataforma: a única parte ao vivo é a lista de clãs (vem de /site/resumo, a rota pública do bot). Sem resposta, a lista diz isso.
"use strict";

(() => {
  const { $, api, el, numero } = VULPUS;

  async function clas() {
    const lista = $("clasLista");
    try {
      const { r, d } = await api("/site/resumo");
      if (!r.ok || !d.ok || !d.clas) throw new Error("sem dados");
      $("clasN").textContent = numero(d.clas.ativos);
      $("clasResumo").hidden = false;
      if (d.clas.guerras > 0) {
        $("clasGuerrasN").textContent = numero(d.clas.guerras);
        $("clasGuerras").hidden = false;
      }
      if (!d.clas.top.length) return lista.replaceChildren(el("li", "fc-vazio", "Nenhum clã ainda."));
      lista.replaceChildren(
        ...d.clas.top.slice(0, 6).map((c) => {
          const li = el("li");
          li.append(el("span", "tag", c.tag), el("span", "nome", c.nome), el("span", "mbr", `${c.membros} ${c.membros === 1 ? "membro" : "membros"}`), el("span", "nv", `nível ${c.nivel}`));
          return li;
        }),
      );
    } catch {
      lista.replaceChildren(el("li", "fc-vazio", "Não consegui carregar os clãs agora."));
    }
  }

  document.addEventListener("DOMContentLoaded", clas);
})();
