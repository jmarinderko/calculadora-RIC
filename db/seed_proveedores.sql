-- ─── SEED: Catálogo de conductores por proveedor ─────────────────────────────
-- Fuente: Catálogos oficiales Nexans Chile, Prysmian/COCESA, Covisa 2023-2024
-- NCh Elec 4/2003 — Tabla 5-1 (THW 75°C, T_amb 30°C)

INSERT INTO conductores_catalogo
  (proveedor, tipo, calibre_awg, seccion_mm2, material,
   resistencia_dc_20, i_max_ducto, i_max_aire,
   diametro_ext_mm, peso_kg_km, tension_nom_v, temp_max_c,
   norma_ref, certificacion_sec, activo, version_catalogo)
VALUES
-- ─── NEXANS CHILE — Línea MULTIFLEX THW ──────────────────────────────────────
('Nexans Chile', 'THW', '14 AWG', 2.5,   'cu', 12.10, 18,  23,  6.5,  24,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '12 AWG', 4.0,   'cu', 4.61,  24,  31,  7.0,  36,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '10 AWG', 6.0,   'cu', 3.08,  31,  40,  7.8,  55,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '8 AWG',  10.0,  'cu', 1.83,  42,  54,  9.2,  90,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '6 AWG',  16.0,  'cu', 1.15,  56,  73,  11.0, 140,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '4 AWG',  25.0,  'cu', 0.727, 73,  95,  13.5, 220,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '2 AWG',  35.0,  'cu', 0.524, 89,  117, 15.0, 305,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '1/0 AWG',50.0,  'cu', 0.387, 108, 141, 17.5, 440,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '2/0 AWG',70.0,  'cu', 0.268, 136, 179, 20.5, 610,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '3/0 AWG',95.0,  'cu', 0.193, 164, 216, 24.0, 830,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '4/0 AWG',120.0, 'cu', 0.153, 188, 249, 26.5, 1050, 600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '250 MCM',150.0, 'cu', 0.124, 216, 285, 29.5, 1320, 600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '350 MCM',185.0, 'cu', 0.099, 245, 324, 33.0, 1640, 600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '500 MCM',240.0, 'cu', 0.075, 286, 380, 38.0, 2120, 600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Nexans Chile', 'THW', '600 MCM',300.0, 'cu', 0.060, 328, 435, 42.0, 2650, 600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),

-- ─── PRYSMIAN / COCESA — Línea THHN/THWN ────────────────────────────────────
('Prysmian COCESA', 'THHN', '14 AWG', 2.5,   'cu', 12.10, 18,  23,  6.3,  23,   600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '12 AWG', 4.0,   'cu', 4.61,  24,  31,  6.8,  34,   600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '10 AWG', 6.0,   'cu', 3.08,  31,  40,  7.6,  52,   600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '8 AWG',  10.0,  'cu', 1.83,  42,  54,  9.0,  87,   600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '6 AWG',  16.0,  'cu', 1.15,  56,  73,  10.8, 135,  600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '4 AWG',  25.0,  'cu', 0.727, 73,  95,  13.2, 212,  600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '2 AWG',  35.0,  'cu', 0.524, 89,  117, 14.7, 295,  600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '1/0 AWG',50.0,  'cu', 0.387, 108, 141, 17.2, 425,  600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '2/0 AWG',70.0,  'cu', 0.268, 136, 179, 20.0, 590,  600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '3/0 AWG',95.0,  'cu', 0.193, 164, 216, 23.5, 800,  600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '4/0 AWG',120.0, 'cu', 0.153, 188, 249, 26.0, 1010, 600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '250 MCM',150.0, 'cu', 0.124, 216, 285, 29.0, 1270, 600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '350 MCM',185.0, 'cu', 0.099, 245, 324, 32.5, 1580, 600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '500 MCM',240.0, 'cu', 0.075, 286, 380, 37.5, 2050, 600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),
('Prysmian COCESA', 'THHN', '600 MCM',300.0, 'cu', 0.060, 328, 435, 41.5, 2560, 600, 90, 'NCh Elec 4/2003', TRUE, TRUE, '2023-v2'),

-- ─── COVISA — Línea THW Cobre ────────────────────────────────────────────────
('Covisa', 'THW', '14 AWG', 2.5,   'cu', 12.10, 18,  23,  6.5,  24,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '12 AWG', 4.0,   'cu', 4.61,  24,  31,  7.0,  36,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '10 AWG', 6.0,   'cu', 3.08,  31,  40,  7.8,  55,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '8 AWG',  10.0,  'cu', 1.83,  42,  54,  9.2,  90,   600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '6 AWG',  16.0,  'cu', 1.15,  56,  73,  11.0, 140,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '4 AWG',  25.0,  'cu', 0.727, 73,  95,  13.5, 220,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '2 AWG',  35.0,  'cu', 0.524, 89,  117, 15.0, 305,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '1/0 AWG',50.0,  'cu', 0.387, 108, 141, 17.5, 440,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '2/0 AWG',70.0,  'cu', 0.268, 136, 179, 20.5, 610,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '3/0 AWG',95.0,  'cu', 0.193, 164, 216, 24.0, 830,  600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '4/0 AWG',120.0, 'cu', 0.153, 188, 249, 26.5, 1050, 600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1'),
('Covisa', 'THW', '250 MCM',150.0, 'cu', 0.124, 216, 285, 29.5, 1320, 600, 75, 'NCh Elec 4/2003', TRUE, TRUE, '2024-v1');
