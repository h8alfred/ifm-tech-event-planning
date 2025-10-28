import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SessionManager from './components/SessionManager';
import SessionsPage from "./pages/SessionPage.tsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SessionsPage />} />
                <Route path="/sessions" element={<SessionManager />} />
                <Route path="/calendar" element={<SessionsPage />} />

            </Routes>
        </BrowserRouter>
    );
}