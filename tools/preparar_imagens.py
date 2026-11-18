"""Copia para o site só os ícones do pacote VULPUS_Asset_Pack que a gente realmente usa, já em WebP e em 256 px.
   python tools/preparar_imagens.py [pasta_do_pacote]

Por que "só os que usamos": o pacote tem 240 arquivos (o README diz 200), mas só uns 99 desenhos distintos. Vários nomes são o MESMO
desenho (ex.: discord, help, menu, chat, dashboard, faq... são todos o mesmo bloco de texto azul). Um ícone com nome de Discord que
desenha um papel confunde quem olha, então esses ficam de fora. A lista abaixo é o que serve de verdade para o que a gente quer dizer.
"""
import sys
from pathlib import Path
from PIL import Image

PACOTE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\Users\Desktop\Downloads\VULPUS_Asset_Pack_200")
SAIDA = Path(__file__).resolve().parent.parent / "img" / "vulpus"

USADOS = {
    "03_vulpus_identity": ["badge_kitsune_x", "vulpus_crest", "fox_head", "fox_tail", "kitsune_mask", "lantern_emblem", "tail_flame"],
    "07_badges_and_frames": ["badge_kitsune", "badge_founder"],
    "05_economy_rewards": ["cauda_coin", "coin_stack", "quest_scroll", "gift", "treasure_chest", "compass", "star_token", "rank_badge"],
    "01_nature": ["pine_tree", "autumn_tree", "lantern_tree", "mushroom", "crescent_moon", "campfire"],
    "02_medieval": ["tavern", "wooden_house"],
}

SAIDA.mkdir(parents=True, exist_ok=True)
feitos = 0
for pasta, nomes in USADOS.items():
    for nome in nomes:
        origem = PACOTE / pasta / f"{nome}.png"
        if not origem.exists():
            continue
        im = Image.open(origem).convert("RGBA").resize((256, 256), Image.LANCZOS)
        im.save(SAIDA / f"{nome}.webp", quality=88, method=6)
        feitos += 1
print(feitos, "ícones em", SAIDA)
