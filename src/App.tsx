import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { Spinner } from './components/ui'

// Route-level code splitting: each page ships as its own chunk fetched on
// first visit, instead of one bundle everyone downloads to see the login
// screen. Dashboard.tsx also pulls in the PDF renderer transitively, which
// is the single heaviest dependency in the app.
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const More = lazy(() => import('./pages/More'))
const CustomerList = lazy(() => import('./pages/customers/CustomerList'))
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'))
const CustomerForm = lazy(() => import('./pages/customers/CustomerForm'))
const QuoteList = lazy(() => import('./pages/quotes/QuoteList'))
const QuoteForm = lazy(() => import('./pages/quotes/QuoteForm'))
const QuoteDetail = lazy(() => import('./pages/quotes/QuoteDetail'))
const InvoiceList = lazy(() => import('./pages/invoices/InvoiceList'))
const InvoiceForm = lazy(() => import('./pages/invoices/InvoiceForm'))
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'))
const Accounts = lazy(() => import('./pages/accounts/Accounts'))
const ExpenseList = lazy(() => import('./pages/expenses/ExpenseList'))
const ExpenseDetail = lazy(() => import('./pages/expenses/ExpenseDetail'))
const ReceiptCapture = lazy(() => import('./pages/ReceiptCapture'))
const ServiceReminders = lazy(() => import('./pages/services/ServiceReminders'))
const ServiceForm = lazy(() => import('./pages/services/ServiceForm'))
const Settings = lazy(() => import('./pages/settings/Settings'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/more" element={<More />} />

              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/new" element={<CustomerForm />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/customers/:id/edit" element={<CustomerForm />} />

              <Route path="/quotes" element={<QuoteList />} />
              <Route path="/quotes/new" element={<QuoteForm />} />
              <Route path="/quotes/:id" element={<QuoteDetail />} />
              <Route path="/quotes/:id/edit" element={<QuoteForm />} />

              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceForm />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/edit" element={<InvoiceForm />} />

              <Route path="/accounts" element={<Accounts />} />

              <Route path="/expenses" element={<ExpenseList />} />
              <Route path="/expenses/new" element={<ReceiptCapture />} />
              <Route path="/expenses/:id" element={<ExpenseDetail />} />

              <Route path="/services" element={<ServiceReminders />} />
              <Route path="/services/new" element={<ServiceForm />} />

              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
