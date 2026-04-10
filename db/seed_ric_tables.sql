-- ─── SEED: Tablas normativas RIC — RIC ──────────────────────────
-- Cargadas al iniciar la BD. Referencia para el motor de cálculo.

-- Crear tablas si no existen (Alembic las crea, pero el seed puede ejecutarse antes)
CREATE TABLE IF NOT EXISTS conductores_catalogo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor VARCHAR(100),
    tipo VARCHAR(60),
    calibre_awg VARCHAR(20),
    seccion_mm2 NUMERIC(8,2),
    material CHAR(2),
    resistencia_dc_20 NUMERIC(10,4),
    i_max_ducto INTEGER,
    i_max_aire INTEGER,
    diametro_ext_mm NUMERIC(6,2),
    peso_kg_km NUMERIC(8,2),
    tension_nom_v INTEGER,
    temp_max_c INTEGER,
    norma_ref VARCHAR(40),
    certificacion_sec BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    version_catalogo VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de referencia de factores RIC (solo lectura, consulta interna)
CREATE TABLE IF NOT EXISTS ric_factores_temperatura (
    temp_c INTEGER PRIMARY KEY,
    factor NUMERIC(4,3) NOT NULL,
    descripcion TEXT
);

INSERT INTO ric_factores_temperatura VALUES
    (25, 1.050, 'Por debajo de referencia'),
    (30, 1.000, 'Temperatura de referencia RIC'),
    (35, 0.940, NULL),
    (40, 0.870, NULL),
    (45, 0.790, NULL),
    (50, 0.710, NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ric_factores_agrupamiento (
    circuitos INTEGER PRIMARY KEY,
    factor NUMERIC(4,3) NOT NULL,
    descripcion TEXT
);

INSERT INTO ric_factores_agrupamiento VALUES
    (1, 1.000, 'Sin reducción'),
    (2, 0.800, NULL),
    (3, 0.700, NULL),
    (4, 0.650, NULL),
    (6, 0.570, '5 a 6 circuitos'),
    (9, 0.500, '7 a 9 circuitos')
ON CONFLICT DO NOTHING;

-- Índices útiles para consultas del motor
CREATE INDEX IF NOT EXISTS idx_catalogo_seccion ON conductores_catalogo(seccion_mm2, material, activo);
CREATE INDEX IF NOT EXISTS idx_catalogo_proveedor ON conductores_catalogo(proveedor);
