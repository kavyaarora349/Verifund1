/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LedgerExplorer from './pages/LedgerExplorer';
import BudgetAllocation from './pages/BudgetAllocation';
import RequestMoney from './pages/RequestMoney';
import FraudFlags from './pages/FraudFlags';
import ApprovalWorkflow from './pages/ApprovalWorkflow';
import AuditReport from './pages/AuditReport';
import PublicPortal from './pages/PublicPortal';
import AdminPanel from './pages/AdminPanel';
import Unauthorized from './pages/Unauthorized';

// Components
import { PageShell } from './components/layout';
import { RoleGuard, RoleSwitcher } from './components/RoleGuard';

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

export default function App() {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route path="/public" element={
            <div className="bg-bg-base min-h-screen text-text-primary px-6">
              <PublicPortal />
            </div>
          } />

          <Route path="/dashboard" element={
            <RoleGuard requiredRoles={['Admin', 'Vendor', 'Finance Officer', 'Dept Head']}>
              <PageShell>
                <PageTransition><Dashboard /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/ledger" element={
            <RoleGuard requiredRoles={['Admin', 'Vendor', 'Finance Officer', 'Dept Head']}>
              <PageShell>
                <PageTransition><LedgerExplorer /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/budget" element={
            <RoleGuard requiredRoles={['Admin', 'Vendor', 'Finance Officer', 'Dept Head']}>
              <PageShell>
                <PageTransition><BudgetAllocation /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/request-money" element={
            <RoleGuard requiredRoles={['Admin', 'Vendor', 'Finance Officer', 'Dept Head']}>
              <PageShell>
                <PageTransition><RequestMoney /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/flags" element={
            <RoleGuard requiredRoles={['Admin', 'Vendor', 'Finance Officer']}>
              <PageShell>
                <PageTransition><FraudFlags /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/approvals" element={
            <RoleGuard requiredRoles={['Admin', 'Vendor', 'Finance Officer', 'Dept Head']}>
              <PageShell>
                <PageTransition><ApprovalWorkflow /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/audit" element={
            <RoleGuard requiredRoles={['Admin', 'Vendor']}>
              <PageShell>
                <PageTransition><AuditReport /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/admin" element={
            <RoleGuard requiredRoles={['Admin']}>
              <PageShell>
                <PageTransition><AdminPanel /></PageTransition>
              </PageShell>
            </RoleGuard>
          } />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
      
      <RoleSwitcher />
    </Router>
  );
}
