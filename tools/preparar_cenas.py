"""Converte os renders das cenas (img/cenas/*.png, saída de site_cenas.py) em WebP leve e monta o herói largo da página inicial.
   python tools/preparar_cenas.py

Os PNGs originais pesam ~2 MB cada e não vão para o git (.gitignore). Saída: img/cenas/<nome>.webp (lado maior 1300 px) e
img/cenas/heroi.webp (1920x960: o diorama da toca à direita; o céu é estendido para a esquerda a partir da borda da própria imagem,
onde o texto da página fica por cima de um véu escuro)."""
from pathlib import Path

from PIL import Image, ImageFilter

PASTA = Path(__file__).resolve().parent.parent / "img" / "cenas"


def reduzir(im: Image.Image, lado: int) -> Image.Image:
    im = im.copy()
    im.thumbnail((lado, lado), Image.LANCZOS)
    return im


def heroi(toca: Image.Image, largura: int = 1920, altura: int = 960) -> Image.Image:
    """Tela larga: a imagem quadrada vai à direita, na altura toda; a faixa da esquerda repete a coluna da borda (o degradê do céu) e
    é suavizada na emenda."""
    esc = toca.resize((round(toca.width * altura / toca.height), altura), Image.LANCZOS)
    tela = Image.new("RGB", (largura, altura))
    borda = esc.crop((0, 0, 4, altura)).resize((largura, altura), Image.BILINEAR).filter(ImageFilter.GaussianBlur(10))
    tela.paste(borda, (0, 0))
    x = largura - esc.width  # encostada na direita: sem faixa sobrando
    mascara = Image.linear_gradient("L").rotate(90).resize((420, altura))  # 0 -> 255 da esquerda para a direita
    alfa = Image.new("L", esc.size, 255)
    alfa.paste(mascara, (0, 0))
    tela.paste(esc, (x, 0), alfa)
    return tela


for nome in ("toca", "ponte", "mercado", "lago"):
    png = PASTA / f"{nome}.png"
    if not png.exists():
        print("sem", png.name)
        continue
    im = Image.open(png).convert("RGB")
    reduzir(im, 1300).save(PASTA / f"{nome}.webp", quality=82, method=6)
    print(nome, im.size, "->", (PASTA / f"{nome}.webp").stat().st_size // 1024, "KB")
    if nome == "toca":
        heroi(im).save(PASTA / "heroi.webp", quality=82, method=6)
        print("heroi.webp", (PASTA / "heroi.webp").stat().st_size // 1024, "KB")
