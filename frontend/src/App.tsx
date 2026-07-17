import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AppIndex } from '@/routes/AppIndex'
import { PreviewSwitcher } from '@/components/dev/PreviewSwitcher'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ScrollToTop } from '@/components/ScrollToTop'
import { ConfirmProvider } from '@/components/ui/confirm'
import { PageLoader } from '@/components/PageLoader'

// Layout shells stay eager (small, needed immediately); every page is
// code-split so visitors only download the route they're on.
import AppLayout from '@/layouts/AppLayout'
import SiteLayout from '@/site/SiteLayout'
import StudentLayout from '@/student/StudentLayout'

// Auth
const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
// Public marketing site
const HomePage = lazy(() => import('@/site/HomePage'))
const AboutPage = lazy(() => import('@/site/AboutPage'))
const ServicesPage = lazy(() => import('@/site/ServicesPage'))
const ContactPage = lazy(() => import('@/site/ContactPage'))
// Admin portal
const EnquiryPage = lazy(() => import('@/pages/enquiry/EnquiryPage'))
const EnrollmentPage = lazy(() => import('@/pages/enrollment/EnrollmentPage'))
const BatchesPage = lazy(() => import('@/pages/batches/BatchesPage'))
const CurriculumPage = lazy(() => import('@/pages/curriculum/CurriculumPage'))
const CurriculumBuilderPage = lazy(() => import('@/pages/curriculum/CurriculumBuilderPage'))
const BatchExecutionPage = lazy(() => import('@/pages/batch-execution/BatchExecutionPage'))
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'))
const UsersPage = lazy(() => import('@/pages/users/UsersPage'))
const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'))
const AccountPage = lazy(() => import('@/pages/account/AccountPage'))
// Student portal
const CoursesPage = lazy(() => import('@/student/CoursesPage'))
const CourseViewerPage = lazy(() => import('@/student/CourseViewerPage'))
const StudentAccountPage = lazy(() => import('@/student/StudentAccountPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      // Don't refetch every time the tab regains focus — avoids request storms
      // when switching windows. Data still refreshes on mount after staleTime.
      refetchOnWindowFocus: false,
    },
  },
})

// Standalone/demo builds use hash routing so the app works when opened straight
// from a file:// URL (there's no server to resolve deep links). Normal
// dev/prod builds keep clean BrowserRouter URLs.
const Router = import.meta.env.VITE_USE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConfirmProvider>
          <Router>
            <ScrollToTop />
            <Suspense fallback={<PageLoader className="min-h-dvh" />}>
            <Routes>
              {/* Public marketing website */}
              <Route element={<SiteLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Route>

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Admin portal (staff/admin only) */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute expect="staff">
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AppIndex />} />
                <Route path="enquiry" element={<EnquiryPage />} />
                <Route path="enrollment" element={<EnrollmentPage />} />
                <Route path="batches" element={<BatchesPage />} />
                <Route path="curriculum" element={<CurriculumPage />} />
                <Route path="curriculum/:curriculumId" element={<CurriculumBuilderPage />} />
                <Route path="batch-execution" element={<BatchExecutionPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="account" element={<AccountPage />} />
              </Route>

              {/* Student portal (students only) */}
              <Route
                path="/learn"
                element={
                  <ProtectedRoute expect="student">
                    <StudentLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<CoursesPage />} />
                <Route path="courses/:curriculumId" element={<CourseViewerPage />} />
                <Route path="account" element={<StudentAccountPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
            <PreviewSwitcher />
          </Router>
          </ConfirmProvider>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
