/**
 * Motor de cálculo RIC — versión TypeScript para ejecución offline.
 *
 * Portado 1:1 desde backend/app/engine/ (Python). Produce exactamente
 * los mismos resultados para los mismos inputs.
 */
export { calculate } from './calculator'
export { seleccionarProteccion } from './protection-selector'
export { TABLA_RIC, SEC_MIN_CIRCUITO } from './ric-tables'
export type {
  CalculatorInput,
  CalculatorResult,
  CalculatorResponse,
  RadioCurvatura,
  EstresTermico,
  ProteccionRecomendada,
  TermomagneticoRecomendado,
  DiferencialRecomendado,
  Sistema,
  Material,
  TipoCanalizacion,
  TipoCircuito,
  Montaje,
  TipoFalla,
} from './types'
