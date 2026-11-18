// Página da Kiza: humores do rosto e a conversa de exemplo. As falas são EXEMPLOS escritos pela equipe (a página diz isso);
// o texto entra sempre por textContent, nunca como HTML.
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (tag, classe, texto) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };

  // ---------------------------------------------------------------- humores
  const retrato = $("retrato");
  const humorNome = $("humorNome");
  const botoes = [...document.querySelectorAll(".humores button")];
  const raiz = document.body.dataset.raiz || "./";
  const nomes = { normal: "normal", feliz: "feliz", piscando: "piscando", surpresa: "surpresa", envergonhada: "envergonhada", lado: "desconfiada", bravo: "brava", triste: "triste" };
  function humor(h) {
    retrato.style.opacity = 0;
    setTimeout(() => {
      retrato.src = `${raiz}img/humor-${h}.webp`;
      retrato.alt = `Rosto da Kiza: ${nomes[h]}`;
      retrato.style.opacity = 1;
    }, 140);
    humorNome.textContent = nomes[h];
    for (const b of botoes) b.setAttribute("aria-pressed", String(b.dataset.h === h));
  }
  for (const b of botoes) b.addEventListener("click", () => humor(b.dataset.h));

  // ---------------------------------------------------------------- conversa de exemplo
  const roteiro = [
    { p: "onde acho axolote?", h: "piscando", r: ["nas cavernas exuberantes. procura uma árvore de azaleia na superfície, a caverna costuma estar logo embaixo", "leva um balde de água. é com ele que você pega"] },
    { p: "lembra do meu gato?", h: "feliz", r: ["o pipoca! ele ainda derruba tudo da mesa ou finalmente tomou jeito?"] },
    { p: "como libero o VeinMiner?", h: "feliz", r: ["entra no site com o discord e abre a árvore de talentos. o veinminer custa 2 pontos, e cada nível de habilidade te dá 1", "depois é só agachar com a picareta no minério. o veio inteiro vem junto"] },
    { p: "você é uma IA?", h: "lado", r: ["sou a kiza, o bot-mascote da toca. então sim, mas com opinião própria", "e não vou fingir que sou gente de carne e osso. tenho uma cauda só, mas tenho ética"] },
    { p: "qual sua cor favorita?", h: "envergonhada", r: ["roxo. aquela cor do céu logo depois que o sol vai embora"] },
  ];
  const msgs = $("chatMsgs");
  const digitando = $("digitando");
  const dica = $("chatDica");
  let ocupada = false;
  const descer = () => (msgs.scrollTop = msgs.scrollHeight);

  function mensagemDoUsuario(texto) {
    const cm = el("div", "cm");
    const texto_ = el("div");
    texto_.append(el("b", "", "você"), el("p", "", texto));
    cm.append(el("div", "av-l", "V"), texto_);
    msgs.append(cm);
    descer();
  }
  function mensagemDaKiza(texto, h) {
    const cm = el("div", "cm");
    const av = el("div", "av-l av-k");
    const img = el("img");
    img.src = `${raiz}img/humor-${h}.webp`;
    img.width = 40;
    img.height = 40;
    img.alt = "";
    av.append(img);
    const nome = el("b", "k", "Kiza ");
    nome.append(el("span", "tag", "APP"));
    const corpo = el("div");
    corpo.append(nome, el("p", "", texto));
    cm.append(av, corpo);
    msgs.append(cm);
    descer();
  }

  const chips = () => [...document.querySelectorAll("#chips button")];
  for (const b of chips()) {
    b.addEventListener("click", async () => {
      if (ocupada) return;
      ocupada = true;
      for (const c of chips()) c.disabled = true;
      const item = roteiro[Number(b.dataset.p)];
      mensagemDoUsuario(item.p);
      for (let i = 0; i < item.r.length; i++) {
        await espera(calmo ? 100 : 450);
        digitando.classList.add("on");
        descer();
        await espera(calmo ? 100 : Math.min(2200, 700 + item.r[i].length * 16));
        digitando.classList.remove("on");
        mensagemDaKiza(item.r[i], item.h);
        if (i === 0) humor(item.h);
      }
      b.remove();
      ocupada = false;
      for (const c of chips()) c.disabled = false;
      if (!chips().length) dica.textContent = "Ela tem mais a dizer no Discord";
    });
  }
})();
