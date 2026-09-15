import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ROLES } from './utils/roles'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import JobsPage from './pages/jobs/JobsPage'
import JobDetailsPage from './pages/jobs/JobDetailsPage'
import StudentDashboardPage from './pages/student/StudentDashboardPage'
import ApplicationsPage from './pages/student/ApplicationsPage'
import StudentProfilePage from './pages/student/StudentProfilePage'
import StudentInterviewsPage from './pages/student/StudentInterviewsPage'
import EventsPage from './pages/student/EventsPage'
import AlumniDashboardPage from './pages/alumni/AlumniDashboardPage'
import AlumniProfilePage from './pages/alumni/AlumniProfilePage'
import AlumniJobFormPage from './pages/alumni/AlumniJobFormPage'
import AlumniApplicationsPage from './pages/alumni/AlumniApplicationsPage'
import AlumniReferralsPage from './pages/alumni/AlumniReferralsPage'
import RecruiterDashboardPage from './pages/recruiter/RecruiterDashboardPage'
import CompanyProfilePage from './pages/recruiter/CompanyProfilePage'
import RecruiterJobsPage from './pages/recruiter/RecruiterJobsPage'
import JobFormPage from './pages/recruiter/JobFormPage'
import ApplicantsPage from './pages/recruiter/ApplicantsPage'
import ApplicantDetailPage from './pages/recruiter/ApplicantDetailPage'
import CampusRecruitmentPage from './pages/recruiter/CampusRecruitmentPage'
import FacultyDashboardPage from './pages/faculty/FacultyDashboardPage'
import FacultyStudentsPage from './pages/faculty/FacultyStudentsPage'
import FacultyStudentReviewPage from './pages/faculty/FacultyStudentReviewPage'
import FacultyEventsPage from './pages/faculty/FacultyEventsPage'
import FacultyReportsPage from './pages/faculty/FacultyReportsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminJobsPage from './pages/admin/AdminJobsPage'
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage'
import AdminApplicationsPage from './pages/admin/AdminApplicationsPage'
import AdminInterviewsPage from './pages/admin/AdminInterviewsPage'
import AdminEventsPage from './pages/admin/AdminEventsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage'
import AdminCampusPage from './pages/admin/AdminCampusPage'
import MessagesPage from './pages/MessagesPage'
import MessageThreadPage from './pages/MessageThreadPage'
import NotificationsPage from './pages/NotificationsPage'
import DashboardPlaceholder from './pages/DashboardPlaceholder'

const placeholderDashboards = []

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.ALUMNI]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailsPage />} />
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                  <StudentDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/applications"
              element={
                <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                  <ApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                  <StudentProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/interviews"
              element={
                <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                  <StudentInterviewsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/events"
              element={
                <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alumni/dashboard"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                  <AlumniDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alumni/jobs/new"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                  <AlumniJobFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alumni/applications"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                  <AlumniApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alumni/jobs/:jobId/applicants"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                  <ApplicantsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alumni/applicants/:applicationId"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                  <ApplicantDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alumni/referrals"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                  <AlumniReferralsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alumni/profile"
              element={
                <ProtectedRoute allowedRoles={[ROLES.ALUMNI]}>
                  <AlumniProfilePage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.RECRUITER]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/recruiter/dashboard" element={<RecruiterDashboardPage />} />
            <Route path="/recruiter/company" element={<CompanyProfilePage />} />
            <Route path="/recruiter/jobs" element={<RecruiterJobsPage />} />
            <Route path="/recruiter/jobs/new" element={<JobFormPage />} />
            <Route path="/recruiter/jobs/:jobId/edit" element={<JobFormPage />} />
            <Route path="/recruiter/jobs/:jobId/applicants" element={<ApplicantsPage />} />
            <Route path="/recruiter/applicants/:applicationId" element={<ApplicantDetailPage />} />
            <Route path="/recruiter/campus" element={<CampusRecruitmentPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/faculty/dashboard" element={<FacultyDashboardPage />} />
            <Route path="/faculty/students" element={<FacultyStudentsPage />} />
            <Route path="/faculty/students/:studentId" element={<FacultyStudentReviewPage />} />
            <Route path="/faculty/events" element={<FacultyEventsPage />} />
            <Route path="/faculty/reports" element={<FacultyReportsPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/jobs" element={<AdminJobsPage />} />
            <Route path="/admin/companies" element={<AdminCompaniesPage />} />
            <Route path="/admin/applications" element={<AdminApplicationsPage />} />
            <Route path="/admin/interviews" element={<AdminInterviewsPage />} />
            <Route path="/admin/events" element={<AdminEventsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/campus" element={<AdminCampusPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={[ROLES.STUDENT, ROLES.ALUMNI, ROLES.RECRUITER, ROLES.FACULTY, ROLES.ADMIN]}
              >
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<MessageThreadPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>

          {placeholderDashboards.map(({ path, role }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={[role]}>
                  <DashboardPlaceholder role={role} />
                </ProtectedRoute>
              }
            />
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}