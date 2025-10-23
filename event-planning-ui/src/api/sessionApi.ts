import type {SessionDTO, Page} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8080/api/v1';
export const BASE = `${API_BASE}/events/sessions`;


function buildQuery(params: Record<string, any>) {
    const qp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qp.set(k, String(v));
    });
    const s = qp.toString();
    return s ? `?${s}` : '';
}

export async function getSessions(options: {
    startFrom?: string;
    startTo?: string;
    sortBy?: string;
    page?: number;
    size?: number;
} = {}): Promise<Page<SessionDTO>> {
    const url = `${BASE}${buildQuery(options)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Failed to load sessions: ${res.status}`);
    return (await res.json()) as Page<SessionDTO>;
}

export async function createSession(session: SessionDTO): Promise<SessionDTO> {
    const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
    return (await res.json()) as SessionDTO;
}

export async function updateSession(id: number, session: SessionDTO): Promise<SessionDTO> {
    const res = await fetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error(`Failed to update session: ${res.status}`);
    return (await res.json()) as SessionDTO;
}

export async function deleteSession(id: number): Promise<void> {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete session: ${res.status}`);
}
