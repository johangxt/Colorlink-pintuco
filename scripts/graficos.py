"""Genera los gráficos del informe estadístico a partir de docs/estadisticas/resultados.json.
Uso:  pip install matplotlib   y luego   python scripts/graficos.py
"""
import json
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

BASE = os.path.join(os.path.dirname(__file__), "..", "docs", "estadisticas")
with open(os.path.join(BASE, "resultados.json"), encoding="utf-8") as f:
    e = json.load(f)

AZUL, NARANJA, GRIS = "#0b5c8a", "#f2a541", "#9aa5ae"
plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False, "figure.dpi": 150})

def guardar(fig, nombre):
    fig.tight_layout()
    fig.savefig(os.path.join(BASE, nombre))
    plt.close(fig)
    print("✔", nombre)

# 1. Ventas por día
d = e["ventas_por_dia"]
fig, ax = plt.subplots(figsize=(9, 3.6))
ax.plot([x["fecha"][5:] for x in d], [x["total"] / 1e6 for x in d], color=AZUL, marker="o", ms=3, lw=1.8)
ax.set_title("Ventas diarias (compras + servicios)", loc="left", fontweight="bold")
ax.set_ylabel("Millones de COP")
ax.tick_params(axis="x", rotation=60, labelsize=7)
ax.grid(axis="y", alpha=.3)
guardar(fig, "g1_ventas_por_dia.png")

# 2. Galones por pintura
t = sorted(e["top_pinturas"], key=lambda x: x["galones"])
fig, ax = plt.subplots(figsize=(8, 3.8))
ax.barh([x["nombre"] for x in t], [x["galones"] for x in t], color=AZUL)
for i, x in enumerate(t):
    ax.text(x["galones"] + 2, i, str(x["galones"]), va="center", fontsize=8)
ax.set_title("Galones vendidos por producto", loc="left", fontweight="bold")
ax.set_xlabel("Galones")
guardar(fig, "g2_galones_por_pintura.png")

# 3. Solicitudes por estado
s = e["solicitudes_por_estado"]
etq = {"pendiente": "Pendiente", "aceptada": "Aceptada", "en_proceso": "En proceso", "completada": "Completada", "cancelada": "Cancelada"}
fig, ax = plt.subplots(figsize=(6.5, 3.4))
ax.bar([etq[k] for k in s], list(s.values()), color=[GRIS, AZUL, AZUL, "#2e8b57", "#c0392b"])
for i, v in enumerate(s.values()):
    ax.text(i, v + 0.8, str(v), ha="center", fontsize=9)
ax.set_title("Solicitudes de servicio por estado", loc="left", fontweight="bold")
guardar(fig, "g3_solicitudes_estado.png")

# 4. Ranking de pintores
r = sorted([x for x in e["ranking_pintores"] if x["calificaciones"]], key=lambda x: x["promedio"])
fig, ax = plt.subplots(figsize=(7, 3.4))
ax.barh([f'{x["nombre"]} (n={x["calificaciones"]})' for x in r], [x["promedio"] for x in r], color=NARANJA)
ax.axvline(e["resumen"]["calificacion_promedio"], color=AZUL, ls="--", lw=1.2, label=f'Promedio general {e["resumen"]["calificacion_promedio"]}')
ax.set_xlim(0, 5)
ax.set_title("Calificación promedio por pintor (1–5)", loc="left", fontweight="bold")
ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.12), fontsize=8, frameon=False)
guardar(fig, "g4_ranking_pintores.png")

# 5. Distribución de calificaciones
dc = e["distribucion_calificaciones"]
fig, ax = plt.subplots(figsize=(6, 3.2))
ax.bar([f'{x["estrellas"]}★' for x in dc], [x["cantidad"] for x in dc], color=NARANJA)
ax.set_title("Distribución de calificaciones", loc="left", fontweight="bold")
ax.set_ylabel("Cantidad")
guardar(fig, "g5_distribucion_calificaciones.png")

# 6. Histograma de área solicitada
import csv
with open(os.path.join(BASE, "solicitudes.csv"), encoding="utf-8") as f:
    areas = [float(row["metros_cuadrados"].strip('"')) for row in csv.DictReader(f)]
fig, ax = plt.subplots(figsize=(6.5, 3.2))
ax.hist(areas, bins=10, color=AZUL, edgecolor="white")
ax.axvline(e["area_m2"]["media"], color=NARANJA, lw=2, label=f'Media {e["area_m2"]["media"]} m²')
ax.axvline(e["area_m2"]["mediana"], color=GRIS, lw=2, ls="--", label=f'Mediana {e["area_m2"]["mediana"]} m²')
ax.set_title("Distribución del área solicitada (m²)", loc="left", fontweight="bold")
ax.legend(fontsize=8, frameon=False)
guardar(fig, "g6_histograma_area.png")
