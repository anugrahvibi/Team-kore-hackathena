import type { 
  ZonePrediction, 
  StakeholderAction, 
  VulnerabilityAnalysis, 
  ROIAnalysis,
  GraphResponse,
  PredictionResponse,
  AlertsResponse,
  LeadTimeTicker,
  SensorReading
} from '@schema';

// ─── Fetch Robustness ─────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 30000;  // 30s for normal endpoints
const SLOW_TIMEOUT_MS = 120000;   // 120s for heavy ML computation endpoints
const DEFAULT_RETRIES = 2;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Minimal in-memory cache to prevent duplicate rapid requests
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 30000; // 30s cache

function cacheGet<T>(key: string): T | null {
  const item = cache[key];
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
}

function cacheSet(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

async function fetchJsonWithRetry<T>(url: string, options: { 
  retries?: number; 
  timeoutMs?: number;
  skipCache?: boolean;
} = {}): Promise<T | null> {
  const { retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, {}, timeoutMs);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries) {
        console.error(`Fetch failed for ${url}:`, err);
        return null;
      }
      await wait(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  return null;
}

// ─── Shared Persistence API ────────────────────────────────────────────────────

export async function fetchZones(): Promise<any[]> {
  const data = await fetchJsonWithRetry<any[]>('/api/v1/zones');
  return data || [];
}

export async function fetchInfrastructure(): Promise<GraphResponse> {
  const cacheKey = 'infrastructure';
  const cached = cacheGet<GraphResponse>(cacheKey);
  if (cached) return cached;

  const data = await fetchJsonWithRetry<GraphResponse>('/api/v1/infrastructure/graph');
  if (data) {
    cacheSet(cacheKey, data);
    return data;
  }

  return { nodes: [], edges: [] };
}


export async function fetchActiveAlerts(role: string, scenario: string = '2018_peak'): Promise<StakeholderAction[]> {
  const cacheKey = `alerts_${role}_${scenario}`;
  const cached = cacheGet<StakeholderAction[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchJsonWithRetry<AlertsResponse>(`/api/v1/ml/alerts/summary?scenario=${scenario}`);
  if (data?.action_plan?.action_plans) {
    const filteredActions = data.action_plan.action_plans.filter(action => !role || action.department === role);
    cacheSet(cacheKey, filteredActions);
    return filteredActions;
  }
  return [];
}


export async function fetchSensorReadings(zoneId: string): Promise<SensorReading[]> {
  const latestData = await fetchJsonWithRetry<SensorReading>(`/api/v1/sensors/${zoneId}/latest`, {
    retries: 1,
    timeoutMs: 5000,
  });
  return latestData ? [latestData] : [];
}

export async function fetchCascadeAnalysis(zoneId: string): Promise<any> {
  return await fetchJsonWithRetry<any>(`/api/v1/cascade/${zoneId}`);
}

export async function fetchVulnerabilities(): Promise<VulnerabilityAnalysis | null> {
  const cacheKey = 'vulnerabilities';
  const cached = cacheGet<VulnerabilityAnalysis>(cacheKey);
  if (cached) return cached;

  const data = await fetchJsonWithRetry<VulnerabilityAnalysis>('/api/v1/ml/analytics/vulnerability-map', { timeoutMs: SLOW_TIMEOUT_MS });
  if (data) {
    cacheSet(cacheKey, data);
    return data;
  }
  return null;
}


export async function fetchLeadTimes(scenario: string = '2018_peak'): Promise<LeadTimeTicker[]> {
  const cacheKey = `lead_times_${scenario}`;
  const cached = cacheGet<LeadTimeTicker[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchJsonWithRetry<{ lead_time_tickers?: LeadTimeTicker[] }>(`/api/v1/ml/lead-times?scenario=${scenario}`);
  const tickers = data?.lead_time_tickers ?? [];
  if (tickers.length > 0) {
    cacheSet(cacheKey, tickers);
  }
  return tickers;
}

export async function fetchROIRankings(): Promise<ROIAnalysis[]> {
  const cacheKey = 'roi_rankings';
  const cached = cacheGet<ROIAnalysis[]>(cacheKey);
  if (cached) return cached;

  // Assuming backend returns it properly aligned with schema now
  const data = await fetchJsonWithRetry<ROIAnalysis[]>('/api/v1/ml/roi/rankings');
  if (data) {
    cacheSet(cacheKey, data);
    return data;
  }
  return [];
}

export async function fetchPredictions(scenario: string = '2018_peak'): Promise<ZonePrediction[]> {
  const cacheKey = `predictions_${scenario}`;
  const cached = cacheGet<ZonePrediction[]>(cacheKey);
  if (cached) return cached;

  const data = await fetchJsonWithRetry<PredictionResponse>(`/api/v1/ml/predictions?scenario=${scenario}`, { timeoutMs: SLOW_TIMEOUT_MS });
  if (data?.predictions) {
    cacheSet(cacheKey, data.predictions);
    return data.predictions;
  }
  return [];
}
