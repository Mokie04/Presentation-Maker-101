import { ARIMO_METRICS } from './slide-fit-metrics-arimo';
import { GELASIO_METRICS } from './slide-fit-metrics-gelasio';
import { POPPINS_METRICS } from './slide-fit-metrics';

export type FontMetrics = typeof POPPINS_METRICS;
const metrics: Readonly<Record<string, FontMetrics>> = { poppins: POPPINS_METRICS, arimo: ARIMO_METRICS, gelasio: GELASIO_METRICS };

export function getFontMetrics(metricsId: string): FontMetrics {
  if (!Object.prototype.hasOwnProperty.call(metrics, metricsId)) {
    throw new Error(`Unknown slide fit metrics: ${metricsId}`);
  }
  return metrics[metricsId];
}
