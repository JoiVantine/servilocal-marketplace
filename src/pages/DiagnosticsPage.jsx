import { useEffect, useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const Check = ({ ok, label, value }) => (
  <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
    {ok ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
    <div>
      <p className={`font-medium ${ok ? 'text-green-800' : 'text-red-700'}`}>{label}</p>
      {value !== undefined && <p className="text-xs text-muted-foreground mt-0.5 break-all">{String(value) || '(vazio)'}</p>}
    </div>
  </div>
);

const Warn = ({ label, detail }) => (
  <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-sm">
    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
    <div>
      <p className="font-medium text-yellow-800">{label}</p>
      {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-6">
    <p className="text-xs font-bold text-muted-foreground tracking-wider mb-3">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

export default function DiagnosticsPage() {
  const [user, setUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.auth.me().then(setUser).catch(console.error);
  }, [refreshKey]);

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['diag-userprofile', user?.id, refreshKey],
    queryFn: () => api.entities.UserProfile.filter({ userId: user.id }),
    enabled: !!user?.id,
  });

  const { data: providerProfiles = [] } = useQuery({
    queryKey: ['diag-providerprofile', user?.id, refreshKey],
    queryFn: () => api.entities.ProviderProfile.filter({ name: user.full_name }),
    enabled: !!user?.full_name,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['diag-requests', user?.id, refreshKey],
    queryFn: () => api.entities.ServiceRequest.filter({ created_by_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['diag-convs', user?.id, refreshKey],
    queryFn: () => api.entities.Conversation.filter({ clientId: user.id }),
    enabled: !!user?.id,
  });

  const up = userProfiles[0];
  const pp = providerProfiles[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Diagnóstico E2E</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Verifica o que está sendo salvo no banco</p>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 border border-border rounded-lg hover:bg-secondary/50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {!user ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* User (built-in) */}
            <Section title="👤 USER (auth.me)">
              <Check ok={!!user.id} label="id" value={user.id} />
              <Check ok={!!user.email} label="email" value={user.email} />
              <Check ok={!!user.full_name} label="full_name" value={user.full_name} />
              <Check ok={!!user.city} label="city" value={user.city} />
              <Check ok={!!user.phone} label="phone" value={user.phone} />
              <Check ok={!!user.photo} label="photo" value={user.photo ? '✓ URL presente' : undefined} />
            </Section>

            {/* UserProfile entity */}
            <Section title="📋 USERPROFILE (entidade)">
              {!up ? (
                <Warn label="Nenhum UserProfile encontrado para este userId" detail="O onboarding do cliente nunca cria este registro. Bug a corrigir." />
              ) : (
                <>
                  <Check ok={!!up.userId} label="userId" value={up.userId} />
                  <Check ok={!!up.phone} label="phone" value={up.phone} />
                  <Check ok={!!up.city} label="city" value={up.city} />
                  <Check ok={!!up.neighborhood} label="neighborhood" value={up.neighborhood} />
                  <Check ok={!!up.address} label="address" value={up.address} />
                  <Check ok={!!up.role} label="role" value={up.role} />
                  <Check ok={!!up.onboardingCompleted} label="onboardingCompleted" value={String(up.onboardingCompleted)} />
                </>
              )}
            </Section>

            {/* ProviderProfile */}
            <Section title="🔧 PROVIDERPROFILE (entidade)">
              {!pp ? (
                <Warn label="Nenhum ProviderProfile encontrado" detail="Só aparece se o usuário fez o onboarding de prestador." />
              ) : (
                <>
                  <Check ok={!!pp.name} label="name" value={pp.name} />
                  <Check ok={!!pp.city} label="city" value={pp.city} />
                  <Check ok={pp.specialties?.length > 0} label={`specialties (${pp.specialties?.length || 0} itens)`} value={pp.specialties?.join(', ')} />
                  <Check ok={!!pp.description} label="description" value={pp.description} />
                  <Warn
                    label="serviceDetails NÃO está sendo salvo"
                    detail="Os campos de valor/duração/domicílio/materiais do ServiceDetailModal ficam só em memória. Falta criar entidade ProviderService e persistir no onboarding."
                  />
                </>
              )}
            </Section>

            {/* ServiceRequests */}
            <Section title={`📄 SERVICEREQUESTS (${requests.length} registros)`}>
              {requests.length === 0 ? (
                <Warn label="Nenhum pedido criado por este usuário ainda" />
              ) : (
                requests.slice(0, 3).map(r => (
                  <Check key={r.id} ok={!!r.title && !!r.city} label={r.title} value={`status: ${r.status} | cidade: ${r.city}`} />
                ))
              )}
            </Section>

            {/* Conversations */}
            <Section title={`💬 CONVERSATIONS (${conversations.length} registros)`}>
              {conversations.length === 0 ? (
                <Warn label="Nenhuma conversa iniciada ainda" />
              ) : (
                conversations.slice(0, 3).map(c => (
                  <Check key={c.id} ok={!!c.clientId && !!c.providerId} label={`Conversa ${c.id.slice(0, 8)}...`} value={`status: ${c.status}`} />
                ))
              )}
            </Section>

            {/* Resumo dos bugs */}
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm font-bold text-red-700 mb-2">🐛 Problemas identificados</p>
              <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                <li>ClientOnboarding não cria registro em UserProfile</li>
                <li>ClientOnboarding não salva address, neighborhood, role, onboardingCompleted</li>
                <li>ProviderOnboarding não persiste serviceDetails (preço, duração, materiais, domicílio)</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}