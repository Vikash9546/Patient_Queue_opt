import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueueProvider } from './context/QueueContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import ReceptionDashboard from './pages/ReceptionDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import QueueTVScreen from './pages/QueueTVScreen';
import AnalyticsPage from './pages/AnalyticsPage';
import PatientBookingPage from './pages/PatientBookingPage';
import PatientHistoryPage from './pages/PatientHistoryPage';
import ActivityDashboard from './pages/ActivityDashboard';
import ProfilePage from './pages/ProfilePage';

function App() {
    return (
        <ThemeProvider>
            <QueueProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/reception" element={<ReceptionDashboard />} />
                        <Route path="/doctor" element={<DoctorDashboard />} />
                        <Route path="/queue-tv" element={<QueueTVScreen />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/book" element={<PatientBookingPage />} />
                        <Route path="/patient-history" element={<PatientHistoryPage />} />
                        <Route path="/activity-logs" element={<ActivityDashboard />} />
                        <Route path="/profile" element={<ProfilePage />} />
                    </Routes>
                </BrowserRouter>
            </QueueProvider>
        </ThemeProvider>
    );
}

export default App;
