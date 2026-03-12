import type { AlertLevel, ZonePrediction } from '@schema';

export function getAlertLevel(probability: number): AlertLevel {
  if (probability >= 0.7) return 'RED';
  if (probability >= 0.5) return 'ORANGE';
  if (probability >= 0.3) return 'YELLOW';
  return 'GREEN';
}

export function getPredictionAlertLevel(prediction: ZonePrediction): AlertLevel {
  return getAlertLevel(prediction.flood_probability);
}

export function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case 'RED': return '#ef4444';
    case 'ORANGE': return '#f97316';
    case 'YELLOW': return '#f59e0b';
    case 'GREEN': return '#10b981';
    default: return '#10b981';
  }
}
