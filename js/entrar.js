// /entrar/: monta o link minecraft://?addExternalServer=NOME|IP:PORTA, mostra os dados na tela e tenta abrir o jogo sozinho.
// ?s=alt usa o servidor alternativo. Os endereços vêm do HTML (src/config.json), não ficam escritos aqui.
"use strict";

(() => {
  const caixa = document.getElementById("abrirCaixa");
  if (!caixa) return;
  const d = caixa.dataset;
  const servidores = {
    principal: { nome: d.nomePrincipal, ip: d.ipPrincipal, porta: d.portaPrincipal, rotulo: "Servidor principal" },
    alt: { nome: d.nomeAlt, ip: d.ipAlt, porta: d.portaAlt, rotulo: "Servidor alternativo" },
  };
  const escolha = new URLSearchParams(location.search).get("s") === "alt" ? "alt" : "principal";
  const outro = escolha === "alt" ? "principal" : "alt";
  const s = servidores[escolha];
  const link = `minecraft://?addExternalServer=${s.nome}|${s.ip}:${s.porta}`;
  document.getElementById("abrir").href = link;
  document.getElementById("abrirIp").textContent = s.ip;
  document.getElementById("abrirPorta").textContent = s.porta;
  document.getElementById("abrirRotulo").textContent = s.rotulo;
  const trocar = document.getElementById("abrirTrocar");
  trocar.textContent = `Usar o ${servidores[outro].rotulo.toLowerCase()} (${servidores[outro].ip})`;
  trocar.href = outro === "alt" ? "?s=alt" : "?s=principal";
  // no celular e no Windows o Minecraft pergunta se quer adicionar o servidor
  setTimeout(() => {
    location.href = link;
  }, 500);
})();
