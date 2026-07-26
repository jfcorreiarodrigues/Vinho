#!/usr/bin/env python3
"""
Gera os assets da app a partir da paleta do design system.

    python3 scripts/gerar-assets.py

Produz assets/icon.png, adaptive-icon.png, splash.png e favicon.png.
São assets de trabalho — desenhados a partir das cores de src/theme, sem
dependências de design externas. Substituir por arte definitiva antes de
submeter às lojas.
"""

from pathlib import Path

from PIL import Image, ImageDraw

BURGUNDY = (61, 11, 11)
BURGUNDY_DEEP = (42, 5, 5)
GOLD = (201, 168, 76)
GOLD_LIGHT = (232, 201, 122)
CREAM = (253, 250, 244)

RAIZ = Path(__file__).resolve().parent.parent
ASSETS = RAIZ / "assets"


def fundo(largura: int, altura: int) -> Image.Image:
    """
    Gradiente vertical burgundy. Linear e não radial de propósito: o radial
    produzia anéis de banding visíveis nos tons escuros da paleta.
    """
    img = Image.new("RGB", (largura, altura), BURGUNDY)
    d = ImageDraw.Draw(img)
    for y in range(altura):
        t = y / max(1, altura - 1)
        d.line(
            [(0, y), (largura, y)],
            fill=(
                round(BURGUNDY[0] + (BURGUNDY_DEEP[0] - BURGUNDY[0]) * t),
                round(BURGUNDY[1] + (BURGUNDY_DEEP[1] - BURGUNDY[1]) * t),
                round(BURGUNDY[2] + (BURGUNDY_DEEP[2] - BURGUNDY[2]) * t),
            ),
        )
    return img


# O traço da taça só começa no aro (topo da cuba) e acaba na base. O centro
# óptico do desenho fica portanto abaixo de `cy`; este offset compensa isso,
# senão o ícone assenta visivelmente em baixo.
TOPO_TINTA = -0.21
BASE_TINTA = 0.74
OFFSET_OPTICO = -(TOPO_TINTA + BASE_TINTA) / 2


def desenhar_taca(d: ImageDraw.ImageDraw, cx: float, cy_bruto: float, s: float, cor) -> None:
    """Taça de vinho estilizada: cuba, pé e base, centrada opticamente."""
    cy = cy_bruto + s * OFFSET_OPTICO
    largura_traco = max(2, round(s * 0.058))

    # Cuba — arco inferior de uma elipse.
    d.arc(
        [cx - s * 0.42, cy - s * 0.72, cx + s * 0.42, cy + s * 0.30],
        start=0,
        end=180,
        fill=cor,
        width=largura_traco,
    )
    # Aro superior.
    d.line(
        [(cx - s * 0.42, cy - s * 0.21), (cx + s * 0.42, cy - s * 0.21)],
        fill=cor,
        width=largura_traco,
    )
    # Pé.
    d.line([(cx, cy + s * 0.30), (cx, cy + s * 0.74)], fill=cor, width=largura_traco)
    # Base.
    d.line(
        [(cx - s * 0.30, cy + s * 0.74), (cx + s * 0.30, cy + s * 0.74)],
        fill=cor,
        width=largura_traco,
    )
    # Vinho dentro da cuba.
    d.chord(
        [cx - s * 0.34, cy - s * 0.60, cx + s * 0.34, cy + s * 0.22],
        start=20,
        end=160,
        fill=cor,
    )


def gerar_icone(lado: int, escala_taca: float, caminho: Path) -> None:
    img = fundo(lado, lado)
    d = ImageDraw.Draw(img)
    desenhar_taca(d, lado / 2, lado / 2, lado * escala_taca, GOLD)
    img.save(caminho, "PNG")
    print(f"  {caminho.relative_to(RAIZ)}  {lado}x{lado}")


def gerar_splash(largura: int, altura: int, caminho: Path) -> None:
    img = fundo(largura, altura)
    d = ImageDraw.Draw(img)
    s = min(largura, altura) * 0.24
    desenhar_taca(d, largura / 2, altura / 2 - s * 0.25, s, GOLD_LIGHT)
    # Régua dourada sob a taça, a fazer de assinatura.
    d.line(
        [
            (largura / 2 - s * 0.55, altura / 2 + s * 1.05),
            (largura / 2 + s * 0.55, altura / 2 + s * 1.05),
        ],
        fill=CREAM,
        width=max(1, int(s * 0.02)),
    )
    img.save(caminho, "PNG")
    print(f"  {caminho.relative_to(RAIZ)}  {largura}x{altura}")


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    print("A gerar assets:")

    # icon: a Apple não aceita transparência nem cantos redondos no ícone.
    gerar_icone(1024, 0.42, ASSETS / "icon.png")

    # adaptive-icon: o Android corta ~33% nas bordas, por isso a taça é menor.
    gerar_icone(1024, 0.30, ASSETS / "adaptive-icon.png")

    gerar_splash(1284, 2778, ASSETS / "splash.png")
    gerar_icone(48, 0.44, ASSETS / "favicon.png")


if __name__ == "__main__":
    main()
