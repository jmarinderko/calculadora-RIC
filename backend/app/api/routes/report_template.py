"""
Generador del template HTML para memoria de cálculo SEC.
Produce HTML auto-contenido (sin dependencias externas) listo para Puppeteer.
"""
import html as _html
from typing import Any


def _esc(v: Any) -> str:
    """Escapa un valor para inyección segura en HTML (XSS)."""
    if v is None:
        return "—"
    return _html.escape(str(v), quote=True)


# ── Mappings legibles ─────────────────────────────────────────────────────────

_SISTEMA = {"trifasico": "Trifásico", "bifasico": "Bifásico", "monofasico": "Monofásico"}
_MATERIAL = {"cu": "Cobre (Cu)", "al": "Aluminio (Al)"}
_CANALIZACION = {
    "ducto_pvc": "Ducto PVC",
    "ducto_metalico": "Ducto metálico (conduit)",
    "bandeja_perforada": "Bandeja portacables perforada",
    "bandeja_escalera": "Bandeja tipo escalera al aire",
    "enterrado_directo": "Enterrado directo en tierra",
    "enterrado_ducto": "Enterrado en ducto bajo tierra",
    "aereo_libre": "Cable aéreo al aire libre",
}
_CIRCUITO = {
    "alumbrado": "Alumbrado",
    "fuerza": "Fuerza motriz",
    "tomacorrientes": "Tomacorrientes",
    "motor": "Motor eléctrico",
    "alimentador": "Alimentador general",
}
_FALLA = {"3f": "Trifásico (3F)", "2f": "Bifásico (2F)", "2ft": "Bifásico a tierra (2FT)", "1ft": "Monofásico a tierra (1FT)"}


def _f(v: Any, dec: int = 2) -> str:
    """Formatea un número; retorna '—' si es None."""
    if v is None:
        return "—"
    try:
        return f"{float(v):.{dec}f}"
    except (TypeError, ValueError):
        return str(v)


def _badge(ok: bool) -> str:
    color = "#1a7f37" if ok else "#cf222e"
    bg = "#dafbe1" if ok else "#ffebe9"
    text = "CUMPLE" if ok else "NO CUMPLE"
    return (
        f'<span style="background:{bg};color:{color};border:1px solid {color};'
        f'border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;'
        f'letter-spacing:.06em;">{text}</span>'
    )


def render_html(
    input_data: dict,
    result_data: dict,
    calc_name: str,
    project_name: str,
    project_location: str,
    user_name: str,
    calc_date: str,
) -> str:
    """
    Renderiza el HTML completo de la memoria de cálculo SEC.
    Todos los estilos son inline/interno para compatibilidad con Puppeteer.
    """
    # Sanitización de campos controlados por el usuario (XSS). Los valores
    # calculados por el backend (r, input_data) se consideran confiables para
    # cifras numéricas; textos de usuario se escapan abajo.
    calc_name = _esc(calc_name)
    project_name = _esc(project_name)
    project_location = _esc(project_location)
    user_name = _esc(user_name)
    calc_date = _esc(calc_date)

    inp = input_data
    r = result_data
    rc = r.get("radio_curvatura") or {}
    et = r.get("estres_termico") or {}
    advertencias: list = r.get("advertencias") or []

    sistema_label = _SISTEMA.get(inp.get("sistema", ""), inp.get("sistema", ""))
    material_label = _MATERIAL.get(inp.get("material", ""), inp.get("material", ""))
    canal_label = _CANALIZACION.get(inp.get("tipo_canalizacion", ""), inp.get("tipo_canalizacion", ""))
    circ_label = _CIRCUITO.get(inp.get("tipo_circuito", ""), inp.get("tipo_circuito", ""))
    falla_label = _falla = _FALLA.get(inp.get("tipo_falla", "3f"), inp.get("tipo_falla", ""))

    cumple_ok = r.get("cumple", False)
    cumple_termico = r.get("cumple_termico", False)
    cumple_caida = r.get("cumple_caida", False)

    # Caída de tensión — barra visual
    caida_pct = float(r.get("caida_pct", 0))
    lim_pct = float(r.get("limite_caida_pct", 3))
    bar_fill = min(caida_pct / lim_pct * 100, 110) if lim_pct > 0 else 0
    bar_color = "#1a7f37" if caida_pct <= lim_pct * 0.75 else ("#d29922" if caida_pct <= lim_pct else "#cf222e")

    # Estrés térmico
    et_section = ""
    if et:
        et_cumple = et.get("cumple", False)
        et_color = "#1a7f37" if et_cumple else "#cf222e"
        et_section = f"""
        <div class="section">
          <div class="section-title">5. Estrés térmico por cortocircuito (IEC 60949)</div>
          <table>
            <tr><th>Parámetro</th><th>Valor</th><th>Unidad</th></tr>
            <tr><td>Tipo de falla</td><td>{et.get('tipo_falla','—')}</td><td>—</td></tr>
            <tr><td>Icc efectiva</td><td>{_f(et.get('icc_efectiva_ka'),3)}</td><td>kA</td></tr>
            <tr><td>Factor de falla</td><td>{_f(et.get('factor_falla'),2)}</td><td>×</td></tr>
            <tr><td>Constante K</td><td>{et.get('k_const','—')}</td><td>A·s½/mm²</td></tr>
            <tr><td>Sección mínima térmica</td><td>{_f(et.get('sec_min_termica_mm2'),1)}</td><td>mm²</td></tr>
            <tr><td>Icc máx. soportada</td><td>{_f(et.get('icc_max_soportada_ka'),3)}</td><td>kA</td></tr>
            <tr><td>Energía específica I²t</td><td>{_f(float(et.get('i2t_ja',0))/1e6,2)}</td><td>MA²s</td></tr>
            <tr><td>I²t máximo admisible</td><td>{_f(float(et.get('i2t_max_ja',0))/1e6,2)}</td><td>MA²s</td></tr>
            <tr><td>Temperatura final estimada</td><td>{_f(et.get('t_final_estimada_c'),1)}</td><td>°C</td></tr>
            <tr><td>Temperatura máx. admisible</td><td>{et.get('t_max_c','—')}</td><td>°C</td></tr>
            <tr><td>Resultado</td>
              <td colspan="2" style="color:{et_color};font-weight:700;">
                {'CUMPLE IEC 60949' if et_cumple else 'NO CUMPLE IEC 60949'}
              </td>
            </tr>
          </table>
        </div>
        """

    # Advertencias
    adv_html = ""
    if advertencias:
        items = "".join(f"<li>{_esc(a)}</li>" for a in advertencias)
        adv_html = f"""
        <div class="warn-box">
          <strong>Advertencias del cálculo:</strong>
          <ul style="margin:6px 0 0 18px;padding:0;">{items}</ul>
        </div>
        """

    # Ajustes normativos
    ajustes = []
    if r.get("ajustado_por_minimo"):
        ajustes.append(f"Sección aumentada al mínimo normativo RIC Art. 5.3.1: {r.get('sec_min_ric_mm2')} mm²")
    if r.get("ajustado_por_caida"):
        ajustes.append(f"Sección aumentada por criterio caída de tensión. ΔV = {_f(caida_pct)}% vs. límite {lim_pct}%")
    ajuste_html = ""
    if ajustes:
        items = "".join(f"<li>{a}</li>" for a in ajustes)
        ajuste_html = f"""
        <div class="info-box">
          <strong>Ajustes normativos aplicados:</strong>
          <ul style="margin:6px 0 0 18px;padding:0;">{items}</ul>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Memoria de Cálculo RIC — {calc_name}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11px;
    color: #1c2128;
    background: #fff;
    padding: 0;
  }}
  .page {{ padding: 20mm 15mm; max-width: 210mm; margin: 0 auto; }}

  /* ── Encabezado ── */
  .header {{
    border-bottom: 3px solid #0969da;
    padding-bottom: 12px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }}
  .header-left h1 {{
    font-size: 16px;
    font-weight: 700;
    color: #0969da;
    margin-bottom: 2px;
  }}
  .header-left .sub {{
    font-size: 10px;
    color: #57606a;
  }}
  .header-right {{
    text-align: right;
    font-size: 10px;
    color: #57606a;
    line-height: 1.6;
  }}

  /* ── Resumen ejecutivo ── */
  .summary-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }}
  .summary-card {{
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 10px 12px;
    text-align: center;
  }}
  .summary-card .sc-label {{
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #57606a;
    margin-bottom: 4px;
  }}
  .summary-card .sc-value {{
    font-size: 22px;
    font-weight: 700;
    color: #0969da;
    line-height: 1;
  }}
  .summary-card .sc-unit {{
    font-size: 11px;
    font-weight: 400;
    color: #57606a;
    margin-left: 2px;
  }}
  .summary-card .sc-sub {{
    font-size: 9px;
    color: #57606a;
    margin-top: 3px;
  }}
  .summary-card.card-ok {{ border-color: #1a7f37; background: #f0fff4; }}
  .summary-card.card-err {{ border-color: #cf222e; background: #fff0f0; }}

  /* ── Secciones ── */
  .section {{ margin-bottom: 18px; }}
  .section-title {{
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: #0969da;
    border-bottom: 1px solid #d0d7de;
    padding-bottom: 4px;
    margin-bottom: 10px;
  }}

  /* ── Tablas ── */
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }}
  th {{
    background: #f6f8fa;
    color: #57606a;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: .05em;
    padding: 5px 8px;
    border: 1px solid #d0d7de;
    text-align: left;
  }}
  td {{
    padding: 5px 8px;
    border: 1px solid #d0d7de;
    vertical-align: top;
  }}
  tr:nth-child(even) td {{ background: #f6f8fa; }}
  .val-ok {{ color: #1a7f37; font-weight: 600; }}
  .val-err {{ color: #cf222e; font-weight: 600; }}
  .val-warn {{ color: #9a6700; font-weight: 600; }}
  .val-accent {{ color: #0969da; font-weight: 700; }}

  /* ── Barra caída ── */
  .bar-wrap {{ margin: 8px 0; }}
  .bar-label {{
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #57606a;
    margin-bottom: 3px;
  }}
  .bar-bg {{
    height: 10px;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }}
  .bar-fill {{
    height: 100%;
    border-radius: 4px;
    transition: width .3s;
  }}
  .bar-limit {{
    position: absolute;
    top: 0;
    height: 100%;
    width: 2px;
    background: #cf222e;
  }}

  /* ── Cajas informativas ── */
  .warn-box {{
    background: #fff8c5;
    border: 1px solid #d4a72c;
    border-radius: 5px;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 10px;
    color: #633c01;
  }}
  .info-box {{
    background: #ddf4ff;
    border: 1px solid #54aeff;
    border-radius: 5px;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 10px;
    color: #0550ae;
  }}

  /* ── Pie de página ── */
  .footer {{
    border-top: 1px solid #d0d7de;
    padding-top: 10px;
    margin-top: 24px;
    font-size: 9px;
    color: #57606a;
    display: flex;
    justify-content: space-between;
  }}
  .footer .norma {{
    font-weight: 600;
    color: #0969da;
  }}

  @media print {{
    .page {{ padding: 0; }}
  }}
</style>
</head>
<body>
<div class="page">

  <!-- ── ENCABEZADO ── -->
  <div class="header">
    <div class="header-left">
      <h1>Memoria de Cálculo de Conductores Eléctricos</h1>
      <div class="sub">
        Calculado según <strong>RIC</strong> &nbsp;·&nbsp;
        Reglamento de Instalaciones de Consumo — SEC Chile
      </div>
    </div>
    <div class="header-right">
      <div><strong>Proyecto:</strong> {project_name or '—'}</div>
      <div><strong>Ubicación:</strong> {project_location or '—'}</div>
      <div><strong>Cálculo:</strong> {calc_name}</div>
      <div><strong>Fecha:</strong> {calc_date}</div>
      <div><strong>Calculado por:</strong> {user_name}</div>
    </div>
  </div>

  <!-- ── RESUMEN EJECUTIVO ── -->
  <div class="summary-grid">
    <div class="summary-card {'card-ok' if cumple_ok else 'card-err'}">
      <div class="sc-label">Resultado RIC</div>
      <div class="sc-value" style="font-size:14px;color:{'#1a7f37' if cumple_ok else '#cf222e'};">
        {'CUMPLE' if cumple_ok else 'NO CUMPLE'}
      </div>
      <div class="sc-sub">RIC</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Sección elegida</div>
      <div class="sc-value">{r.get('seccion_mm2','—')}<span class="sc-unit">mm²</span></div>
      <div class="sc-sub">{r.get('calibre_awg','—')} · {material_label}</div>
    </div>
    <div class="summary-card {'card-ok' if cumple_termico else 'card-err'}">
      <div class="sc-label">Corriente diseño</div>
      <div class="sc-value">{_f(r.get('i_diseno_a'),1)}<span class="sc-unit">A</span></div>
      <div class="sc-sub">I_max: {_f(r.get('i_max_corregida_a'),1)} A</div>
    </div>
    <div class="summary-card {'card-ok' if cumple_caida else 'card-err'}">
      <div class="sc-label">Caída de tensión</div>
      <div class="sc-value">{_f(caida_pct)}<span class="sc-unit">%</span></div>
      <div class="sc-sub">Límite: {lim_pct}%</div>
    </div>
  </div>

  {ajuste_html}
  {adv_html}

  <!-- ── 1. PARÁMETROS DE ENTRADA ── -->
  <div class="section">
    <div class="section-title">1. Parámetros del sistema eléctrico</div>
    <table>
      <tr><th>Parámetro</th><th>Valor</th><th>Parámetro</th><th>Valor</th></tr>
      <tr>
        <td>Sistema eléctrico</td><td class="val-accent">{sistema_label}</td>
        <td>Tensión de servicio</td><td class="val-accent">{inp.get('tension_v','—')} V</td>
      </tr>
      <tr>
        <td>Potencia de la carga</td><td>{inp.get('potencia_kw','—')} kW</td>
        <td>Factor de potencia (cos φ)</td><td>{inp.get('factor_potencia','—')}</td>
      </tr>
      <tr>
        <td>Factor de demanda (Fd)</td><td>{inp.get('factor_demanda','—')}</td>
        <td>Longitud del circuito</td><td>{inp.get('longitud_m','—')} m</td>
      </tr>
      <tr>
        <td>Material del conductor</td><td>{material_label}</td>
        <td>Tipo de circuito (RIC)</td><td>{circ_label}</td>
      </tr>
      <tr>
        <td>Tipo de canalización</td><td>{canal_label}</td>
        <td>Montaje</td><td>{inp.get('montaje','—')}</td>
      </tr>
    </table>
  </div>

  <!-- ── 2. FACTORES DE CORRECCIÓN ── -->
  <div class="section">
    <div class="section-title">2. Factores de corrección RIC (Tabla 5-3 / 5-4 / IEC 60364-5-52)</div>
    <table>
      <tr><th>Factor</th><th>Descripción</th><th>Valor aplicado</th><th>Base normativa</th></tr>
      <tr>
        <td><strong>Ft</strong></td>
        <td>Temperatura ambiente ({inp.get('temp_ambiente_c','—')}°C)</td>
        <td class="val-warn">{r.get('ft','—')}</td>
        <td>RIC Tabla 5-3</td>
      </tr>
      <tr>
        <td><strong>Fg</strong></td>
        <td>Agrupamiento ({inp.get('circuitos_agrupados','—')} circuito(s))</td>
        <td class="val-warn">{r.get('fg','—')}</td>
        <td>RIC Tabla 5-4</td>
      </tr>
      <tr>
        <td><strong>Fa</strong></td>
        <td>Altitud ({inp.get('msnm',0)} msnm)</td>
        <td class="{'val-warn' if float(r.get('fa',1)) < 1 else 'val-ok'}">{r.get('fa','—')}</td>
        <td>IEC 60364-5-52 Tabla B.52.15</td>
      </tr>
      <tr>
        <td><strong>Fc = Ft × Fg × Fa</strong></td>
        <td>Factor de corrección total</td>
        <td class="val-accent">{_f(r.get('factor_total'),3)}</td>
        <td>—</td>
      </tr>
    </table>
  </div>

  <!-- ── 3. RESULTADOS ── -->
  <div class="section">
    <div class="section-title">3. Resultados del dimensionamiento</div>
    <table>
      <tr><th>Parámetro</th><th>Valor</th><th>Unidad</th><th>Estado</th></tr>
      <tr>
        <td>Corriente de diseño (I_diseño)</td>
        <td>{_f(r.get('i_diseno_a'),3)}</td><td>A</td>
        <td>—</td>
      </tr>
      <tr>
        <td>Corriente con Fd (I_calc = I_diseño × Fd)</td>
        <td>{_f(r.get('i_calc_a'),3)}</td><td>A</td>
        <td>—</td>
      </tr>
      <tr>
        <td>Corriente requerida (I_req = I_calc / Fc)</td>
        <td>{_f(r.get('i_req_a'),3)}</td><td>A</td>
        <td>—</td>
      </tr>
      <tr>
        <td><strong>Sección elegida</strong></td>
        <td class="val-accent">{r.get('seccion_mm2','—')}</td><td>mm²</td>
        <td class="val-accent">{r.get('calibre_awg','—')}</td>
      </tr>
      <tr>
        <td>Cables por fase</td>
        <td>{r.get('cables_por_fase','—')}</td><td>—</td>
        <td>{'Paralelo' if int(r.get('cables_por_fase',1)) > 1 else 'Simple'}</td>
      </tr>
      <tr>
        <td>Capacidad de corriente corregida (I_max × Fc)</td>
        <td>{_f(r.get('i_max_corregida_a'),3)}</td><td>A</td>
        <td class="{'val-ok' if cumple_termico else 'val-err'}">
          {'✓ I_max > I_calc' if cumple_termico else '✗ I_max < I_calc'}
        </td>
      </tr>
      <tr>
        <td>Caída de tensión calculada</td>
        <td>{_f(caida_pct)}</td><td>%&nbsp;&nbsp;({_f(r.get('caida_v'),3)} V)</td>
        <td class="{'val-ok' if cumple_caida else 'val-err'}">
          {'✓ ΔV ≤ límite' if cumple_caida else '✗ ΔV > límite'}
        </td>
      </tr>
      <tr>
        <td>Límite caída de tensión (RIC Art. 5.5.4)</td>
        <td>{lim_pct}</td><td>%</td>
        <td>—</td>
      </tr>
      <tr>
        <td>Sección conductor neutro</td>
        <td>{r.get('sec_neutro_mm2','—')}</td><td>mm²</td>
        <td>—</td>
      </tr>
      <tr>
        <td>Sección conductor de tierra (PE)</td>
        <td>{r.get('sec_tierra_mm2','—')}</td><td>mm²</td>
        <td>—</td>
      </tr>
    </table>

    <!-- Barra caída de tensión -->
    <div class="bar-wrap">
      <div class="bar-label">
        <span>0%</span>
        <span>ΔV calculada: {_f(caida_pct)}% &nbsp;|&nbsp; Límite RIC: {lim_pct}%</span>
        <span>{_f(lim_pct * 1.1, 1)}%</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill" style="width:{bar_fill:.1f}%;background:{bar_color};"></div>
        <div class="bar-limit" style="left:90.9%;"></div>
      </div>
    </div>
  </div>

  <!-- ── 4. CONFIGURACIÓN DEL ALIMENTADOR ── -->
  <div class="section">
    <div class="section-title">4. Configuración del alimentador</div>
    <div style="padding:8px 12px;background:#f6f8fa;border:1px solid #d0d7de;border-radius:5px;font-size:10.5px;line-height:1.8;">
      <strong>Sistema:</strong> {sistema_label} · {inp.get('tension_v','—')} V<br/>
      <strong>Configuración:</strong> {r.get('descripcion_config','—')}<br/>
      <strong>Conductor tierra (PE):</strong> 1 cable × {r.get('sec_tierra_mm2','—')} mm² ({material_label})<br/>
      <strong>Radio mínimo de curvatura:</strong> {_f(rc.get('radio_mm'),1)} mm
        &nbsp;({_f(rc.get('radio_mm',0)/10,1)} cm) · factor {rc.get('factor','—')}×
        · {rc.get('tipo_constructivo','—')}<br/>
      <strong>Descripción factor curvatura:</strong> {rc.get('descripcion_factor','—')}
    </div>
  </div>

  {et_section}

  <!-- ── REFERENCIAS NORMATIVAS ── -->
  <div class="section">
    <div class="section-title">Referencias normativas aplicadas</div>
    <ul style="padding-left:18px;line-height:2;font-size:9.5px;color:#57606a;">
      <li><strong>RIC Art. 5.3</strong> — Selección de conductores por capacidad de corriente</li>
      <li><strong>RIC Art. 5.3.1</strong> — Sección mínima por tipo de circuito</li>
      <li><strong>RIC Art. 5.5.4</strong> — Límites de caída de tensión</li>
      <li><strong>RIC Art. 5.4</strong> — Tipos de canalización e instalación</li>
      <li><strong>RIC Tabla 5-3</strong> — Factor de temperatura ambiente (Ft)</li>
      <li><strong>RIC Tabla 5-4</strong> — Factor de agrupamiento de circuitos (Fg)</li>
      <li><strong>IEC 60364-5-52 Tabla B.52.15</strong> — Factor de corrección por altitud (Fa)</li>
      <li><strong>NEC 300.34 / IEC 60364-5-52</strong> — Radio mínimo de curvatura del cable</li>
      {'<li><strong>IEC 60949</strong> — Estrés térmico por cortocircuito: S_mín = Icc × √t / K</li>' if et else ''}
    </ul>
  </div>

  <!-- ── PIE DE PÁGINA ── -->
  <div class="footer">
    <div>
      <span class="norma">Calculado según RIC</span> —
      Reglamento de Instalaciones de Consumo, Superintendencia de Electricidad y Combustibles (SEC), Chile
    </div>
    <div>RIC Conductor SaaS · {calc_date}</div>
  </div>

</div>
</body>
</html>
"""
