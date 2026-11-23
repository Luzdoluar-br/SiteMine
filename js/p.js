// Página pública /p/?u=<endereço>: lê GET /site/pagina/<slug> e monta com o MESMO renderizador do editor (js/pagina.js + pagina2.js).
// Conta visita e clique (só contagem, sem IP nem cookie), mostra widgets/mural, QR, favoritar e denúncia sem login.
"use strict";

(() => {
  const { $, API } = VULPUS;
  const slug = (new URLSearchParams(location.search).get("u") || "").toLowerCase();
  const estado = (t) => {
    $("estado").textContent = t;
    $("estado").hidden = !t;
  };
  const sessaoAtiva = () => {
    try {
      return !!localStorage.getItem("vulpus_sessao");
    } catch {
      return false;
    }
  };
  const sinal = (caminho, corpo) => {
    // contagem de visita/clique: falhar aqui nunca atrapalha a página
    VULPUS.api(caminho, { method: "POST", body: JSON.stringify(corpo), keepalive: true }).catch(() => {});
  };

  function seo(d) {
    const v2 = d.v2 || {};
    const s = v2.seo || {};
    document.title = `${s.titulo || d.titulo || slug} · Vulpus`;
    const meta = (nome, valor) => {
      let m = document.head.querySelector(`meta[name="${nome}"]`);
      if (!m) {
        m = document.createElement("meta");
        m.name = nome;
        document.head.append(m);
      }
      m.content = valor;
    };
    const desc = s.descricao || d.bio || "";
    if (desc) meta("description", desc.slice(0, 200));
    meta("robots", s.indexavel ? "index,follow" : "noindex");
    if (s.cor_tema) meta("theme-color", s.cor_tema);
    const fav = s.favicon && v2.midias && v2.midias[s.favicon];
    if (fav) {
      let l = document.head.querySelector('link[rel="icon"]');
      if (!l) {
        l = document.createElement("link");
        l.rel = "icon";
        document.head.append(l);
      }
      l.href = fav.url;
    }
  }

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
    const real = d.slug || slug;
    const raiz = $("pagina");
    raiz.classList.add("publica");
    const ctx = {
      titulo_padrao: slug,
      modo: "publico",
      aoClicar: (id) => sinal(`/site/pagina/${real}/clique`, { link: id }),
      widget: (id) => fetch(`${API}/site/pagina/${real}/widget/${encodeURIComponent(id)}`, { credentials: "omit" }).then((x) => x.json()),
    };
    if (d.v2 && (d.v2.mural || {}).ativo) {
      let moderar = false;
      if (sessaoAtiva()) {
        const q = await VULPUS.api(`/painel/api/pagina/favorito?slug=${real}`).catch(() => ({ r: { ok: false }, d: {} }));
        moderar = !!(q.r.ok && q.d.pode_moderar);
      }
      ctx.mural = {
        logado: sessaoAtiva(),
        pode_apagar: moderar,
        listar: () => fetch(`${API}/site/pagina/${real}/mural`, { credentials: "omit" }).then((x) => x.json()),
        enviar: async (texto) => {
          const q = await VULPUS.api("/painel/api/pagina/mural", { method: "POST", body: JSON.stringify({ slug: real, texto }) });
          return { ok: q.r.ok, d: q.d };
        },
        apagar: (id) => VULPUS.api(`/painel/api/pagina/mural?slug=${real}&id=${id}`, { method: "DELETE" }),
      };
    }
    PAGINA.renderizar(raiz, d, ctx);
    raiz.hidden = false;
    $("h1-estado").remove(); // a página montada traz o próprio título (h1)
    $("acoesArea").hidden = false;
    seo(d);
    if (real !== slug) history.replaceState(null, "", `?u=${real}`);
    sinal(`/site/pagina/${real}/visita`, { ref: document.referrer || "" });
    iniciarAcoes(real, Number(d.curtidas) || 0);
  }

  function iniciarAcoes(real, curtidas) {
    const msg = (t) => {
      $("acoesMsg").textContent = t;
    };
    $("copiarLink").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(`${location.origin}${location.pathname}?u=${real}`);
        msg("Link copiado");
        $("copiarLink").textContent = "Link copiado";
        setTimeout(() => {
          $("copiarLink").textContent = "Copiar link";
        }, 1800);
      } catch {
        msg("Não consegui copiar. Copie o endereço da barra do navegador.");
      }
    });
    const qd = $("qrDialogo");
    $("qrAbrir").addEventListener("click", () => {
      $("qrImg").src = `${API}/site/pagina/${real}/qr.svg`;
      $("qrBaixar").href = `${API}/site/pagina/${real}/qr.svg?formato=png`;
      if (typeof qd.showModal === "function") qd.showModal();
      else qd.setAttribute("open", "");
    });
    $("qrFechar").addEventListener("click", () => qd.close());
    // curtir: a contagem é pública (vem junto com a página); quem não entrou vê o número e, ao clicar, o convite para entrar com o Discord
    const b = $("favoritar");
    let total = curtidas;
    let curtiu = false;
    const pintar = () => {
      b.textContent = `${curtiu ? "Curtida" : "Curtir"} (${total})`;
      b.setAttribute("aria-pressed", String(curtiu));
      b.setAttribute("aria-label", `${curtiu ? "Descurtir" : "Curtir"} esta página. ${total} ${total === 1 ? "curtida" : "curtidas"}`);
      b.classList.toggle("curtir-ativo", curtiu);
    };
    pintar();
    if (!sessaoAtiva()) {
      b.addEventListener("click", () => {
        msg("Entre com o Discord para curtir.");
        b.replaceWith(Object.assign(document.createElement("a"), { className: "link-denuncia link-curtir", id: "favoritar", href: "../conta/?entrar=1&volta=explorar", textContent: `Entre para curtir (${total})` }));
      });
      return;
    }
    VULPUS.api(`/painel/api/pagina/favorito?slug=${real}`)
      .then(({ r, d }) => {
        if (!r.ok) return;
        if (Number.isFinite(Number(d.total))) total = Number(d.total);
        if (d.propria) {
          // a própria página não se curte: mostra só o total
          b.disabled = true;
          b.title = "Você não pode curtir a sua própria página";
          pintar();
          return;
        }
        curtiu = !!(d.curtida ?? d.favorito);
        pintar();
        b.addEventListener("click", async () => {
          b.disabled = true;
          const q = await VULPUS.api("/painel/api/pagina/favoritar", { method: "POST", body: JSON.stringify({ slug: real }) }).catch(() => ({ r: { ok: false }, d: {} }));
          b.disabled = false;
          if (!q.r.ok) return msg("Não consegui curtir agora. Tente de novo.");
          curtiu = !!(q.d.curtida ?? q.d.favorito);
          if (Number.isFinite(Number(q.d.total))) total = Number(q.d.total);
          pintar();
        });
      })
      .catch(() => {});
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
