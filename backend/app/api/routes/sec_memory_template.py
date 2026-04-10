"""
Template HTML para la Memoria Técnica SEC.
Genera un documento formal para tramitar ante la Superintendencia de
Electricidad y Combustibles (SEC) — RIC.
"""
from __future__ import annotations
from typing import Optional


def _badge(cumple: bool) -> str:
    if cumple:
        return '<span style="background:#1a7f37;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;">CUMPLE</span>'
    return '<span style="background:#cf222e;color:#fff;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;">NO CUMPLE</span>'


def _fmt(v, decimals=2, unit="") -> str:
    if v is None:
        return "—"
    try:
        s = f"{float(v):.{decimals}f}"
    except Exception:
        s = str(v)
    return f"{s} {unit}".strip()


def render_sec_memory(
    project_name: str,
    project_location: Optional[str],
    project_description: Optional[str],
    user_name: str,
    demand: dict,
    calculations: list[dict],   # list of {input_data, result_data, name, created_at}
    fecha: str,
    numero_memoria: str = "001",
) -> str:

    # ── Circuitos HTML ────────────────────────────────────────────────────────
    cuadro_rows = ""
    detalle_circuitos = ""

    for i, c in enumerate(calculations, 1):
        inp = c.get("input_data", {})
        res = c.get("result_data", {})
        nombre = c.get("name") or f"Circuito {i}"
        cumple = res.get("cumple", False)
        prot = res.get("proteccion") or {}
        tm = prot.get("termomagnetico") or {}
        diff = prot.get("diferencial") or {}

        cuadro_rows += f"""
        <tr>
          <td>{i}</td>
          <td>{nombre}</td>
          <td style="text-transform:capitalize">{inp.get('sistema','—')}</td>
          <td>{_fmt(inp.get('tension_v'), 0, 'V')}</td>
          <td>{_fmt(inp.get('potencia_kw'), 2, 'kW')}</td>
          <td>{_fmt(inp.get('factor_demanda'), 2)}</td>
          <td>{_fmt(float(inp.get('potencia_kw', 0)) * float(inp.get('factor_demanda', 1)), 2, 'kW')}</td>
          <td>{_fmt(res.get('i_diseno_a'), 2, 'A')}</td>
          <td class="mono">{_fmt(res.get('seccion_mm2'), 1, 'mm²')}</td>
          <td>{_badge(cumple)}</td>
        </tr>"""

        # Detalle individual por circuito
        prot_html = ""
        if tm:
            prot_html = f"""
            <div class="section-title" style="margin-top:14px;">Protección recomendada</div>
            <table class="data-table">
              <tr><td>Termomagnético</td><td class="val">{tm.get('descripcion','—')}</td></tr>
              <tr><td>Tipo / Curva</td><td class="val">{tm.get('tipo','—')} — Curva {tm.get('curva','—')}</td></tr>
              <tr><td>Diferencial</td><td class="val">{diff.get('descripcion','—')}</td></tr>
              <tr><td>Verificación RIC 4.4</td><td class="val">{_badge(prot.get('cumple', False))}</td></tr>
            </table>"""

        detalle_circuitos += f"""
        <div class="circuit-block" style="page-break-inside:avoid;margin-bottom:28px;">
          <div class="circuit-header">
            Circuito {i} — {nombre}
            <span style="float:right">{_badge(cumple)}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
            <div>
              <div class="section-title">Datos de entrada</div>
              <table class="data-table">
                <tr><td>Sistema</td><td class="val" style="text-transform:capitalize">{inp.get('sistema','—')}</td></tr>
                <tr><td>Tensión nominal</td><td class="val">{_fmt(inp.get('tension_v'), 0, 'V')}</td></tr>
                <tr><td>Potencia</td><td class="val">{_fmt(inp.get('potencia_kw'), 2, 'kW')}</td></tr>
                <tr><td>Factor de potencia</td><td class="val">{_fmt(inp.get('factor_potencia'), 2)}</td></tr>
                <tr><td>Factor de demanda</td><td class="val">{_fmt(inp.get('factor_demanda'), 2)}</td></tr>
                <tr><td>Longitud</td><td class="val">{_fmt(inp.get('longitud_m'), 1, 'm')}</td></tr>
                <tr><td>Material</td><td class="val">{str(inp.get('material','')).upper()}</td></tr>
                <tr><td>Tipo canalización</td><td class="val">{str(inp.get('tipo_canalizacion','')).replace('_',' ')}</td></tr>
                <tr><td>Temperatura ambiente</td><td class="val">{_fmt(inp.get('temp_ambiente_c'), 0, '°C')}</td></tr>
                <tr><td>Circuitos agrupados</td><td class="val">{inp.get('circuitos_agrupados','—')}</td></tr>
                <tr><td>Altitud</td><td class="val">{_fmt(inp.get('msnm'), 0, 'msnm')}</td></tr>
              </table>
            </div>
            <div>
              <div class="section-title">Resultados</div>
              <table class="data-table">
                <tr><td>Sección seleccionada</td><td class="val mono">{_fmt(res.get('seccion_mm2'), 1, 'mm²')}</td></tr>
                <tr><td>Calibre AWG</td><td class="val mono">{res.get('calibre_awg','—')}</td></tr>
                <tr><td>Corriente de diseño (Ib)</td><td class="val mono">{_fmt(res.get('i_diseno_a'), 2, 'A')}</td></tr>
                <tr><td>Corriente máx. corregida (Iz)</td><td class="val mono">{_fmt(res.get('i_max_corregida_a'), 2, 'A')}</td></tr>
                <tr><td>Caída de tensión</td><td class="val mono">{_fmt(res.get('caida_pct'), 3, '%')}</td></tr>
                <tr><td>Límite caída</td><td class="val mono">{_fmt(res.get('limite_caida_pct'), 1, '%')}</td></tr>
                <tr><td>Sección neutro</td><td class="val mono">{_fmt(res.get('sec_neutro_mm2'), 1, 'mm²')}</td></tr>
                <tr><td>Sección tierra (PE)</td><td class="val mono">{_fmt(res.get('sec_tierra_mm2'), 1, 'mm²')}</td></tr>
                <tr><td>Ft / Fg / Fa</td><td class="val mono">{_fmt(res.get('ft'),3)} / {_fmt(res.get('fg'),3)} / {_fmt(res.get('fa'),3)}</td></tr>
                <tr><td>Factor total Fc</td><td class="val mono">{_fmt(res.get('factor_total'), 3)}</td></tr>
              </table>
              {prot_html}
            </div>
          </div>
        </div>"""

    # ── Resumen demanda ───────────────────────────────────────────────────────
    tasa = demand.get("tasa_cumplimiento_pct", 0)
    tasa_color = "#1a7f37" if tasa >= 100 else ("#e36209" if tasa >= 80 else "#cf222e")

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1c2128;
    background: #fff;
    padding: 0;
  }}
  .cover {{
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 60px 40px;
    page-break-after: always;
  }}
  .cover-brand {{
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #444;
    border-bottom: 3px solid #0969da;
    padding-bottom: 12px;
    margin-bottom: 48px;
  }}
  .cover-title {{
    font-size: 26px;
    font-weight: 800;
    color: #0969da;
    line-height: 1.3;
    margin-bottom: 8px;
  }}
  .cover-subtitle {{
    font-size: 14px;
    color: #555;
    margin-bottom: 48px;
  }}
  .cover-meta {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    overflow: hidden;
    max-width: 520px;
  }}
  .cover-meta-item {{
    padding: 10px 14px;
    border-bottom: 1px solid #d0d7de;
  }}
  .cover-meta-item:nth-child(odd) {{ background: #f6f8fa; }}
  .cover-meta-label {{ font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 2px; }}
  .cover-meta-value {{ font-size: 12px; font-weight: 600; color: #1c2128; }}
  .cover-footer {{
    border-top: 1px solid #d0d7de;
    padding-top: 12px;
    font-size: 10px;
    color: #888;
  }}

  /* Content pages */
  .page {{ padding: 20mm 15mm; }}
  h1.page-title {{
    font-size: 16px;
    font-weight: 700;
    color: #0969da;
    border-bottom: 2px solid #0969da;
    padding-bottom: 6px;
    margin-bottom: 16px;
  }}
  h2.section-header {{
    font-size: 13px;
    font-weight: 700;
    color: #1c2128;
    background: #f6f8fa;
    border-left: 4px solid #0969da;
    padding: 6px 10px;
    margin: 20px 0 10px;
  }}
  .section-title {{
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #555;
    margin: 10px 0 6px;
  }}

  /* Tables */
  .main-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-bottom: 16px;
  }}
  .main-table th {{
    background: #0969da;
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}
  .main-table td {{
    padding: 5px 8px;
    border-bottom: 1px solid #d0d7de;
    vertical-align: middle;
  }}
  .main-table tr:nth-child(even) td {{ background: #f6f8fa; }}

  .data-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin-bottom: 8px;
  }}
  .data-table td {{
    padding: 4px 8px;
    border-bottom: 1px solid #eee;
  }}
  .data-table td:first-child {{ color: #555; width: 55%; }}
  .data-table .val {{ font-weight: 600; color: #1c2128; }}
  .mono {{ font-family: 'Courier New', monospace; }}

  /* KPI cards */
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 16px 0;
  }}
  .kpi-card {{
    border: 1px solid #d0d7de;
    border-radius: 4px;
    padding: 10px 12px;
    background: #f6f8fa;
  }}
  .kpi-label {{ font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }}
  .kpi-value {{ font-size: 18px; font-weight: 700; color: #0969da; font-family: 'Courier New', monospace; }}
  .kpi-unit {{ font-size: 10px; color: #555; margin-left: 2px; }}

  /* Circuit block */
  .circuit-block {{
    border: 1px solid #d0d7de;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 20px;
  }}
  .circuit-header {{
    background: #0969da;
    color: #fff;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 700;
  }}
  .circuit-block > div:last-child {{ padding: 12px; }}

  /* Footer */
  .page-footer {{
    margin-top: 30px;
    border-top: 1px solid #d0d7de;
    padding-top: 8px;
    font-size: 9px;
    color: #888;
    display: flex;
    justify-content: space-between;
  }}
</style>
</head>
<body>

<!-- ═══════════════════════ PORTADA ═══════════════════════════════════════ -->
<div class="cover">
  <div>
    <div class="cover-brand">RIC CONDUCTOR.CALC — NCh ELEC 4/2003</div>
    <div class="cover-title">Memoria Técnica de Cálculo<br>de Instalación Eléctrica</div>
    <div class="cover-subtitle">Conforme RIC — Chile</div>

    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Proyecto</div>
        <div class="cover-meta-value">{project_name}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">N° Memoria</div>
        <div class="cover-meta-value">{numero_memoria}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Ubicación</div>
        <div class="cover-meta-value">{project_location or '—'}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Fecha</div>
        <div class="cover-meta-value">{fecha}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Proyectista</div>
        <div class="cover-meta-value">{user_name}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Normativa</div>
        <div class="cover-meta-value">RIC</div>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    Documento generado por RIC Conductor.calc — Uso exclusivo para tramitación SEC.
    Los resultados son de responsabilidad del proyectista firmante.
  </div>
</div>

<!-- ═══════════════════════ SECCIÓN 1: DESCRIPCIÓN ════════════════════════ -->
<div class="page">
  <h1 class="page-title">1. Descripción del Proyecto</h1>

  <table class="data-table" style="max-width:480px">
    <tr><td>Nombre del proyecto</td><td class="val">{project_name}</td></tr>
    <tr><td>Descripción</td><td class="val">{project_description or '—'}</td></tr>
    <tr><td>Ubicación / Dirección</td><td class="val">{project_location or '—'}</td></tr>
    <tr><td>Proyectista responsable</td><td class="val">{user_name}</td></tr>
    <tr><td>Fecha de cálculo</td><td class="val">{fecha}</td></tr>
    <tr><td>N° de circuitos calculados</td><td class="val">{demand.get('total_circuitos', 0)}</td></tr>
    <tr><td>Sistema predominante</td><td class="val" style="text-transform:capitalize">{demand.get('sistema_predominante','—')}</td></tr>
    <tr><td>Normativa aplicable</td><td class="val">RIC</td></tr>
    <tr><td>Estándar de conductores</td><td class="val">IEC 60228 / NCh 23</td></tr>
    <tr><td>Factores de corrección</td><td class="val">RIC Tablas 5-3, 5-4 / IEC 60364-5-52</td></tr>
  </table>

<!-- ═══════════════════════ SECCIÓN 2: DEMANDA ════════════════════════════ -->
  <h1 class="page-title" style="margin-top:24px;">2. Demanda Máxima y Empalme</h1>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Potencia instalada</div>
      <div class="kpi-value">{_fmt(demand.get('potencia_instalada_kw'), 1)}<span class="kpi-unit">kW</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Demanda máxima</div>
      <div class="kpi-value">{_fmt(demand.get('demanda_maxima_kw'), 1)}<span class="kpi-unit">kW</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Potencia aparente</div>
      <div class="kpi-value">{_fmt(demand.get('demanda_maxima_kva'), 1)}<span class="kpi-unit">kVA</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Corriente empalme</div>
      <div class="kpi-value">{_fmt(demand.get('corriente_empalme_a'), 1)}<span class="kpi-unit">A</span></div>
    </div>
  </div>

  <table class="data-table" style="max-width:420px">
    <tr><td>Factor de potencia promedio</td><td class="val mono">{_fmt(demand.get('factor_potencia_promedio'), 3)}</td></tr>
    <tr><td>Tensión de empalme</td><td class="val mono">{_fmt(demand.get('tension_empalme_v'), 0, 'V')}</td></tr>
    <tr><td>Sistema</td><td class="val" style="text-transform:capitalize">{demand.get('sistema_predominante','—')}</td></tr>
    <tr><td>Sección máxima en el proyecto</td><td class="val mono">{_fmt(demand.get('seccion_max_mm2'), 1, 'mm²')}</td></tr>
    <tr><td>Circuitos totales</td><td class="val">{demand.get('total_circuitos', 0)}</td></tr>
    <tr><td>Circuitos conformes RIC</td><td class="val" style="color:{tasa_color}">{demand.get('circuitos_cumplen', 0)} de {demand.get('total_circuitos', 0)} ({tasa:.1f}%)</td></tr>
  </table>

<!-- ═══════════════════════ SECCIÓN 3: CUADRO DE CARGAS ══════════════════ -->
  <h1 class="page-title" style="margin-top:24px;">3. Cuadro de Cargas</h1>

  <table class="main-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Circuito</th>
        <th>Sistema</th>
        <th>Tensión</th>
        <th>P. Inst.</th>
        <th>Fd</th>
        <th>Demanda</th>
        <th>Id (A)</th>
        <th>Sección</th>
        <th>RIC</th>
      </tr>
    </thead>
    <tbody>
      {cuadro_rows}
      <tr style="font-weight:700;background:#e8f0fe">
        <td colspan="4" style="text-align:right;">TOTALES</td>
        <td>{_fmt(demand.get('potencia_instalada_kw'), 2, 'kW')}</td>
        <td>—</td>
        <td>{_fmt(demand.get('demanda_maxima_kw'), 2, 'kW')}</td>
        <td>—</td>
        <td>{_fmt(demand.get('seccion_max_mm2'), 1, 'mm²')}</td>
        <td>{_badge(demand.get('tasa_cumplimiento_pct', 0) >= 100)}</td>
      </tr>
    </tbody>
  </table>

<!-- ═══════════════════════ SECCIÓN 4: CÁLCULOS DETALLADOS ═══════════════ -->
  <h1 class="page-title" style="margin-top:24px; page-break-before:always;">4. Cálculo Detallado por Circuito</h1>
  {detalle_circuitos}

<!-- ═══════════════════════ SECCIÓN 5: DECLARACIÓN ══════════════════════ -->
  <div style="page-break-before:always;margin-top:20px;">
    <h1 class="page-title">5. Declaración de Conformidad</h1>

    <p style="line-height:1.8;margin-bottom:16px;">
      El suscrito, <strong>{user_name}</strong>, en calidad de proyectista responsable, declara que los
      cálculos contenidos en la presente Memoria Técnica han sido realizados conforme a la normativa
      vigente <strong>RIC (Reglamento de Instalaciones de Consumidores)</strong>,
      aplicando las fórmulas, factores de corrección y secciones mínimas establecidas en dicho reglamento.
    </p>

    <p style="line-height:1.8;margin-bottom:32px;">
      Los resultados son de exclusiva responsabilidad del proyectista firmante. La instalación deberá
      ejecutarse por un instalador eléctrico autorizado por la SEC con las categorías correspondientes.
    </p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
      <div style="border-top:1px solid #000;padding-top:8px;">
        <div style="font-size:10px;color:#555;">Firma del proyectista</div>
        <div style="margin-top:4px;font-size:11px;font-weight:600;">{user_name}</div>
        <div style="font-size:10px;color:#555;">N° Registro SEC: _______________</div>
      </div>
      <div style="border-top:1px solid #000;padding-top:8px;">
        <div style="font-size:10px;color:#555;">Lugar y fecha</div>
        <div style="margin-top:4px;font-size:11px;">{project_location or 'Chile'}, {fecha}</div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>RIC Conductor.calc — RIC · Memoria N° {numero_memoria} · {project_name}</span>
    <span>Generado el {fecha}</span>
  </div>
</div>

</body>
</html>"""
