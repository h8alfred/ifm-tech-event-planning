// file: `event-planning-ui/src/types.ts`
export interface SessionDTO {
    id?: number;
    title: string;
    speaker?: string;
    priority?: number;
    startDateTime?: string; // ISO 8601 timestamp, e.g. "2025-10-21T08:46:00"
    endDateTime?: string;   // ISO 8601 timestamp, e.g. "2025-10-21T09:30:00"
    vip?: boolean;
    // add other existing fields from your project below as needed
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
