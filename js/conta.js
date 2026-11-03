// Minha conta (conta/index.html): login com Discord e os dados da própria pessoa, vindos da API do bot.
// Segurança: tudo entra na página por textContent (nunca HTML), o token de sessão vai no cabeçalho Authorization (sem cookie de
// terceiros) e o login só é aceito se o número aleatório criado aqui antes do login voltar igual (ninguém "loga" você na conta dele).
// Permissões e dados são decididos no servidor; o navegador só mostra.
"use strict";

const API = "https://botmine-production-70b0.up.railway.app";
const CHAVE_SESSAO = "vulpus_sessao";
const CHAVE_NUMERO = "vulpus_login_n";
const CHAVE_VOLTA = "vulpus_login_volta";
const VOLTAS = new Set(["habilidades", "home", "comunidade"]); // páginas para onde o login pode devolver

const $ = (id) => document.getElementById(id);

const guardar = {
  ler(k, onde = localStorage) {
    try {
      return onde.getItem(k) || "";
    } catch {
      return "";
    }
  },
  gravar(k, v, onde = localStorage) {
    try {
      if (v) onde.setItem(k, v);
      else onde.removeItem(k);
    } catch {
      // navegação privada sem armazenamento: o login vale só nesta aba
    }
  },
};
let sessao = guardar.ler(CHAVE_SESSAO);

const TIPOS = {
  warn: "Aviso", timeout: "Timeout", untimeout: "Timeout removido", kick: "Expulsão", ban: "Banimento", unban: "Desbanimento",
  exilio: "Exílio (Minecraft)", fim_exilio: "Exílio encerrado", suspensao: "Suspensão preventiva", reavaliacao: "Reavaliação", automod: "Automod",
};
const ERROS = {
  login: "O login expirou ou foi interrompido. Tente de novo.",
  discord: "O Discord não respondeu agora. Tente de novo em instantes.",
  nao_membro: "Você precisa estar no servidor da VULPUS no Discord para entrar.",
  servidor: "O sistema está iniciando. Tente de novo em instantes.",
  nao_configurado: "O login com Discord ainda não foi ativado pela equipe.",
  muitas_tentativas: "Muitas tentativas seguidas. Espere um minuto.",
};

function duracao(seg) {
  seg = Math.max(0, Math.floor(seg || 0));
  if (seg >= 86400) return `${Math.floor(seg / 86400)}d ${Math.floor((seg % 86400) / 3600)}h`;
  if (seg >= 3600) return `${Math.floor(seg / 3600)}h${String(Math.floor((seg % 3600) / 60)).padStart(2, "0")}`;
  return `${Math.floor(seg / 60)}min`;
}
const data = (s) => new Date(s * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const numero = (n) => Number(n || 0).toLocaleString("pt-BR");

function mostrar(qual) {
  for (const id of ["carregando", "entrar", "conta"]) $(id).hidden = id !== qual;
}

function aviso(texto) {
  $("aviso").textContent = texto;
  $("aviso").hidden = !texto;
}

function etiqueta(texto, fogo) {
  const e = document.createElement("span");
  e.className = "etiqueta" + (fogo ? " fogo-et" : "");
  e.textContent = texto;
  return e;
}

/** Número aleatório para amarrar o login a ESTE navegador. */
function novoNumero() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function entrar() {
  const n = novoNumero();
  guardar.gravar(CHAVE_NUMERO, n, sessionStorage);
  location.href = `${API}/painel/login?n=${encodeURIComponent(n)}`;
}

/** Volta do login: #sessao=...&n=... (aceita só se o número bater) e limpa a barra de endereço na hora. */
function receberLogin() {
  if (!location.hash.includes("sessao=")) return;
  const p = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, "", location.pathname + location.search);
  const esperado = guardar.ler(CHAVE_NUMERO, sessionStorage);
  guardar.gravar(CHAVE_NUMERO, "", sessionStorage);
  const token = p.get("sessao") || "";
  if (!esperado || p.get("n") !== esperado || token.length < 20 || token.length > 200) {
    aviso(ERROS.login);
    return;
  }
  sessao = token;
  guardar.gravar(CHAVE_SESSAO, token);
  const volta = guardar.ler(CHAVE_VOLTA, sessionStorage);
  guardar.gravar(CHAVE_VOLTA, "", sessionStorage);
  if (VOLTAS.has(volta)) location.replace(`../${volta}/`);
}

async function api(caminho, opcoes = {}) {
  const r = await fetch(API + caminho, {
    ...opcoes,
    headers: { ...(opcoes.headers || {}), Authorization: `Bearer ${sessao}`, ...(opcoes.body ? { "Content-Type": "application/json" } : {}) },
    credentials: "omit",
  });
  let d = {};
  try {
    d = await r.json();
  } catch {
    d = {};
  }
  if (r.status === 401) {
    sessao = "";
    guardar.gravar(CHAVE_SESSAO, "");
  }
  return { r, d };
}

function preencher(d) {
  $("quem").hidden = false;
  $("quem-foto").src = d.usuario.avatar;
  $("quem-nome").textContent = d.usuario.nome;
  $("foto").src = d.usuario.avatar;
  $("nome").textContent = d.usuario.nome;
  const et = $("etiquetas");
  et.replaceChildren(etiqueta(`${d.perfil.rank_emoji} ${d.perfil.rank}`, true));
  if (d.servidor.equipe !== "Membro") et.append(etiqueta(`Equipe: ${d.servidor.equipe}`));
  if (d.minecraft.vinculado) et.append(etiqueta("Conta do jogo ligada"));

  if (d.restricao) {
    const r = d.restricao;
    const nome = r.tipo === "suspensao" ? "Suspensão preventiva" : r.tipo === "exilio" ? "Exílio do Minecraft" : "Banimento do Minecraft";
    $("restricao").textContent = `${nome} ativo desde ${data(r.desde)}${r.ate ? ` até ${data(r.ate)}` : ""}. Motivo: ${r.motivo}. Para contestar, abra um ticket no Discord.`;
    $("restricao").hidden = false;
  } else $("restricao").hidden = true;

  $("caudas").textContent = numero(d.perfil.caudas);
  $("nivel").textContent = `Nv ${d.perfil.nivel}`;
  $("rank").textContent = d.perfil.rank;
  $("sequencia").textContent = numero(d.perfil.sequencia_daily);
  const tot = Math.max(1, d.perfil.xp_para_proximo);
  $("barra-xp").style.width = `${Math.min(100, (d.perfil.xp_no_nivel / tot) * 100)}%`;
  $("xp-texto").textContent = `${numero(d.perfil.xp_no_nivel)} de ${numero(d.perfil.xp_para_proximo)} XP para o nível ${d.perfil.nivel + 1}`;

  const mc = d.minecraft;
  $("mc-sem").hidden = mc.vinculado;
  $("mc-com").hidden = !mc.vinculado;
  if (mc.vinculado) {
    $("mc-nick").textContent = mc.nick;
    $("mc-total").textContent = duracao(mc.tempo_total_s);
    $("mc-maior").textContent = duracao(mc.maior_sessao_s);
    $("mc-desde").textContent = `Ligada desde ${data(mc.desde)}.`;
  }
  if (d.duelos) {
    $("duelo-elo").textContent = numero(d.duelos.elo);
    $("duelo-div").textContent = d.duelos.divisao;
    $("duelo-vd").textContent = `${d.duelos.v} / ${d.duelos.d}`;
  }
  if (d.abates) $("abates").textContent = numero(d.abates.kills);

  $("desde-discord").textContent = d.servidor.desde ? `No servidor desde ${data(d.servidor.desde)}.` : "";
  const cargos = $("cargos");
  cargos.replaceChildren();
  for (const c of d.servidor.cargos) {
    const li = document.createElement("li");
    li.textContent = c.nome;
    if (c.cor) li.style.borderColor = c.cor;
    cargos.append(li);
  }

  const hist = $("historico");
  hist.replaceChildren();
  for (const p of d.punicoes) {
    const li = document.createElement("li");
    if (!p.ativo) li.className = "inativo";
    const tipo = document.createElement("span");
    tipo.className = "tipo";
    tipo.textContent = `${TIPOS[p.tipo] || p.tipo} #${p.numero}`;
    const quando = document.createElement("span");
    quando.className = "quando";
    quando.textContent = `${data(p.quando)}${p.duracao_s ? ` · ${duracao(p.duracao_s)}` : ""}${p.ativo ? "" : " · anulado ou encerrado"}`;
    const motivo = document.createElement("span");
    motivo.className = "motivo";
    motivo.textContent = p.motivo;
    li.append(tipo, quando, motivo);
    hist.append(li);
  }
  $("historico-vazio").hidden = d.punicoes.length > 0;
  $("publico").checked = d.privacidade.publico;
  mostrar("conta");
}

async function carregar() {
  const params = new URLSearchParams(location.search);
  const erro = params.get("erro");
  if (erro) {
    history.replaceState(null, "", location.pathname);
    aviso(ERROS[erro] || ERROS.login);
  }
  receberLogin();
  if (params.get("entrar") === "1" && !sessao) {
    // veio de outra página do site ("Entrar com Discord"): guarda para onde voltar e já vai para o Discord
    const volta = params.get("volta") || "";
    guardar.gravar(CHAVE_VOLTA, VOLTAS.has(volta) ? volta : "", sessionStorage);
    return entrar();
  }
  if (sessao && VOLTAS.has(params.get("volta") || "")) return location.replace(`../${params.get("volta")}/`);
  if (!sessao) return mostrar("entrar");
  try {
    const { r, d } = await api("/painel/api/eu");
    if (r.ok && d.ok) return preencher(d);
    if (d.login_configurado === false) aviso(ERROS.nao_configurado);
  } catch {
    aviso("Não consegui falar com o sistema agora. Tente de novo em instantes.");
  }
  mostrar("entrar");
}

document.addEventListener("DOMContentLoaded", () => {
  $("entrar-bt").addEventListener("click", (ev) => {
    ev.preventDefault();
    entrar();
  });
  $("publico").addEventListener("change", async (ev) => {
    const alvo = ev.target;
    alvo.disabled = true;
    try {
      const { d } = await api("/painel/api/privacidade", { method: "POST", body: JSON.stringify({ publico: alvo.checked }) });
      if (!d.ok) alvo.checked = !alvo.checked;
      else {
        $("salvo").hidden = false;
        setTimeout(() => ($("salvo").hidden = true), 1800);
      }
    } finally {
      alvo.disabled = false;
    }
  });
  const sair = async (todos) => {
    try {
      await api(`/painel/api/sair${todos ? "?todos=1" : ""}`, { method: "POST" });
    } finally {
      sessao = "";
      guardar.gravar(CHAVE_SESSAO, "");
      location.replace(location.pathname);
    }
  };
  $("sair").addEventListener("click", () => sair(false));
  $("sair-todos").addEventListener("click", () => {
    if (confirm("Sair da conta em todos os aparelhos?")) sair(true);
  });
  carregar();
});
