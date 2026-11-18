// Parceiros: lista os Mega Parceiros ativos (GET /site/parceiros). Todo texto da API entra por textContent; ícone só de cdn.discordapp.com;
// convite só https. Ordem: data de entrada (mais antigo primeiro).
"use strict";

(() => {
  const { $, api, el } = VULPUS;
  const NS = "http://www.w3.org/2000/svg";

  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  /** "2026-03-14" -> "março de 2026" (sem passar por fuso horário). Data inválida -> "". */
  function mesAno(desde) {
    const m = /^(\d{4})-(\d{2})-\d{2}/.exec(String(desde || ""));
    if (!m || +m[2] < 1 || +m[2] > 12) return "";
    return `${MESES[+m[2] - 1]} de ${m[1]}`;
  }

  const iconeOk = (u) => typeof u === "string" && /^https:\/\/cdn\.discordapp\.com\//.test(u);
  function conviteOk(u) {
    try {
      const x = new URL(String(u));
      return x.protocol === "https:" ? x.href : "";
    } catch {
      return "";
    }
  }

  /** Sinal da casa (a raposa do topo do site) num quadrado de madeira: o que aparece quando o parceiro não tem ícone. */
  function sinal() {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 32 32");
    s.setAttribute("aria-hidden", "true");
    const u = document.createElementNS(NS, "use");
    u.setAttribute("href", "#sinal");
    s.append(u);
    return s;
  }

  function icone(p) {
    const box = el("span", "parceiro-icone");
    const sem = () => {
      box.classList.add("sem-icone");
      box.replaceChildren(sinal());
    };
    if (iconeOk(p.icone)) {
      const img = el("img");
      img.alt = "";
      img.width = 72;
      img.height = 72;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", sem, { once: true });
      img.src = p.icone;
      box.append(img);
    } else sem();
    return box;
  }

  function item(p) {
    const li = el("li", "parceiro");
    li.append(icone(p));
    const corpo = el("div", "parceiro-corpo");
    const topo = el("div", "parceiro-topo");
    topo.append(el("h3", "", p.nome), el("span", "etiqueta fogo-et", "Mega Partner"));
    corpo.append(topo);
    if (p.descricao) corpo.append(el("p", "parceiro-desc", p.descricao));
    const m = mesAno(p.desde);
    if (m) corpo.append(el("p", "parceiro-desde", `Na rede desde ${m}`));
    li.append(corpo);
    const url = conviteOk(p.convite);
    if (url) {
      const a = el("a", "botao botao-pequeno", "Entrar pelo convite");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", `Entrar no servidor ${p.nome} pelo convite (abre em outra aba)`);
      li.append(a);
    }
    return li;
  }

  const estado = (qual) => {
    $("redeCarregando").hidden = qual !== "carregando";
    $("redeErro").hidden = qual !== "erro";
    $("redeVazio").hidden = qual !== "vazio";
    $("redeLista").hidden = qual !== "lista";
    $("rede").setAttribute("aria-busy", String(qual === "carregando"));
    if (qual !== "lista") $("redeContagem").textContent = "";
  };

  async function carregar() {
    estado("carregando");
    try {
      const { r, d } = await api("/site/parceiros");
      if (!r.ok || !d || !Array.isArray(d.parceiros)) throw new Error("resposta inesperada");
      const lista = d.parceiros
        .filter((p) => p && typeof p.nome === "string" && p.nome.trim())
        .map((p) => ({ ...p, nome: p.nome.trim() }))
        .sort((a, b) => String(a.desde).localeCompare(String(b.desde)) || a.nome.localeCompare(b.nome, "pt-BR"));
      if (!lista.length) return estado("vazio");
      $("redeLista").replaceChildren(...lista.map(item));
      $("redeContagem").textContent = `${lista.length} ${lista.length === 1 ? "servidor" : "servidores"}`;
      estado("lista");
    } catch {
      estado("erro");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("redeTentar").addEventListener("click", carregar);
    carregar();
  });
})();
