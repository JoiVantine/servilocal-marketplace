import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Lock, Mail, Phone, Eye, EyeOff, Loader2, MapPin, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOGO_URL = '/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'client';
  const emailParam = searchParams.get('email') || '';

  const [identifier, setIdentifier] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isClient = role === 'client';
  const roleLabel = isClient ? 'Cliente' : 'Prestador';
  const oppositeRole = isClient ? 'provider' : 'client';
  const oppLabel = isClient ? 'Prestador' : 'Cliente';
  const RoleIcon = isClient ? Search : Building2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.loginViaEmailPassword(identifier, password, role);
      navigate(isClient ? '/client' : '/provider');
    } catch (err) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const emailForReset = identifier.includes('@') ? identifier : '';
    if (!emailForReset) { setError('Digite seu e-mail para receber o link de recuperação.'); return; }
    setError('');
    try {
      await api.auth.resetPasswordRequest(emailForReset);
      setResetSent(true);
    } catch {
      setError('Erro ao enviar link.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">

      {/* Logo da cidade */}
      <div className="flex flex-col items-center mb-8">
        <img src={LOGO_URL} alt="ServiLocal" className="w-20 h-20 object-contain mb-3" />
        <span className="text-xl font-semibold text-foreground tracking-tight">
          Servi<span className="font-bold text-primary">Local</span>
        </span>
        <div className="flex items-center gap-1.5 bg-secondary/60 text-muted-foreground text-xs px-3 py-1 rounded-full mt-2">
          <MapPin className="w-3 h-3 text-primary" />
          Da sua cidade, para a sua cidade
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Título com ícone de perfil */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <RoleIcon className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Entrar como {roleLabel}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground text-center mb-6">Bem-vindo de volta!</p>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}
          {resetSent && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
              Link enviado! Verifique seu e-mail.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">E-mail ou celular</label>
              <div className="relative">
                {identifier.includes('@') || !identifier
                  ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="voce@exemplo.com ou (DDD) 90000-0000"
                  className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</>
                : 'Entrar'}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            <button
              onClick={handleForgot}
              className="text-primary hover:underline font-medium"
            >
              Esqueci minha senha
            </button>
            <span className="text-muted-foreground text-xs">ou</span>
            <button
              onClick={() => navigate(`/login?role=${oppositeRole}${identifier.includes('@') ? `&email=${encodeURIComponent(identifier)}` : ''}`)}
              className="text-foreground font-medium hover:underline"
            >
              Entrar como {oppLabel}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Não tem conta?{' '}
          <Link
            to={isClient ? '/client/welcome' : '/provider/welcome'}
            className="text-primary font-medium hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
