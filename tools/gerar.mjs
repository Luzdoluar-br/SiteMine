// Gera as páginas do site a partir de src/ (sem dependências: só Node).
//   node tools/gerar.mjs            escreve index.html em cada pasta de rota, atualiza sitemap.xml
//   node tools/gerar.mjs --conferir confere se o que está no disco é igual ao que seria gerado (sai com erro se não for)
//
// Por que existe: o menu e o rodapé são os mesmos em 14 páginas. Escritos à mão, eles divergem (já aconteceu). Aqui há UMA
// cópia de cada, em src/parciais/, e cada página é só o miolo, em src/paginas/<nome>.html, com um cabeçalho de metadados:
//   <!--pagina {"rota":"kiza","titulo":"Kiza","descricao":"...","secao":"kiza","css":["paginas"],"js":["kiza"]}-->
// O resultado é HTML estático comum (o que o Railway serve). Nada aqui roda no navegador.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://site-production-f47b.up.railway.app";
const API = "https://botmine-production-70b0.up.railway.app";
const VERSAO = JSON.parse(readFileSync(join(RAIZ, "src", "versao.json"), "utf8")).v;
const CFG = JSON.parse(readFileSync(join(RAIZ, "src", "config.json"), "utf8")); // endereço e convite: UMA fonte, vira atributo no HTML
const conferir = process.argv.includes("--conferir");

const ler = (...p) => readFileSync(join(RAIZ, ...p), "utf8").replace(/\r\n/g, "\n");
const modelo = ler("src", "parciais", "modelo.html");
const cabecalho = ler("src", "parciais", "cabecalho.html");
const rodape = ler("src", "parciais", "rodape.html");
const subnav = ler("src", "parciais", "subnav.html");

// Política de conteúdo: nada inline (sem <style>, style="" ou <script> com código), nada de fonte ou script de terceiros.
const CSP = [
  "default-src 'self'",
  `connect-src 'self' ${API}`, // 'self' é necessário: a vitrine Kitsune lê data/kitsune.json do próprio site
  `img-src 'self' https://cdn.discordapp.com ${API} data:`, // ${API}: imagens que o parceiro envia pelo portal (banner e logo), servidas pela API
  "style-src 'self'",
  "font-src 'self'",
  "script-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const paginas = readdirSync(join(RAIZ, "src", "paginas")).filter((f) => f.endsWith(".html")).sort();
const saidas = [];
const rotas = [];

for (const arquivo of paginas) {
  const fonte = ler("src", "paginas", arquivo);
  const m = fonte.match(/^<!--pagina (\{[\s\S]*?\})-->\n?/);
  if (!m) throw new Error(`${arquivo}: falta o cabeçalho <!--pagina {...}-->`);
  const meta = JSON.parse(m[1]);
  const corpo = fonte.slice(m[0].length);
  const rota = meta.rota; // "" = raiz
  const fundo = rota === "" ? 0 : rota.split("/").length;
  const raiz = fundo === 0 ? "./" : "../".repeat(fundo);
  const url = `${SITE}/${rota ? rota + "/" : ""}`;
  const css = ["fontes", ...(meta.css || ["base"])].map((c) => `<link rel="stylesheet" href="${raiz}css/${c}.css?v=${VERSAO}">`).join("\n");
  const js = ["comum", "site", ...(meta.js || [])].map((j) => `<script src="${raiz}js/${j}.js?v=${VERSAO}" defer></script>`).join("\n");
  const og = meta.og || "img/og.jpg";
  const trocar = (t) =>
    t
      .replaceAll("{{raiz}}", raiz)
      .replaceAll("{{convite}}", CFG.convite)
      .replaceAll("{{ip}}", CFG.servidor.ip)
      .replaceAll("{{porta}}", CFG.servidor.porta)
      .replaceAll("{{ip_alt}}", CFG.alternativo.ip)
      .replaceAll("{{porta_alt}}", CFG.alternativo.porta)
      .replaceAll("{{nome_servidor}}", CFG.servidor.nome)
      .replaceAll("{{nome_alt}}", CFG.alternativo.nome);
  const html = trocar(modelo)
    .replace("{{csp}}", CSP)
    .replaceAll("{{titulo}}", escapar(meta.titulo))
    .replaceAll("{{descricao}}", escapar(meta.descricao))
    .replaceAll("{{url}}", url) // aparece duas vezes (og:url e canonical): replace() trocava só a primeira
    .replaceAll("{{og}}", `${SITE}/${og}`)
    .replace("{{robots}}", (meta.indexar === false ? `<meta name="robots" content="noindex">\n` : "") + (meta.jsonld ? `<script type="application/ld+json">${JSON.stringify(meta.jsonld)}</script>\n` : ""))
    .replace("{{css}}", css)
    .replace("{{js}}", js)
    .replace("{{secao}}", meta.secao || "")
    .replace("{{classe}}", meta.classe || "")
    .replace("{{cabecalho}}", trocar(cabecalho))
    .replace("{{corpo}}", trocar(corpo).trimEnd().replace("{{subnav}}", () => trocar(subnav).replace(`data-sub="${meta.sub}"`, `data-sub="${meta.sub}" aria-current="page"`).trimEnd()))
    .replace("{{rodape}}", trocar(rodape));
  const destino = join(RAIZ, rota, "index.html");
  saidas.push([destino, html]);
  if (meta.indexar !== false) rotas.push({ url, prioridade: meta.prioridade ?? 0.6, freq: meta.freq ?? "weekly" });
}

function escapar(t) {
  return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rotas.map((r) => `  <url><loc>${r.url}</loc><changefreq>${r.freq}</changefreq><priority>${r.prioridade.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`;
saidas.push([join(RAIZ, "sitemap.xml"), sitemap]);

let diferentes = 0;
for (const [destino, texto] of saidas) {
  const atual = existsSync(destino) ? readFileSync(destino, "utf8").replace(/\r\n/g, "\n") : null;
  if (atual === texto) continue;
  diferentes++;
  if (conferir) {
    console.error("desatualizado:", destino.replace(RAIZ, "."));
    continue;
  }
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, texto);
  console.log("escrito:", destino.replace(RAIZ, ".").replaceAll("\\", "/"));
}
if (conferir && diferentes) process.exit(1);
console.log(conferir ? "tudo em dia" : `${saidas.length} arquivos conferidos, ${diferentes} escritos`);
