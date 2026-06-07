import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import TeachersPage from './pages/TeachersPage';
import TeacherProfilePage from './pages/TeacherProfilePage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import WeeklyPage from './pages/WeeklyPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import RoomsPage from './pages/RoomsPage';
import AdminPage from './pages/AdminPage';

function AppRoutes() {
  const location = useLocation();
  return (
    <Layout key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/departments/:id" element={<DepartmentDetailPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/teachers/:id" element={<TeacherProfilePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/weekly" element={<WeeklyPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return <AppRoutes />;
}
