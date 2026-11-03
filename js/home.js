// Home de painéis (home/index.html): os atalhos do site com números ao vivo e, para quem está logado, o nome e os pontos de talento.
// Usa VULPUS (js/comum.js). Sem resposta da API os atalhos continuam funcionando (só os números não aparecem).
"use strict";

(() => {
  const { $, api, numero, sessao } = VULPUS;

  async function publico() {
    try {
      const { r, d } = await api("/painel/api/publico/resumo");
      if (!r.ok || !d.ok) return;
      $("h-online").textContent = d.servidor_online ? numero(d.online) : "0";
      $("h-online-rot").textContent = d.servidor_online ? (d.online === 1 ? "jogando agora" : "jogando agora") : "servidor fora do ar";
      $("h-ponto").classList.toggle("ligado", !!d.servidor_online && d.online > 0);
      $("h-membros").textContent = numero(d.membros);
      if (d.servidor_online && d.online_nomes.length) $("h-com").textContent = `Agora: ${d.online_nomes.slice(0, 4).join(", ")}${d.online > 4 ? ` e mais ${d.online - 4}` : ""}.`;
      const top = d.destaques && d.destaques.nivel && d.destaques.nivel[0];
      if (top) $("h-rank").textContent = `No topo do nível: ${top.nome} (${top.valor}).`;
      if (d.novidade) $("h-mural").textContent = `Última: ${d.novidade.titulo.replace(/^\S+\s+Minecraft\s+·\s+[\d/]+:\s*/, "")}`;
    } catch {
      // sem conexão
    }
  }

  async function pessoal() {
    if (!sessao()) return;
    try {
      const [eu, tal] = await Promise.all([api("/painel/api/eu"), api("/painel/api/talentos")]);
      if (eu.r.ok && eu.d.ok) {
        const u = eu.d.usuario;
        $("h-av").src = u.avatar || "../img/avatar-kiza.webp";
        $("h-titulo").replaceChildren(document.createTextNode(`Oi, ${u.nome.split(" ")[0]}. `), Object.assign(document.createElement("em"), { textContent: "Bora?" }));
        $("h-sub").textContent = `${eu.d.perfil.rank} · nível ${eu.d.perfil.nivel}${eu.d.minecraft.vinculado ? ` · no jogo como ${eu.d.minecraft.nick}` : ""}`;
        $("h-conta").textContent = `${numero(eu.d.perfil.caudas)} Caudas · nível ${eu.d.perfil.nivel}. Histórico e privacidade.`;
      }
      if (tal.r.ok && tal.d.ok && tal.d.pontos.livres > 0) {
        $("h-pontos").textContent = `✦ ${tal.d.pontos.livres} ponto(s) para usar`;
        $("h-pontos").hidden = false;
      }
    } catch {
      // sem conexão
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    publico();
    pessoal();
    setInterval(publico, 60000);
  });
})();
