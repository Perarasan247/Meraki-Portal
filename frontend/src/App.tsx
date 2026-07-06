import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import AppLayout from '@/layouts/AppLayout'
import Login from '@/pages/Login'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import EnquiryPage from '@/pages/enquiry/EnquiryPage'
import EnrollmentPage from '@/pages/enrollment/EnrollmentPage'
import BatchesPage from '@/pages/batches/BatchesPage'
import CurriculumPage from '@/pages/curriculum/CurriculumPage'
import BatchExecutionPage from '@/pages/batch-execution/BatchExecutionPage'
import ExpensesPage from '@/pages/expenses/ExpensesPage'
import MarketingPage from '@/pages/marketing/MarketingPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import UsersPage from '@/pages/users/UsersPage'
import AccountPage from '@/pages/account/AccountPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const DEV_BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={DEV_BYPASS_AUTH ? <Navigate to="/" replace /> : <Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/enquiry" element={<EnquiryPage />} />
              <Route path="/enrollment" element={<EnrollmentPage />} />
              <Route path="/batches" element={<BatchesPage />} />
              <Route path="/curriculum" element={<CurriculumPage />} />
              <Route path="/batch-execution" element={<BatchExecutionPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  )
}
