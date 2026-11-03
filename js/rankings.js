// Rankings: abas por tipo (nível, tempo de jogo, maior sessão, call, duelos, abates), com link direto (?tipo=).
"use strict";

(() => {
  const { $, api, el, linhaRanking, vazio } = VULPUS;
  const EXPLICA = {
    nivel: "Nível da Kiza: XP ganho conversando, jogando e participando no Discord e no Minecraft.",
    tempo: "Tempo total no servidor de Minecraft.",
    sessao: "A maior sessão seguida no servidor de Minecraft.",
    call: "Tempo em salas de voz do Discord (com gente junto e sem estar mutado de som).",
    duelos: "ELO do rankeado da temporada (Atividades › Duelos). Aparece quem terminou as 5 partidas de colocação.",
    abates: "Vitórias contra outros jogadores no mundo. Minigames e duelos não contam; a mesma dupla vale no máximo 3 vezes por hora.",
  };
  const ORDEM = ["nivel", "tempo", "sessao", "call", "duelos", "abates"];
  const ROTULO = { nivel: "Nível", tempo: "Tempo de jogo", sessao: "Maior sessão", call: "Call", duelos: "Duelos", abates: "Abates PvP" };
  let atual = new URLSearchParams(location.search).get("tipo") || "nivel";
  if (!ORDEM.includes(atual)) atual = "nivel";

  function abas() {
    const alvo = $("abas");
    alvo.replaceChildren(
      ...ORDEM.map((t) => {
        const b = el("button", "aba", ROTULO[t]);
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", String(t === atual));
        b.addEventListener("click", () => {
          atual = t;
          history.replaceState(null, "", `?tipo=${t}`);
          abas();
          carregar();
        });
        return b;
      }),
    );
  }

  async function carregar() {
    const lista = $("lista");
    $("titulo-rank").textContent = ROTULO[atual];
    $("explica").textContent = EXPLICA[atual];
    lista.replaceChildren(el("div", "esqueleto"), el("div", "esqueleto"), el("div", "esqueleto"));
    try {
      const { d } = await api(`/painel/api/publico/rankings?tipo=${atual}`);
      if (!d.ok) throw new Error();
      if (!d.itens.length) return vazio(lista, "Ainda não há ninguém neste ranking.");
      lista.replaceChildren(...d.itens.map(linhaRanking));
    } catch {
      vazio(lista, "Não consegui carregar o ranking agora. Tente de novo em instantes.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    abas();
    carregar();
  });
})();
