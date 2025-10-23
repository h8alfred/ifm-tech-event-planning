// typescript
import { useEffect, useState } from 'react';
import type { SessionDTO, Page } from '../types';
import * as api from '../api/sessionApi';

export default function SessionManager() {
    const [page, setPage] = useState<Page<SessionDTO> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<SessionDTO>({
        endDateTime: "",
        id: undefined,
        priority: 0,
        speaker: "",
        startDateTime: "",
        title: "",
        vip: false
    });
    const [editingId, setEditingId] = useState<number | null>(null);

    // search/filter state (includes date range)
    const [searchSpeaker, setSearchSpeaker] = useState<string>('');
    const [searchPriority, setSearchPriority] = useState<string>(''); // empty = no filter
    const [searchStartDate, setSearchStartDate] = useState<string>(''); // YYYY-MM-DD
    const [searchEndDate, setSearchEndDate] = useState<string>('');     // YYYY-MM-DD

    // Convert a YYYY-MM-DD string to an ISO timestamp. endOfDay toggles to 23:59:59.
    function toIso(dateStr: string | undefined, endOfDay = false) {
        if (!dateStr) return undefined;
        const t = endOfDay ? 'T23:59:59' : 'T00:00:00';
        const d = new Date(dateStr + t);
        return d.toISOString();
    }

    function buildFilters() {
        const speaker = searchSpeaker.trim() || undefined;
        const priority = searchPriority === '' ? undefined : Number(searchPriority);
        const startDateTime = searchStartDate ? toIso(searchStartDate, false) : undefined;
        const endDateTime = searchEndDate ? toIso(searchEndDate, true) : undefined;
        return {
            ...(speaker ? { speaker } : {}),
            ...(priority != null ? { priority } : {}),
            ...(startDateTime ? { startDateTime } : {}),
            ...(endDateTime ? { endDateTime } : {})
        };
    }

    async function load(p = 0, size = 10, filters?: { speaker?: string; priority?: number; startDateTime?: string; endDateTime?: string }) {
        setLoading(true);
        setError(null);
        try {
            const query = { page: p, size, sortBy: 'startDateTime', ...(filters || buildFilters()) };
            const data = await api.getSessions(query);
            setPage(data);
        } catch (e: any) {
            console.error(e);
            setError(e?.message || 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    function onChange<K extends keyof SessionDTO>(key: K, value: SessionDTO[K]) {
        setForm((s) => ({ ...(s ?? {}), [key]: value }));
    }

    async function submit() {
        setLoading(true);
        setError(null);
        try {
            if (editingId != null) {
                await api.updateSession(editingId, form);
            } else {
                await api.createSession(form);
            }
            setForm({ endDateTime: "", id: undefined, priority: 0, speaker: "", startDateTime: "", title: "", vip: false });
            setEditingId(null);
            await load(page?.number ?? 0, page?.size ?? 10);
        } catch (e: any) {
            console.error(e);
            setError(e?.message || 'Save failed');
        } finally {
            setLoading(false);
        }
    }

    async function remove(id?: number) {
        if (id == null) return;
        setLoading(true);
        setError(null);
        try {
            await api.deleteSession(id);
            await load(page?.number ?? 0, page?.size ?? 10, buildFilters());
        } catch (e: any) {
            console.error(e);
            setError(e?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    }

    function startEdit(s: SessionDTO) {
        setEditingId(s.id ?? null);
        setForm({ ...s });
    }

    function cancelEdit() {
        setEditingId(null);
        setForm({ endDateTime: "", id: undefined, priority: 0, speaker: "", startDateTime: "", title: "", vip: false });
    }

    // apply search filters (resets to first page)
    function applySearch() {
        load(0, page?.size ?? 10, buildFilters());
    }

    function clearSearch() {
        setSearchSpeaker('');
        setSearchPriority('');
        setSearchStartDate('');
        setSearchEndDate('');
        load(0, page?.size ?? 10, {});
    }

    const currentFilters = buildFilters();

    return (
        <div>
            <h2>Sessions</h2>
            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            {/* Search / filter bar */}
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                    placeholder="Filter by speaker"
                    value={searchSpeaker}
                    onChange={(e) => setSearchSpeaker(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Filter by priority"
                    value={searchPriority}
                    onChange={(e) => setSearchPriority(e.target.value)}
                    style={{ width: 120 }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>From</span>
                    <input
                        type="date"
                        value={searchStartDate}
                        onChange={(e) => setSearchStartDate(e.target.value)}
                    />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>To</span>
                    <input
                        type="date"
                        value={searchEndDate}
                        onChange={(e) => setSearchEndDate(e.target.value)}
                    />
                </label>
                <button onClick={applySearch}>Search</button>
                <button onClick={clearSearch} style={{ marginLeft: 8 }}>Clear</button>
            </div>

            <div style={{ marginBottom: 12 }}>
                <input
                    placeholder="Title"
                    value={form.title ?? ''}
                    onChange={(e) => onChange('title', e.target.value)}
                />
                <input
                    placeholder="Speaker"
                    value={form.speaker ?? ''}
                    onChange={(e) => onChange('speaker', e.target.value)}
                    style={{ marginLeft: 8 }}
                />
                <input
                    type="datetime-local"
                    placeholder="Start"
                    value={form.startDateTime ? form.startDateTime.replace('Z', '') : ''}
                    onChange={(e) => onChange('startDateTime', e.target.value)}
                    style={{ marginLeft: 8 }}
                />
                <input
                    type="datetime-local"
                    placeholder="End"
                    value={form.endDateTime ? form.endDateTime.replace('Z', '') : ''}
                    onChange={(e) => onChange('endDateTime', e.target.value)}
                    style={{ marginLeft: 8 }}
                />
                <input
                    type="number"
                    placeholder="Priority"
                    value={form.priority ?? ''}
                    onChange={(e) => onChange('priority', Number(e.target.value))}
                    style={{ width: 96, marginLeft: 8 }}
                />
                <label style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        checked={!!form.vip}
                        onChange={(e) => onChange('vip', e.target.checked)}
                        style={{ marginRight: 4 }}
                    />
                    VIP
                </label>
                <button onClick={submit} style={{ marginLeft: 8 }}>
                    {editingId != null ? 'Update' : 'Create'}
                </button>
                {editingId != null && <button onClick={cancelEdit} style={{ marginLeft: 8 }}>Cancel</button>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                <tr>
                    <th style={{ textAlign: 'left' }}>Title</th>
                    <th style={{ textAlign: 'left' }}>Speaker</th>
                    <th style={{ textAlign: 'left' }}>Start</th>
                    <th style={{ textAlign: 'left' }}>End</th>
                    <th style={{ textAlign: 'left' }}>Priority</th>
                    <th style={{ textAlign: 'left' }}>VIP</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {page?.content?.map((s) => (
                    <tr key={s.id ?? Math.random()}>
                        <td>{s.title}</td>
                        <td>{s.speaker}</td>
                        <td>{s.startDateTime}</td>
                        <td>{s.endDateTime}</td>
                        <td>{s.priority}</td>
                        <td>{s.vip ? 'Yes' : 'No'}</td>
                        <td>
                            <button onClick={() => startEdit(s)}>Edit</button>
                            <button onClick={() => remove(s.id)} style={{ marginLeft: 8 }}>Delete</button>
                        </td>
                    </tr>
                )) ?? <tr><td colSpan={7}>No sessions</td></tr>}
                </tbody>
            </table>

            <div style={{ marginTop: 8 }}>
                <button
                    onClick={() => load(Math.max(0, (page?.number ?? 0) - 1), page?.size ?? 10, currentFilters)}
                    disabled={(page?.number ?? 0) <= 0}
                >
                    Prev
                </button>
                <span style={{ margin: '0 8px' }}>
          Page {(page?.number ?? 0) + 1} of {page?.totalPages ?? 1}
        </span>
                <button
                    onClick={() => load((page?.number ?? 0) + 1, page?.size ?? 10, currentFilters)}
                    disabled={(page?.number ?? 0) + 1 >= (page?.totalPages ?? 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
