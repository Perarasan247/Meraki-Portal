import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import Login from '@/pages/Login'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import EnquiryPage from '@/pages/enquiry/EnquiryPage'
import EnrollmentPage from '@/pages/enrollment/EnrollmentPage'
import BatchesPage from '@/pages/batches/BatchesPage'
import CurriculumPage from '@/pages/curriculum/CurriculumPage'
import CurriculumBuilderPage from '@/pages/curriculum/CurriculumBuilderPage'
import BatchExecutionPage from '@/pages/batch-execution/BatchExecutionPage'
import ExpensesPage from '@/pages/expenses/ExpensesPage'
import UsersPage from '@/pages/users/UsersPage'
import AccountPage from '@/pages/account/AccountPage'
import SiteLayout from '@/site/SiteLayout'
import HomePage from '@/site/HomePage'
import AboutPage from '@/site/AboutPage'
import ServicesPage from '@/site/ServicesPage'
import ContactPage from '@/site/ContactPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public marketing website */}
              <Route element={<SiteLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Route>

              {/* Portal auth */}
              <Route path="/login" element={DEV_BYPASS_AUTH ? <Navigate to="/app" replace /> : <Login />} />

              {/* Portal (auth-gated) */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="enquiry" element={<EnquiryPage />} />
                <Route path="enrollment" element={<EnrollmentPage />} />
                <Route path="batches" element={<BatchesPage />} />
                <Route path="curriculum" element={<CurriculumPage />} />
                <Route path="curriculum/:curriculumId" element={<CurriculumBuilderPage />} />
                <Route path="batch-execution" element={<BatchExecutionPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="account" element={<AccountPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
