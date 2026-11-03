// Perfil público: jogador/?id=<Discord> ou jogador/?nick=<nick do jogo>. Perfil privado não mostra nada.
"use strict";

(() => {
  const { $, api, el, numero, duracao, data } = VULPUS;
  const ROTULO = { nivel: "Nível", tempo: "Tempo de jogo", sessao: "Maior sessão", call: "Call", duelos: "Duelos", abates: "Abates" };

  function erro(titulo, texto) {
    $("perfil-carregando").hidden = true;
    $("erro-titulo").textContent = titulo;
    $("erro-texto").textContent = texto;
    $("perfil-erro").hidden = false;
  }

  function preencher(p) {
    document.title = `VULPUS · ${p.nome}`;
    $("p-foto").src = p.avatar || "../img/avatar-kiza.webp";
    $("p-nome").textContent = p.nome;
    $("p-nick").textContent = p.minecraft && p.minecraft.nick && p.minecraft.nick !== p.nome ? `no jogo: ${p.minecraft.nick}` : "";
    const et = $("p-etiquetas");
    et.replaceChildren();
    const etiqueta = (t, fogo) => el("span", "etiqueta" + (fogo ? " fogo-et" : ""), t);
    if (p.nivel) et.append(etiqueta(`${p.nivel.emoji} ${p.nivel.rank}`, true));
    if (p.kitsune) et.append(etiqueta("🦊 Kitsune", true));
    if (p.equipe) et.append(etiqueta(`Equipe: ${p.equipe}`));
    if (p.duelos) et.append(etiqueta(`⚔️ ${p.duelos.divisao}`));

    const pos = $("p-posicoes");
    pos.replaceChildren(
      ...Object.entries(p.posicoes || {}).map(([tipo, n]) => {
        const a = el("a", "", `#${n} em ${ROTULO[tipo] || tipo}`);
        a.href = `../rankings/?tipo=${tipo}`;
        return a;
      }),
    );

    if (p.nivel) {
      $("c-nivel").hidden = false;
      $("p-nivel").textContent = `Nv ${p.nivel.nivel}`;
      $("p-rank").textContent = p.nivel.rank;
      $("p-xp").textContent = numero(p.nivel.xp);
      $("p-call").textContent = duracao(p.call_s || 0);
      $("p-barra").style.width = `${Math.min(100, (p.nivel.no_nivel / Math.max(1, p.nivel.proximo)) * 100)}%`;
    }
    if (p.minecraft) {
      $("c-mc").hidden = false;
      $("p-tempo").textContent = duracao(p.minecraft.tempo_total_s);
      $("p-sessao").textContent = duracao(p.minecraft.maior_sessao_s);
    }
    if (p.duelos) {
      $("c-duelos").hidden = false;
      $("p-elo").textContent = numero(p.duelos.elo);
      $("p-div").textContent = p.duelos.divisao;
      $("p-vd").textContent = `${p.duelos.v} / ${p.duelos.d}`;
    }
    if (p.abates) {
      $("c-pvp").hidden = false;
      $("p-kills").textContent = numero(p.abates.kills);
      $("p-mortes").textContent = numero(p.abates.mortes);
    }
    $("p-desde").textContent = p.desde ? `Na VULPUS desde ${data(p.desde)}.` : "";
    $("perfil-carregando").hidden = true;
    $("perfil").hidden = false;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const q = new URLSearchParams(location.search);
    const id = (q.get("id") || "").replace(/\D/g, "");
    const nick = (q.get("nick") || "").trim().slice(0, 40);
    if (!id && nick.length < 2) return erro("Qual jogador?", "Procure alguém na página da Comunidade.");
    $("copiar").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        $("copiar").textContent = "Link copiado!";
      } catch {
        $("copiar").textContent = location.href;
      }
    });
    try {
      const { r, d } = await api(`/painel/api/publico/jogador?${id ? `id=${id}` : `nick=${encodeURIComponent(nick)}`}`);
      if (r.ok && d.ok) return preencher(d);
      if (d.erro === "privado") return erro("Perfil privado", "Esta pessoa preferiu deixar o perfil só para ela. Respeitamos.");
      erro("Não encontrei esse jogador", "Confira o nome ou procure na página da Comunidade.");
    } catch {
      erro("Não consegui carregar agora", "Tente de novo em instantes.");
    }
  });
})();
