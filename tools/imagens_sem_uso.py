"""Lista imagens de img/ que nenhuma página, CSS, JS ou dado usa (para não deixar peso morto). python tools/imagens_sem_uso.py [--apagar]"""
import glob
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(RAIZ)
texto = ""
for padrao in ("*/index.html", "index.html", "js/*.js", "css/*.css", "src/**/*.html", "data/*.json", "tools/*.py", "tools/*.mjs"):
    for f in glob.glob(padrao, recursive=True):
        texto += open(f, encoding="utf-8", errors="ignore").read()

sem = []
for pasta, _, arquivos in os.walk("img"):
    for f in arquivos:
        caminho = os.path.join(pasta, f).replace("\\", "/")
        base = os.path.splitext(f)[0]
        usado = caminho in texto or f in texto or (pasta.replace("\\", "/").endswith("decor") and base in texto)
        if not usado:
            sem.append((caminho, os.path.getsize(caminho) // 1024))

for c, k in sem:
    print(f"{k:6d} KB  {c}")
print(f"{len(sem)} arquivos sem uso, {sum(k for _, k in sem)} KB")
if "--apagar" in sys.argv:
    for c, _ in sem:
        os.remove(c)
    print("apagados")
