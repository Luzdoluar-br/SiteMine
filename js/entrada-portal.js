// Login e chamadas autenticadas do Portal do parceiro e do editor de páginas. Mesmo esquema da "Minha conta" (js/conta.js):
// o token vai no cabeçalho Authorization (sem cookie de terceiros), o login só vale se o número aleatório criado aqui voltar igual,
// e a permissão de tudo é decidida no servidor. Aqui o login pede também a lista de servidores que a pessoa gerencia (portal=1).
"use strict";

const ENTRADA = (() => {
  const API = "https://botmine-production-70b0.up.railway.app";
  const K_SESSAO = "vulpus_sessao";
  const K_NUMERO = "vulpus_login_n";
  const K_VOLTA = "vulpus_login_volta";
  const VOLTAS = new Set(["pagina/editar", "parceiros/portal"]); // para onde o login pode devolver (nunca um endereço vindo da URL)

  const ler = (k, onde = localStorage) => {
    try {
      return onde.getItem(k) || "";
    } catch {
      return "";
    }
  };
  const gravar = (k, v, onde = localStorage) => {
    try {
      if (v) onde.setItem(k, v);
      else onde.removeItem(k);
    } catch {
      // navegação privada sem armazenamento: o login vale só nesta aba
    }
  };
  let sessao = ler(K_SESSAO);

  function numero() {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /** Vai para o login do Discord e volta para `volta` (um dos VOLTAS) com a sessão no fragmento. */
  function entrar(volta) {
    const n = numero();
    gravar(K_NUMERO, n, sessionStorage);
    gravar(K_VOLTA, VOLTAS.has(volta) ? volta : "", sessionStorage);
    location.href = `${API}/painel/login?portal=1&n=${encodeURIComponent(n)}`;
  }

  /** Chamada na volta do login: confere o número, guarda a sessão, limpa a barra e (se pedido) segue para a página de origem. Devolve "ok" | "erro" | "nada". */
  function receberLogin(raizRelativa) {
    if (!location.hash.includes("sessao=")) return "nada";
    const p = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, "", location.pathname + location.search);
    const esperado = ler(K_NUMERO, sessionStorage);
    gravar(K_NUMERO, "", sessionStorage);
    const token = p.get("sessao") || "";
    if (!esperado || p.get("n") !== esperado || token.length < 20 || token.length > 200) return "erro";
    sessao = token;
    gravar(K_SESSAO, token);
    const volta = ler(K_VOLTA, sessionStorage);
    gravar(K_VOLTA, "", sessionStorage);
    if (VOLTAS.has(volta) && !location.pathname.includes(volta)) {
      location.replace(`${raizRelativa}${volta}/`);
      return "indo";
    }
    return "ok";
  }

  function sair() {
    sessao = "";
    gravar(K_SESSAO, "");
  }

  /** `corpo`: objeto (vira JSON) ou FormData (multipart, sem Content-Type manual). Devolve { r, d } e limpa a sessão em 401. */
  async function chamar(metodo, caminho, corpo) {
    const cab = sessao ? { Authorization: `Bearer ${sessao}` } : {};
    let body;
    if (corpo instanceof FormData) body = corpo;
    else if (corpo !== undefined) {
      body = JSON.stringify(corpo);
      cab["Content-Type"] = "application/json";
    }
    let r;
    try {
      r = await fetch(API + caminho, { method: metodo, headers: cab, body, credentials: "omit" });
    } catch {
      return { r: { ok: false, status: 0 }, d: { erro: "rede", mensagem: "Não consegui falar com o servidor. Confira sua conexão." } };
    }
    let d = {};
    try {
      d = await r.json();
    } catch {
      d = {};
    }
    if (r.status === 401) sair();
    return { r, d };
  }

  return { API, tem: () => !!sessao, entrar, receberLogin, sair, chamar };
})();
