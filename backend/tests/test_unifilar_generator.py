"""
Tests del generador de diagrama unifilar SVG.
Sin base de datos — el generador es Python puro (stdlib).
"""
import pytest
from app.engine.unifilar_generator import generate_unifilar


# ─── Fixtures ──────────────────────────────────────────────────────────────────

def make_resultado(**kwargs):
    """Resultado mínimo válido del cálculo RIC."""
    base = dict(
        seccion_mm2=16.0,
        calibre_awg='6 AWG',
        cables_por_fase=1,
        material='cu',
        i_diseno_a=28.5,
        i_calc_a=28.5,
        i_req_a=28.5,
        i_max_corregida_a=66.0,
        caida_pct=1.85,
        caida_v=7.03,
        limite_caida_pct=3.0,
        cumple_termico=True,
        cumple_caida=True,
        cumple=True,
        ft=1.0,
        fg=1.0,
        fa=1.0,
        factor_total=1.0,
        sec_neutro_mm2=16.0,
        sec_tierra_mm2=16.0,
        descripcion_config='1 cable(s)/fase × 3 fases + 1 cable neutro + tierra',
        ajustado_por_minimo=False,
        ajustado_por_caida=False,
        sec_min_ric_mm2=2.5,
        advertencias=[],
        radio_curvatura={},
        estres_termico=None,
    )
    base.update(kwargs)
    return base


def make_input(**kwargs):
    """Input mínimo para el generador."""
    base = dict(
        sistema='trifasico',
        tension_v=380,
        potencia_kw=15.0,
        factor_potencia=0.85,
        factor_demanda=1.0,
        longitud_m=80.0,
        material='cu',
        tipo_canalizacion='ducto_pvc',
        tipo_circuito='fuerza',
        temp_ambiente_c=30,
        circuitos_agrupados=1,
        msnm=0,
        montaje='vista',
        cables_por_fase=1,
        tipo_falla='3f',
        t_inicial_c=75,
        t_max_c=160,
    )
    base.update(kwargs)
    return base


# ─── Tests ─────────────────────────────────────────────────────────────────────

class TestSvgBasico:
    """El SVG generado debe tener estructura válida."""

    def test_empieza_con_declaracion_xml(self):
        svg = generate_unifilar(make_resultado(), make_input())
        assert svg.startswith('<?xml version="1.0"')

    def test_contiene_tag_svg(self):
        svg = generate_unifilar(make_resultado(), make_input())
        assert '<svg ' in svg

    def test_cierra_tag_svg(self):
        svg = generate_unifilar(make_resultado(), make_input())
        assert '</svg>' in svg

    def test_contiene_viewbox_800x600(self):
        svg = generate_unifilar(make_resultado(), make_input())
        assert 'viewBox="0 0 800 600"' in svg

    def test_retorna_string(self):
        result = generate_unifilar(make_resultado(), make_input())
        assert isinstance(result, str)

    def test_svg_no_vacio(self):
        svg = generate_unifilar(make_resultado(), make_input())
        assert len(svg) > 500


class TestContenidoSvg:
    """El SVG debe contener los elementos visuales principales."""

    def test_contiene_seccion_conductor(self):
        """El SVG debe mostrar la sección del conductor en mm²."""
        svg = generate_unifilar(make_resultado(seccion_mm2=16.0), make_input())
        assert '16mm²' in svg or '16' in svg

    def test_contiene_texto_ric(self):
        """El SVG debe referenciar RIC/NCh Elec 4/2003."""
        svg = generate_unifilar(make_resultado(), make_input())
        assert 'RIC' in svg or 'NCh' in svg

    def test_contiene_barra_alimentacion(self):
        """Debe haber una línea de barra de alimentación."""
        svg = generate_unifilar(make_resultado(), make_input())
        assert '<line ' in svg

    def test_contiene_color_tierra_verde(self):
        """El conductor PE debe estar en verde."""
        svg = generate_unifilar(make_resultado(), make_input())
        assert '#16a34a' in svg

    def test_contiene_color_neutro_azul(self):
        """El neutro debe estar en azul."""
        svg = generate_unifilar(make_resultado(), make_input())
        assert '#2563eb' in svg

    def test_tabla_resumen_cumple_si(self):
        """La tabla debe indicar 'CUMPLE RIC' cuando el resultado es correcto."""
        svg = generate_unifilar(make_resultado(cumple=True), make_input())
        assert 'CUMPLE' in svg

    def test_tabla_resumen_no_cumple(self):
        """La tabla debe indicar 'NO CUMPLE' cuando cumple=False."""
        svg = generate_unifilar(make_resultado(cumple=False), make_input())
        assert 'NO CUMPLE' in svg

    def test_caida_tension_en_tabla(self):
        """El valor de caída de tensión debe aparecer en la tabla."""
        svg = generate_unifilar(make_resultado(caida_pct=2.34), make_input())
        assert '2.34' in svg


class TestSistemas:
    """Funciona correctamente para los tres sistemas eléctricos."""

    def test_sistema_monofasico(self):
        svg = generate_unifilar(
            make_resultado(),
            make_input(sistema='monofasico', tension_v=220)
        )
        assert '<svg ' in svg
        assert 'Monof' in svg or '1~' in svg or 'monof' in svg.lower()

    def test_sistema_bifasico(self):
        svg = generate_unifilar(
            make_resultado(),
            make_input(sistema='bifasico', tension_v=220)
        )
        assert '<svg ' in svg
        assert '2~' in svg or 'Bif' in svg or 'bifas' in svg.lower()

    def test_sistema_trifasico(self):
        svg = generate_unifilar(
            make_resultado(),
            make_input(sistema='trifasico', tension_v=380)
        )
        assert '<svg ' in svg
        assert '3~' in svg or 'Trif' in svg

    def test_monofasico_viewbox_correcto(self):
        svg = generate_unifilar(
            make_resultado(),
            make_input(sistema='monofasico', tension_v=220)
        )
        assert 'viewBox="0 0 800 600"' in svg

    def test_bifasico_viewbox_correcto(self):
        svg = generate_unifilar(
            make_resultado(),
            make_input(sistema='bifasico', tension_v=220)
        )
        assert 'viewBox="0 0 800 600"' in svg


class TestTiposCircuito:
    """El símbolo de carga varía según el tipo de circuito."""

    def test_motor_tiene_simbolo_M(self):
        svg = generate_unifilar(
            make_resultado(),
            make_input(tipo_circuito='motor')
        )
        assert '>M<' in svg

    def test_alumbrado_no_tiene_M(self):
        svg = generate_unifilar(
            make_resultado(),
            make_input(tipo_circuito='alumbrado')
        )
        assert '>M<' not in svg

    def test_fuerza_tiene_zigzag(self):
        """La carga genérica debe tener un path de zigzag."""
        svg = generate_unifilar(
            make_resultado(),
            make_input(tipo_circuito='fuerza')
        )
        assert '<path ' in svg


class TestInputOpcional:
    """El generador funciona incluso sin input_data."""

    def test_sin_input_data(self):
        svg = generate_unifilar(make_resultado())
        assert '<svg ' in svg
        assert '</svg>' in svg

    def test_input_data_none(self):
        svg = generate_unifilar(make_resultado(), None)
        assert 'viewBox="0 0 800 600"' in svg


class TestCasosSecciones:
    """Funciona con distintas secciones de conductor."""

    @pytest.mark.parametrize("sec", [1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 95.0, 185.0])
    def test_seccion_variada(self, sec):
        svg = generate_unifilar(
            make_resultado(seccion_mm2=sec, sec_neutro_mm2=sec, sec_tierra_mm2=min(sec, 16)),
            make_input()
        )
        assert '<svg ' in svg
        assert '</svg>' in svg


class TestAdvertencias:
    """Las advertencias se muestran en la tabla resumen."""

    def test_con_advertencias(self):
        svg = generate_unifilar(
            make_resultado(advertencias=["Sección aumentada por caída de tensión."]),
            make_input()
        )
        # Debe mostrar el ícono de advertencia
        assert svg.count('<rect ') > 3   # múltiples rectángulos incluyendo la fila de advertencia

    def test_sin_advertencias_mensaje_conforme(self):
        svg = generate_unifilar(
            make_resultado(advertencias=[]),
            make_input()
        )
        assert 'conforme' in svg.lower() or 'NCh Elec' in svg
