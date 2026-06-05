import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Lock, Eye, EyeOff, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';

function Rule({ ok, label }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </div>
  );
}

const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export default function PasswordSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const next = searchParams.get('next') || '/';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const hasMin8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = SPECIAL_RE.test(password);
  const matches = password.length > 0 && password === confirm;

  const isValid = hasMin8 && hasUpper && hasSpecial && matches;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);
    try {
      await api.auth.setPassword(password);
      navigate(next);
    } catch (err) {
      setError(err.message || 'Erro ao definir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendMsg('');
    try {
      await api.auth.resetPasswordRequest(email);
      setResendMsg('Link enviado! Verifique seu e-mail.');
    } catch {
      setResendMsg('Erro ao enviar link.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={Lock}
      title="Crie sua senha"
      subtitle="Escolha uma senha segura para proteger sua conta."
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nova senha */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nova senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPass ? 'text' : 'password'}
              autoFocus
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Regras de validação */}
          {password.length > 0 && (
            <div className="space-y-1 mt-2">
              <Rule ok={hasMin8} label="Mínimo 8 caracteres" />
              <Rule ok={hasUpper} label="Uma letra maiúscula" />
              <Rule ok={hasSpecial} label="Um caractere especial (!@#$%...)" />
            </div>
          )}
        </div>

        {/* Confirmar senha */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Confirmar senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm.length > 0 && !matches && (
            <p className="text-xs text-destructive">As senhas não coincidem.</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-12 font-medium"
          disabled={!isValid || loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Definir senha'
          )}
        </Button>
      </form>

      {/* Reenviar link */}
      {email && (
        <div className="mt-5 text-center text-sm text-muted-foreground">
          Problemas?{' '}
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="text-primary font-medium hover:underline disabled:opacity-50"
          >
            {resendLoading ? 'Enviando...' : 'Reenviar link de acesso'}
          </button>
          {resendMsg && <p className="mt-1 text-xs">{resendMsg}</p>}
        </div>
      )}
    </AuthLayout>
  );
}
