// Explorar: lista pública de páginas (GET /site/explorar), busca, ordem, "ver mais" e as favoritas de quem está logado.
// Tudo entra por textContent; as imagens vêm só do servidor da Vulpus (avatar) ou do próprio site (fundos).
"use strict";

(() => {
  const { $, el, API } = VULPUS;
  let pag = 0;
  const imgOk = (u) => String(u || "").startsWith(`${API}/`) || /^https:\/\/site-production-f47b\.up\.railway\.app\//.test(String(u || ""));
  const corOk = (c) => (/^#[0-9a-fA-F]{6}$/.test(String(c || "")) ? c : "#e5731c");

  function cartao(p) {
    const li = el("li", "ex-item");
    const a = el("a", "ex-cartao");
    a.href = `../p/?u=${encodeURIComponent(p.slug)}`;
    a.style.setProperty("--ex-cor", corOk(p.cor));
    const topo = el("div", "ex-topo");
    if (imgOk(p.fundo)) topo.style.backgroundImage = `url("${p.fundo}")`;
    const av = el("span", "ex-avatar");
    if (imgOk(p.avatar)) {
      const i = el("img");
      i.src = p.avatar;
      i.alt = "";
      i.loading = "lazy";
      av.append(i);
    } else av.textContent = (p.titulo || "?").slice(0, 1).toUpperCase();
    a.append(topo, av, el("strong", "", p.titulo), el("span", "ex-tipo", p.tipo === "parceiro" ? "Parceiro" : "Kitsune"), el("p", "", p.bio || ""));
    li.append(a);
    return li;
  }

  async function carregar(mais) {
    if (!mais) {
      pag = 0;
      $("exGrade").replaceChildren();
    }
    $("exMsg").textContent = "Carregando…";
    const q = new URLSearchParams({ q: $("exBusca").value.trim(), ordem: $("exOrdem").value, tipo: $("exTipo").value, p: String(pag) });
    let r;
    let d = {};
    try {
      r = await fetch(`${API}/site/explorar?${q}`, { credentials: "omit" });
      d = await r.json();
    } catch {
      $("exMsg").textContent = "Não consegui carregar agora. Tente de novo em instantes.";
      return;
    }
    if (!r.ok) {
      $("exMsg").textContent = d.mensagem || "Não consegui carregar agora.";
      return;
    }
    for (const p of d.paginas) $("exGrade").append(cartao(p));
    $("exMsg").textContent = $("exGrade").children.length ? "" : "Nenhuma página por aqui ainda. Que tal ser a primeira? Publique a sua e ligue “Aparecer em Explorar”.";
    $("exMais").hidden = !d.tem_mais;
  }

  async function favoritas() {
    const { r, d } = await VULPUS.api("/painel/api/pagina/favoritos").catch(() => ({ r: { ok: false }, d: {} }));
    if (!r.ok || !(d.paginas || []).length) return;
    $("exFav").replaceChildren(...d.paginas.map(cartao));
    $("exFavSec").hidden = false;
  }

  $("exForm").addEventListener("submit", (e) => {
    e.preventDefault();
    carregar(false);
  });
  $("exOrdem").addEventListener("change", () => carregar(false));
  $("exTipo").addEventListener("change", () => carregar(false));
  $("exMais").addEventListener("click", () => {
    pag += 1;
    carregar(true);
  });
  carregar(false);
  favoritas();
})();
