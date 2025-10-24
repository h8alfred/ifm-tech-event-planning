// typescript
import { useEffect, useState } from 'react';
import type { SessionDTO, Page } from '../types';
import * as api from '../api/sessionApi';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';

const INPUT_STYLE: React.CSSProperties = {
    height: 44,
    padding: '8px 12px',
    fontSize: 16,
    minWidth: 160,
    boxSizing: 'border-box'
};

const BUTTON_STYLE: React.CSSProperties = {
    padding: '8px 14px',
    fontSize: 16
};

const SMALL_BUTTON_STYLE: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: 12,
    borderRadius: 4,
    lineHeight: '1',
    cursor: 'pointer'
};

const FORM_ROW_STYLE: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
    overflowX: 'auto',
    marginBottom: 12
};

function formatDate(value: unknown) {
    if (value == null || value === '') return '';
    const s = String(value);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
        try {
            const d2 = new Date(s + (s.endsWith('Z') ? '' : 'Z'));
            if (!Number.isNaN(d2.getTime())) return d2.toLocaleString();
        } catch {
            return '';
        }
        return '';
    }
    return d.toLocaleString();
}

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

    async function load(p = 0, size = 10, filters?: { speaker?: string; priority?: number; startDateTime?: string; endDateTime?: string }) {
        setLoading(true);
        setError(null);
        try {
            const query = { page: p, size, sortBy: 'startDateTime', ...(filters || {}) };
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
                const updated = await api.updateSession(editingId, form);
                window.dispatchEvent(new CustomEvent('sessions-updated', { detail: { action: 'update', session: updated, id: editingId } }));
            } else {
                const created = await api.createSession(form);
                window.dispatchEvent(new CustomEvent('sessions-updated', { detail: { action: 'create', session: created } }));
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
            window.dispatchEvent(new CustomEvent('sessions-updated', { detail: { action: 'delete', id } }));
            await load(page?.number ?? 0, page?.size ?? 10);
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

    const rows = (page?.content ?? []).map((s, i) => ({
        ...s,
        id: s.id ?? `tmp-${i}`
    }));

    const columns: GridColDef[] = [
        { field: 'title', headerName: 'Title', flex: 1, minWidth: 150 },
        { field: 'speaker', headerName: 'Speaker', width: 180 },
        {
            field: 'startDateTime',
            headerName: 'Start',
            width: 180,
            renderCell: (params: GridRenderCellParams) => formatDate(params.value)
        },
        {
            field: 'endDateTime',
            headerName: 'End',
            width: 180,
            renderCell: (params: GridRenderCellParams) => formatDate(params.value)
        },
        { field: 'priority', headerName: 'Priority', width: 100, align: 'center', headerAlign: 'center' },
        {
            field: 'vip',
            headerName: 'VIP',
            width: 90,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => (params.value ? 'Yes' : 'No')
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => {
                const row = params.row as SessionDTO & { id: number | string };
                const numericId = typeof row.id === 'number' ? row.id : undefined;
                return (
                    <div>
                        <button onClick={() => startEdit(row)} style={SMALL_BUTTON_STYLE}>Edit</button>
                        <button onClick={() => numericId && remove(numericId)} style={{ marginLeft: 6, ...SMALL_BUTTON_STYLE }}>Delete</button>
                    </div>
                );
            }
        }
    ];

    return (
        <div>
            <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Event Sessions</h2>
            {loading && <div>Loading...</div>}
            {error && <div style={{ color: 'red' }}>{error}</div>}

            <div style={FORM_ROW_STYLE}>
                <input
                    placeholder="Title"
                    value={form.title ?? ''}
                    onChange={(e) => onChange('title', e.target.value)}
                    style={INPUT_STYLE}
                />
                <input
                    placeholder="Speaker"
                    value={form.speaker ?? ''}
                    onChange={(e) => onChange('speaker', e.target.value)}
                    style={{ ...INPUT_STYLE }}
                />
                <input
                    type="datetime-local"
                    placeholder="Start"
                    value={form.startDateTime ? form.startDateTime.replace('Z', '') : ''}
                    onChange={(e) => onChange('startDateTime', e.target.value)}
                    style={{ ...INPUT_STYLE, minWidth: 200, width: 220 }}
                />
                <input
                    type="datetime-local"
                    placeholder="End"
                    value={form.endDateTime ? form.endDateTime.replace('Z', '') : ''}
                    onChange={(e) => onChange('endDateTime', e.target.value)}
                    style={{ ...INPUT_STYLE, minWidth: 200, width: 220 }}
                />
                <input
                    type="number"
                    placeholder="Priority"
                    value={form.priority ?? ''}
                    onChange={(e) => onChange('priority', Number(e.target.value))}
                    style={{ ...INPUT_STYLE, width: 120, minWidth: 120 }}
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="checkbox"
                        checked={!!form.vip}
                        onChange={(e) => onChange('vip', e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                    />
                    VIP
                </label>
                <button onClick={submit} style={{ marginLeft: 8, ...BUTTON_STYLE }}>
                    {editingId != null ? 'Update' : 'Create'}
                </button>
                {editingId != null && <button onClick={cancelEdit} style={{ marginLeft: 8, ...BUTTON_STYLE }}>Cancel</button>}
            </div>

            <div style={{ width: '100%' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pagination
                    paginationMode="server"
                    rowCount={page?.totalElements ?? 0}
                    paginationModel={{ page: page?.number ?? 0, pageSize: page?.size ?? 10 }}
                    onPaginationModelChange={(model: { page: number; pageSize: number }) => load(model.page, model.pageSize)}
                    loading={loading}
                    autoHeight
                    disableRowSelectionOnClick
                    sx={{
                        border: '1px solid rgba(20,24,28,0.08)',
                        borderRadius: 1,
                        fontFamily: 'Inter, Roboto, Arial, sans-serif',
                        backgroundColor: '#ffffff',
                        // header styling - medium dark gray for title row
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: '#374151', // medium dark gray
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            minHeight: 56,
                            height: 56,
                            '&, & .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeaderTitleContainer': {
                                color: '#fff'
                            }
                        },
                        '& .MuiDataGrid-columnHeader': {
                            backgroundColor: '#374151',
                            color: '#fff !important',
                            zIndex: 2
                        },
                        '& .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-columnHeaderTitle': {
                            color: '#fff !important',
                            fontSize: 13,
                            fontWeight: 800,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        },
                        '& .MuiDataGrid-cell': {
                            fontSize: 13
                        },
                        '& .MuiDataGrid-row:nth-of-type(odd)': {
                            backgroundColor: '#ffffff',
                            '& .MuiDataGrid-cell, & .MuiDataGrid-cellContent': {
                                color: '#0b1220'
                            }
                        },
                        '& .MuiDataGrid-row:nth-of-type(even)': {
                            backgroundColor: '#f7fafc',
                            '& .MuiDataGrid-cell, & .MuiDataGrid-cellContent': {
                                color: '#0b1220'
                            }
                        },
                        '& .MuiDataGrid-row:hover': {
                            backgroundColor: '#e6eef8 !important'
                        },
                        '& .MuiDataGrid-row.Mui-selected': {
                            backgroundColor: '#dbeafe !important',
                            '& .MuiDataGrid-cell': {
                                color: '#0b1220'
                            }
                        },
                        '& .MuiDataGrid-footerContainer': {
                            backgroundColor: '#f3f4f6',
                            borderTop: '1px solid rgba(20,24,28,0.06)'
                        },
                        '& .MuiDataGrid-selectedRowCount': {
                            color: '#334155'
                        },
                        '& .MuiDataGrid-iconButtonContainer': {
                            color: '#475569'
                        }
                    }}
                />
            </div>
        </div>
    );
}
