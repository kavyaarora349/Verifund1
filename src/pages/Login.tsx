import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button, Card } from '../components/ui';
import { Role } from '../types';
import { api, mapBackendRoleToUiRole } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [selectedRole, setSelectedRole] = React.useState<Role>('Finance Officer');
  const [email, setEmail] = React.useState('finance@verifund.gov.in');
  const [password, setPassword] = React.useState('Finance@123');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const roleTemplates: Array<{ role: Role; email: string; password: string; label: string }> = [
    { role: 'Admin', email: 'admin@verifund.gov.in', password: 'Admin@123', label: 'Admin — System Administrator' },
    { role: 'Vendor', email: 'auditor@verifund.gov.in', password: 'Audit@123', label: 'Vendor — Payment Requester' },
    { role: 'Finance Officer', email: 'finance@verifund.gov.in', password: 'Finance@123', label: 'Finance Officer — CFO' },
    { role: 'Dept Head', email: 'depthead@verifund.gov.in', password: 'Dept@123', label: 'Dept Head — NHAI' },
    { role: 'Public', email: 'public@verifund.gov.in', password: 'Public@123', label: 'Public — Citizen View' }
  ];

  const applyTemplate = (role: Role) => {
    const tpl = roleTemplates.find((r) => r.role === role);
    if (!tpl) return;
    setSelectedRole(role);
    setEmail(tpl.email);
    setPassword(tpl.password);
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.login(email, password);
      const uiRole = mapBackendRoleToUiRole(result.user.role);
      setAuth({
        role: uiRole,
        walletAddress: result.user.walletAddress || 'N/A',
        userName: result.user.name,
        email: result.user.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
      navigate(uiRole === 'Public' ? '/public' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm relative space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl text-white shadow-xl shadow-accent/20 mb-4 scale-110">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">VeriFund</h1>
          <p className="text-text-secondary text-sm">Tamper-proof public fund tracking system</p>
        </div>

        <Card className="p-8 space-y-6 shadow-2xl border-white/5">
          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Select Access Role</label>
              <select 
                value={selectedRole}
                onChange={(e) => applyTemplate(e.target.value as Role)}
                className="w-full bg-bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:border-accent outline-none appearance-none"
              >
                {roleTemplates.map((r) => (
                  <option key={r.role} value={r.role}>{r.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-text-muted">
                Use <span className="text-text-primary font-semibold">Admin</span> or{" "}
                <span className="text-text-primary font-semibold">Finance Officer</span> to see Ledger, Budget Allocation, Flags, and Approvals.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:border-accent outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary focus:border-accent outline-none"
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full h-12 shadow-lg shadow-accent/20">
              {loading ? 'Signing in...' : 'Sign In to System'}
            </Button>
          </form>
        </Card>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-success/10 border border-success/20 rounded-full">
            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono text-success uppercase tracking-widest">Backend Auth Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
