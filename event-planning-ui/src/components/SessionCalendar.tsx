// typescript
import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Grid,
    TextField,
    Select,
    MenuItem,
    Button,
    Tooltip,
    CircularProgress,
    Paper,
    Typography,
    Chip
} from '@mui/material';
import type { SessionDTO } from '../types';
import * as api from '../api/sessionApi';

function toIsoDateTime(dateStr: string | undefined, endOfDay = false) {
    if (!dateStr) return undefined;
    const t = endOfDay ? 'T23:59:59' : 'T00:00:00';
    return new Date(dateStr + t).toISOString();
}

function priorityColor(priority?: number) {
    if (priority === 1) return '#ef9a9a';
    if (priority === 2) return '#ffcc80';
    if (priority === 3) return '#fff59d';
    return '#90caf9';
}

function formatYMD(d: Date) {
    return d.toISOString().slice(0, 10);
}

export default function SessionCalendar() {
    const [sessions, setSessions] = useState<SessionDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [speaker, setSpeaker] = useState('');
    const [priority, setPriority] = useState<string>(''); // '' = any

    // default to current month
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        return formatYMD(first);
    });
    const [endDate, setEndDate] = useState<string>(() => {
        const d = new Date();
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return formatYMD(last);
    });

    // load now accepts optional overrides so callers can fetch immediately for new visible range
    async function load(overrideStart?: string, overrideEnd?: string) {
        setLoading(true);
        try {
            const filters: Record<string, any> = {};
            if (speaker.trim()) filters.speaker = speaker.trim();
            if (priority !== '') filters.priority = Number(priority);
            const sDate = overrideStart ?? startDate;
            const eDate = overrideEnd ?? endDate;
            const startIso = toIsoDateTime(sDate, false);
            const endIso = toIsoDateTime(eDate, true);
            if (startIso) filters.startDateTime = startIso;
            if (endIso) filters.endDateTime = endIso;

            const query = { page: 0, size: 1000, sortBy: 'startDateTime', ...filters };
            const page = await api.getSessions(query);
            setSessions(page?.content ?? []);
        } catch (e: any) {
            console.error(e);
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // compute calendar grid days (start from Sunday to Saturday), show 6 weeks
    const calendarDays = useMemo(() => {
        const start = new Date(startDate + 'T00:00:00');
        const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
        const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);

        // start grid at the previous Sunday
        const firstGridDay = new Date(monthStart);
        firstGridDay.setDate(monthStart.getDate() - monthStart.getDay());

        const days: Date[] = [];
        for (let i = 0; i < 42; i++) { // 6 weeks
            const d = new Date(firstGridDay);
            d.setDate(firstGridDay.getDate() + i);
            days.push(d);
        }

        return { days, monthStart, monthEnd };
    }, [startDate]);

    // Map events into day buckets (include multi-day)
    const eventsByDay = useMemo(() => {
        const map = new Map<string, SessionDTO[]>();
        for (const s of sessions) {
            if (!s.startDateTime || !s.endDateTime) continue;
            const evStart = new Date(s.startDateTime);
            const evEnd = new Date(s.endDateTime);

            // iterate each day spanned
            const cur = new Date(evStart.toISOString().slice(0, 10) + 'T00:00:00');
            const last = new Date(evEnd.toISOString().slice(0, 10) + 'T00:00:00');
            for (let d = new Date(cur); d <= last; d.setDate(d.getDate() + 1)) {
                const key = formatYMD(d);
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(s);
            }
        }
        return map;
    }, [sessions]);

    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // helper to move calendar by months — compute new visible range and fetch immediately
    function changeMonth(delta: number) {
        const sd = new Date(startDate + 'T00:00:00');
        const newMonth = new Date(sd.getFullYear(), sd.getMonth() + delta, 1);
        const newStart = formatYMD(newMonth);
        const newEnd = formatYMD(new Date(newMonth.getFullYear(), newMonth.getMonth() + 1, 0));
        setStartDate(newStart);
        setEndDate(newEnd);
        load(newStart, newEnd);
    }

    return (
        <Box sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                    <TextField label="Speaker" value={speaker} onChange={(e) => setSpeaker(e.target.value)} fullWidth size="small" />
                </Grid>

                <Grid item xs={6} sm={3} md={2}>
                    <Select
                        value={priority}
                        onChange={(e) => setPriority(String(e.target.value))}
                        displayEmpty
                        fullWidth
                        size="small"
                        renderValue={(v) => (v === '' ? 'Any priority' : `Priority ${v}`)}
                    >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="1">1 (High)</MenuItem>
                        <MenuItem value="2">2 (Medium)</MenuItem>
                        <MenuItem value="3">3 (Low)</MenuItem>
                    </Select>
                </Grid>

                <Grid item xs={6} sm={3} md={2}>
                    <TextField label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" />
                </Grid>

                <Grid item xs={6} sm={3} md={2}>
                    <TextField label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" />
                </Grid>

                <Grid item xs={12} sm={6} md={3} container spacing={1}>
                    <Grid item>
                        <Button variant="contained" onClick={() => load()} disabled={loading}>Apply</Button>
                    </Grid>
                    <Grid item>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setSpeaker('');
                                setPriority('');
                                const d = new Date();
                                const first = new Date(d.getFullYear(), d.getMonth(), 1);
                                const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                                const newStart = formatYMD(first);
                                const newEnd = formatYMD(last);
                                setStartDate(newStart);
                                setEndDate(newEnd);
                                load(newStart, newEnd);
                            }}
                            disabled={loading}
                        >
                            Clear
                        </Button>
                    </Grid>
                    {loading && (
                        <Grid item>
                            <CircularProgress size={24} />
                        </Grid>
                    )}
                </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
                <Paper variant="outlined" sx={{ p: 1, bgcolor: '#fbfcff' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box>
                            <Button size="small" onClick={() => changeMonth(-1)}>Prev</Button>
                            <Button size="small" onClick={() => changeMonth(1)}>Next</Button>
                        </Box>
                        <Typography variant="h6">
                            {new Date(startDate + 'T00:00:00').toLocaleDateString([], { month: 'long', year: 'numeric' })}
                        </Typography>
                        <Box sx={{ width: 48 }} />
                    </Box>

                    {/* weekday header */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid rgba(0,0,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        {weekdayLabels.map((w) => (
                            <Box key={w} sx={{ p: 1, textAlign: 'center', bgcolor: '#fff' }}>
                                <Typography variant="subtitle2">{w}</Typography>
                            </Box>
                        ))}
                    </Box>

                    {/* days grid */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mt: 1 }}>
                        {calendarDays.days.map((d) => {
                            const key = formatYMD(d);
                            const inMonth = d >= calendarDays.monthStart && d <= calendarDays.monthEnd;
                            const dayEvents = eventsByDay.get(key) ?? [];
                            const maxVisible = 4;
                            const extra = Math.max(0, dayEvents.length - maxVisible);

                            return (
                                <Box
                                    key={key}
                                    sx={{
                                        minHeight: 120,
                                        border: '1px solid rgba(0,0,0,0.03)',
                                        borderRadius: 1,
                                        p: 0.5,
                                        bgcolor: inMonth ? '#ffffff' : '#fafafa',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
                                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{d.getDate()}</Typography>
                                    </Box>

                                    <Box sx={{ mt: 2 }}>
                                        {dayEvents.slice(0, maxVisible).map((ev) => {
                                            const startText = ev.startDateTime ? new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                            const endText = ev.endDateTime ? new Date(ev.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                            return (
                                                <Tooltip
                                                    key={String(ev.id)}
                                                    title={
                                                        <Box>
                                                            <Typography sx={{ fontWeight: 700 }}>{ev.title}</Typography>
                                                            {ev.speaker && <Typography variant="body2">Speaker: {ev.speaker}</Typography>}
                                                            <Typography variant="body2">{startText}{startText && endText ? ' — ' : ''}{endText}</Typography>
                                                            {typeof ev.priority !== 'undefined' && <Typography variant="body2">Priority: {ev.priority}</Typography>}
                                                        </Box>
                                                    }
                                                    arrow
                                                >
                                                    <Chip
                                                        label={ev.title}
                                                        size="small"
                                                        sx={{
                                                            mt: 0.5,
                                                            bgcolor: priorityColor(ev.priority),
                                                            color: '#000',
                                                            border: '1px solid rgba(0,0,0,0.06)',
                                                            maxWidth: '100%',
                                                            textOverflow: 'ellipsis',
                                                            overflow: 'hidden',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    />
                                                </Tooltip>
                                            );
                                        })}

                                        {extra > 0 && (
                                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}>
                                                +{extra} more
                                            </Typography>
                                        )}

                                        {dayEvents.length === 0 && (
                                            <Box sx={{ mt: 1, opacity: 0.04 }}>
                                                <Typography variant="caption">No events</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
