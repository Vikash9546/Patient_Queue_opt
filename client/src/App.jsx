import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueueProvider } from './context/QueueContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import ReceptionDashboard from './pages/ReceptionDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import QueueTVScreen from './pages/QueueTVScreen';
import AnalyticsPage from './pages/AnalyticsPage';
import PatientBookingPage from './pages/PatientBookingPage';

function App() {
    return (
        <ThemeProvider>
            <QueueProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/reception" element={<ReceptionDashboard />} />
                        <Route path="/doctor" element={<DoctorDashboard />} />
                        <Route path="/queue-tv" element={<QueueTVScreen />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/book" element={<PatientBookingPage />} />
                    </Routes>
                </BrowserRouter>
            </QueueProvider>
        </ThemeProvider>
    );
}

export default App;
