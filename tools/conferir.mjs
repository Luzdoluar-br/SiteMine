// Confere o site gerado sem abrir o navegador. Sai com erro se achar problema.   node tools/conferir.mjs
//  1. ids que o JS procura (getElementById e $("...")) e que a página não tem
//  2. links, imagens, scripts e CSS locais que apontam para arquivo que não existe
//  3. <img> sem alt, estilo inline e script inline (a política de conteúdo bloqueia os dois)
//  4. classes usadas no HTML e no JS que nenhum CSS define (aviso, não erro: algumas são só ganchos de comportamento)
//  5. emoji no texto das páginas (o site não usa emoji como ícone)
//  6. títulos: cada página tem h1 e nenhum título pula de nível (h2 direto para h4)
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ler = (p) => readFileSync(p, "utf8");
const erros = [];
const avisos = [];

// ---- páginas geradas: toda pasta de primeiro nível com index.html, mais a raiz
const paginas = [join(RAIZ, "index.html")];
for (const d of readdirSync(RAIZ)) {
  const p = join(RAIZ, d);
  if (statSync(p).isDirectory() && existsSync(join(p, "index.html")) && !["src", "tools", "node_modules"].includes(d)) paginas.push(join(p, "index.html"));
}

const css = readdirSync(join(RAIZ, "css")).filter((f) => f.endsWith(".css")).map((f) => ler(join(RAIZ, "css", f))).join("\n");
const classesCss = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]));
const GANCHOS = new Set(["js", "on", "aberto", "ativo", "ligado", "mudou", "pula", "fechado", "inativo", "p1", "p2", "p3", "n", "k", "sis", "r1", "r2", "r3", "r4"]);

for (const arquivo of paginas) {
  const html = ler(arquivo);
  const nome = arquivo.replace(RAIZ, ".").replaceAll("\\", "/");
  const base = dirname(arquivo);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  // 1. ids do JS
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1].split("?")[0]);
  for (const s of scripts) {
    const caminho = resolve(base, s);
    if (!existsSync(caminho)) {
      erros.push(`${nome}: script não existe: ${s}`);
      continue;
    }
    const js = ler(caminho);
    for (const m of js.matchAll(/(?:getElementById|\$)\(\s*["']([\w-]+)["']\s*\)/g)) {
      if (!ids.has(m[1]) && !new RegExp(`\\.id\\s*=\\s*["']${m[1]}["']`).test(js)) erros.push(`${nome}: ${s.split("/").pop()} procura #${m[1]} e a página não tem`);
    }
  }

  // 2. arquivos locais
  for (const m of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    const alvo = m[1].split("?")[0];
    if (/^(https?:|mailto:|data:|minecraft:)/.test(alvo) || alvo === "") continue;
    let caminho = resolve(base, alvo);
    if (existsSync(caminho) && statSync(caminho).isDirectory()) caminho = join(caminho, "index.html");
    if (!existsSync(caminho)) erros.push(`${nome}: aponta para algo que não existe: ${m[1]}`);
  }
  for (const m of html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)) {
    if (!existsSync(resolve(base, m[1].split("?")[0]))) erros.push(`${nome}: CSS não existe: ${m[1]}`);
  }

  // 3. alt, inline
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) erros.push(`${nome}: <img> sem alt: ${m[0].slice(0, 80)}`);
  if (/\sstyle="/.test(html)) erros.push(`${nome}: tem style="" inline (a CSP bloqueia)`);
  if (/<style[\s>]/.test(html)) erros.push(`${nome}: tem <style> inline (a CSP bloqueia)`);
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/g)) erros.push(`${nome}: script inline: ${m[0].slice(0, 60)}`);

  // 4. classes
  for (const m of html.matchAll(/\sclass="([^"]+)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c && !classesCss.has(c) && !GANCHOS.has(c)) avisos.push(`${nome}: classe sem CSS: .${c}`);
  }

  // 6. títulos
  const niveis = [...html.replace(/<script[\s\S]*?<\/script>/g, "").matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (!niveis.includes(1)) erros.push(`${nome}: sem <h1>`);
  for (let i = 1; i < niveis.length; i++) if (niveis[i] > niveis[i - 1] + 1) erros.push(`${nome}: título pula de h${niveis[i - 1]} para h${niveis[i]}`);

  // 5. emoji
  const texto = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  const emoji = texto.match(/\p{Extended_Pictographic}/gu);
  if (emoji) erros.push(`${nome}: emoji no HTML: ${[...new Set(emoji)].join(" ")}`);
}

// classes que o JS gera
const jsDir = join(RAIZ, "js");
for (const f of readdirSync(jsDir).filter((x) => x.endsWith(".js"))) {
  const js = ler(join(jsDir, f));
  const achadas = new Set();
  for (const m of js.matchAll(/\bel\(\s*["'][a-z0-9]+["']\s*,\s*["']([^"']+)["']/g)) m[1].split(/\s+/).forEach((c) => achadas.add(c));
  for (const m of js.matchAll(/classList\.(?:add|toggle)\(\s*["']([\w-]+)["']/g)) achadas.add(m[1]);
  for (const m of js.matchAll(/className\s*=\s*["']([^"']+)["']/g)) m[1].split(/\s+/).forEach((c) => achadas.add(c));
  for (const c of achadas) if (c && !classesCss.has(c) && !GANCHOS.has(c)) avisos.push(`js/${f}: classe gerada sem CSS: .${c}`);
  const emoji = js.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  if (emoji) erros.push(`js/${f}: emoji no código: ${[...new Set(emoji)].join(" ")}`);
}

const unicos = (l) => [...new Set(l)];
if (avisos.length) console.log(`AVISOS (${unicos(avisos).length}):\n  ` + unicos(avisos).join("\n  "));
if (erros.length) {
  console.error(`\nERROS (${unicos(erros).length}):\n  ` + unicos(erros).join("\n  "));
  process.exit(1);
}
console.log(`\nok: ${paginas.length} páginas conferidas, nenhum erro.`);
