import SessionCalendar from '../components/SessionCalendar';
import SessionManager from '../components/SessionManager'; // if you have a list component
import { Box, Typography } from '@mui/material';

const FORM_CONTAINER_SX = { maxWidth: 1100, width: '100%', mx: 'auto', p: 2 };

export default function SessionsPage() {
    return (
        <Box sx={FORM_CONTAINER_SX}>
            <Typography
                variant="h5"
                sx={{
                    mb: 2,
                    textAlign: 'center',
                    bgcolor: '#eef6ff',
                    px: 2,
                    py: 1,
                    borderRadius: 1
                }}
            >
                Event Planning System
            </Typography>

            {/* Render calendar */}
            <Box sx={{ mb: 3 }}>
                <SessionCalendar />
            </Box>

            {/* Render list (SessionManager) */}
            <Box>
                <SessionManager />
            </Box>
        </Box>
    );
}
