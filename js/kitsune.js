// Vitrine Kitsune: cores do nome, cores animadas e a loja decorativa. Os dados vêm de data/kitsune.json, que é gerado a partir do
// código do jogo (addon/tools/gerar_dados_site.py). Nada aqui é inventado: se o arquivo não carregar, a vitrine some.
"use strict";

(async () => {
  const $ = (id) => document.getElementById(id);
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const raiz = document.body.dataset.raiz || "./";
  const painelCores = $("painelCores");
  if (!painelCores) return;

  let dados;
  try {
    const r = await fetch(`${raiz}data/kitsune.json?v=20261118a`);
    if (!r.ok) throw new Error(String(r.status));
    dados = await r.json();
  } catch {
    $("vitrine").hidden = true;
    return;
  }

  const el = (tag, classe, texto) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };
  const NOME_EXEMPLO = "Kiza_Mimi";
  const animados = [];

  /** Mesma conta do pintar() do jogo: degradê, ciclo ou onda (andando com a fase). */
  function corDaLetra(t, i, total, fase) {
    const c = t.cores;
    if (t.modo === "onda") return c[(((i + fase) % c.length) + c.length) % c.length];
    if (t.modo === "ciclo") return c[i % c.length];
    return c[Math.min(c.length - 1, Math.floor((i * c.length) / total))];
  }
  function nomePintado(t) {
    const e = el("span", "vit-nome");
    e.setAttribute("role", "img");
    e.setAttribute("aria-label", `Exemplo do estilo ${t.nome}`);
    const letras = [...NOME_EXEMPLO];
    for (const [i, ch] of letras.entries()) {
      const s = el("span", "", ch);
      s.setAttribute("aria-hidden", "true");
      s.style.color = corDaLetra(t, i, letras.length, 0);
      e.append(s);
    }
    if (t.modo === "onda") animados.push({ t, letras: [...e.children], total: letras.length });
    return e;
  }
  function montarEstilos(painel, lista) {
    painel.replaceChildren();
    const porFamilia = {};
    for (const t of lista) (porFamilia[t.familia] ||= []).push(t);
    for (const [id, nome] of Object.entries(dados.estilos.familias)) {
      const itens = porFamilia[id];
      if (!itens) continue;
      const fam = el("div", "vit-fam");
      fam.append(el("h3", "", nome));
      const grade = el("div", "vit-grade");
      for (const t of itens) {
        const cel = el("div", "vit-cel");
        cel.append(nomePintado(t), el("span", "vit-rotulo", t.nome));
        grade.append(cel);
      }
      fam.append(grade);
      painel.append(fam);
    }
  }
  montarEstilos(painelCores, dados.estilos.normais);
  montarEstilos($("painelAnim"), dados.estilos.animados);

  const lista = el("ul", "decor");
  for (const d of dados.decor) {
    const li = el("li");
    const img = el("img");
    img.src = `${raiz}img/decor/${d.id}.png`;
    img.alt = "";
    img.width = 64;
    img.height = 64;
    img.loading = "lazy";
    img.decoding = "async";
    li.append(img, el("h4", "", d.nome), el("span", "preco-d", `${d.preco.toLocaleString("pt-BR")} Caudas`), el("p", "", d.dica));
    lista.append(li);
  }
  $("painelDecor").replaceChildren(lista);

  const rodape = $("vitRodape");
  const textos = {
    cores: `${dados.estilos.normais.length} cores para o nome e a tag do clã, só para Kitsunes. Escolha no jogo, no Cantinho Kitsune.`,
    anim: `${dados.estilos.animados.length} cores que se mexem no nome, liberadas para Kitsunes a partir do nível 20.`,
    decor: `${dados.decor.length} blocos feitos pela Vulpus, comprados com Caudas no Cantinho Kitsune. Só enfeite: nada de vantagem.`,
  };
  const abas = [...document.querySelectorAll("[data-aba]")];
  const paineis = { cores: $("painelCores"), anim: $("painelAnim"), decor: $("painelDecor") };
  function abrir(chave) {
    for (const a of abas) {
      const on = a.dataset.aba === chave;
      a.setAttribute("aria-selected", String(on));
      a.tabIndex = on ? 0 : -1;
    }
    for (const [k, p] of Object.entries(paineis)) p.hidden = k !== chave;
    rodape.hidden = false;
    rodape.textContent = textos[chave];
  }
  for (const [i, a] of abas.entries()) {
    a.addEventListener("click", () => abrir(a.dataset.aba));
    a.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
      const prox = abas[(i + (ev.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length];
      prox.focus();
      abrir(prox.dataset.aba);
    });
  }
  abrir("cores");

  // as cores animadas só andam enquanto a vitrine está na tela e se a pessoa não pediu menos movimento
  if (!calmo && animados.length) {
    let fase = 0;
    let timer = 0;
    const passo = () => {
      fase++;
      for (const a of animados) {
        if (!a.letras[0].offsetParent) continue;
        for (const [i, s] of a.letras.entries()) s.style.color = corDaLetra(a.t, i, a.total, fase);
      }
    };
    new IntersectionObserver((es) => {
      const vendo = es.some((e) => e.isIntersecting);
      if (vendo && !timer) timer = setInterval(passo, 420);
      else if (!vendo && timer) {
        clearInterval(timer);
        timer = 0;
      }
    }).observe($("vitrine"));
  }
})();
