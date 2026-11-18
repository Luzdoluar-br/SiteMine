// Página pública /p/?u=<endereço>: lê GET /site/pagina/<slug> e monta com o MESMO renderizador do editor (js/pagina.js). Denúncia sem login.
"use strict";

(() => {
  const { $, API } = VULPUS;
  const slug = (new URLSearchParams(location.search).get("u") || "").toLowerCase();
  const estado = (t) => {
    $("estado").textContent = t;
    $("estado").hidden = !t;
  };

  async function carregar() {
    if (!/^[a-z0-9-]{3,30}$/.test(slug)) return estado("Esse endereço não existe. Confira o link.");
    let r;
    let d = {};
    try {
      r = await fetch(`${API}/site/pagina/${slug}`, { credentials: "omit" });
      d = await r.json();
    } catch {
      return estado("Não consegui carregar a página agora. Tente de novo em instantes.");
    }
    if (r.status === 404) return estado("Essa página não existe ou não está no ar.");
    if (!r.ok) return estado("Não consegui carregar a página agora. Tente de novo em instantes.");
    estado("");
    PAGINA.renderizar($("pagina"), d, { titulo_padrao: slug });
    $("pagina").hidden = false;
    $("h1-estado").remove(); // a página montada traz o próprio título (h1)
    $("denunciaArea").hidden = false;
    document.title = `${d.titulo || slug} · Vulpus`;
  }

  const dlg = $("denunciaDialogo");
  $("denunciaAbrir").addEventListener("click", () => {
    $("denunciaMsg").textContent = "";
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    $("denunciaMotivo").focus();
  });
  $("denunciaCancelar").addEventListener("click", () => dlg.close());
  $("denunciaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const motivo = $("denunciaMotivo").value.trim();
    if (motivo.length < 3) {
      $("denunciaMsg").textContent = "Conte em poucas palavras o que há de errado.";
      return;
    }
    $("denunciaEnviar").disabled = true;
    let r;
    let d = {};
    try {
      r = await fetch(`${API}/site/pagina/${slug}/denunciar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo }), credentials: "omit" });
      d = await r.json();
    } catch {
      r = { ok: false };
    }
    $("denunciaEnviar").disabled = false;
    if (r.ok) {
      $("denunciaMsg").textContent = d.mensagem || "Obrigada. A equipe vai olhar.";
      $("denunciaMotivo").value = "";
      setTimeout(() => dlg.close(), 1600);
    } else {
      $("denunciaMsg").textContent = d.mensagem || "Não consegui enviar agora. Tente de novo.";
    }
  });

  carregar();
})();
