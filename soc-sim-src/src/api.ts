import type {
  ScenarioMeta,
  Scenario,
  ScenarioSummary,
  AlertsResponse,
  Alert,
  TriageSubmission,
  TriageResponse,
} from './types'

const BASE = 'https://api.haxnation.org/ctf/soc-sim'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({})) as { error?: string }
  if (!res.ok) throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status)
  return body as T
}

export async function listScenarios(): Promise<{ count: number; scenarios: ScenarioMeta[] }> {
  return req('/scenarios')
}

export async function getScenario(id: string): Promise<Scenario> {
  return req(`/scenarios/${id}`)
}

export async function getScenarioSummary(id: string): Promise<ScenarioSummary> {
  return req(`/scenarios/${id}/summary`)
}

export async function listAlerts(
  id: string,
  filters: { severity?: string; source?: string; mitre_tactic?: string } = {},
): Promise<AlertsResponse> {
  const params = new URLSearchParams()
  if (filters.severity)    params.set('severity', filters.severity)
  if (filters.source)      params.set('source', filters.source)
  if (filters.mitre_tactic) params.set('mitre_tactic', filters.mitre_tactic)
  const qs = params.toString()
  return req(`/scenarios/${id}/alerts${qs ? `?${qs}` : ''}`)
}

export async function getAlert(scenarioId: string, index: number): Promise<Alert & { _index: number }> {
  return req(`/scenarios/${scenarioId}/alerts/${index}`)
}

export async function submitTriage(
  scenarioId: string,
  index: number,
  body: TriageSubmission,
): Promise<TriageResponse> {
  return req(`/scenarios/${scenarioId}/alerts/${index}/triage`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
