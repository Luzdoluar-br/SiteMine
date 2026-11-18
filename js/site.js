// Comportamento comum a todas as páginas: menu no celular e botões de copiar.
// Não faz mais nada de propósito: sem animação de entrada, sem parallax, sem canvas.
"use strict";

(() => {
  document.documentElement.classList.add("js");

  // ---------------------------------------------------------------- menu do celular
  const btn = document.getElementById("menuBtn");
  const menu = document.getElementById("menu");
  if (btn && menu) {
    const alternar = (abrir) => {
      menu.classList.toggle("aberto", abrir);
      btn.setAttribute("aria-expanded", String(abrir));
      btn.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
      document.body.style.overflow = abrir ? "hidden" : "";
    };
    btn.addEventListener("click", () => alternar(!menu.classList.contains("aberto")));
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) alternar(false);
    });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("aberto")) {
        alternar(false);
        btn.focus();
      }
    });
    // se a tela crescer com o menu aberto, ele volta ao normal
    matchMedia("(min-width: 961px)").addEventListener("change", (m) => m.matches && alternar(false));
  }

  // ---------------------------------------------------------------- botões de copiar: <button data-copiar="texto" data-rotulo="...">
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copiar]");
    if (!b) return;
    const texto = b.dataset.copiar;
    const alvo = b.querySelector("[data-copiar-rotulo]") || b;
    const antes = alvo.dataset.original || alvo.textContent;
    alvo.dataset.original = antes;
    try {
      await navigator.clipboard.writeText(texto);
      alvo.textContent = "Copiado";
    } catch {
      // sem permissão da área de transferência: mostra o texto para a pessoa copiar na mão
      alvo.textContent = texto;
    }
    clearTimeout(b._t);
    b._t = setTimeout(() => (alvo.textContent = antes), 1800);
  });
})();
