import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2, Pencil, X, Check, Search, User, MapPin, Phone, Shield, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const ROLE_LABELS = { client: 'Cliente', provider: 'Prestador', both: 'Ambos' };
const ROLE_COLORS = { client: 'bg-blue-100 text-blue-700', provider: 'bg-green-100 text-green-700', both: 'bg-purple-100 text-purple-700' };

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 200),
  });

  const { data: providerProfiles = [] } = useQuery({
    queryKey: ['admin-provider-profiles'],
    queryFn: () => base44.entities.ProviderProfile.list('-created_date', 200),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date', 200),
  });

  const [userCache, setUserCache] = useState({});

  const fetchUserData = async (userId) => {
    if (userCache[userId]) return userCache[userId];
    try {
      const u = await base44.entities.User.get(userId);
      const data = { name: u.full_name || u.fullName, phone: u.phone, city: u.city };
      setUserCache(prev => ({ ...prev, [userId]: data }));
      return data;
    } catch {
      return { name: userId };
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-profiles'] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserProfile.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-profiles'] }),
  });

  const deleteProviderMutation = useMutation({
    mutationFn: (id) => base44.entities.ProviderProfile.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-provider-profiles'] }),
  });

  const filtered = profiles.filter(p => {
    const u = userCache[p.userId];
    return !search ||
    (u?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u?.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (u?.phone || '').includes(search) ||
    p.role?.includes(search);
  });

  const startEdit = (profile) => {
    setEditingId(profile.id);
    setEditData({ neighborhood: profile.neighborhood || '', role: profile.role || 'client', active: profile.active ?? true });
  };

  const handleDelete = async (profile) => {
    if (!confirm('Deletar este perfil de usuário? Isso também removerá todos os dados relacionados.')) return;
    try {
      await base44.functions.invoke('deleteUserCascade', { userId: profile.userId });
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-provider-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">Painel Admin — Usuários</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-border hover:bg-secondary/50">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <Link to="/" className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary/50">← Início</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Perfis cadastrados</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{providerProfiles.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Prestadores</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{requests.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pedidos</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade, telefone ou papel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum usuário cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(profile => {
              const isEditing = editingId === profile.id;
              const isExpanded = expandedId === profile.id;
              const providerProfile = providerProfiles.find(pp => pp.name);
              const userRequests = requests.filter(r => r.created_by_id === profile.userId);
              const cachedUser = userCache[profile.userId];

              if (!cachedUser) fetchUserData(profile.userId);

              return (
                <div key={profile.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Main row */}
                  <div className="p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Bairro</label>
                            <input value={editData.neighborhood} onChange={e => setEditData(p => ({...p, neighborhood: e.target.value}))}
                              className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Papel</label>
                            <select value={editData.role} onChange={e => setEditData(p => ({...p, role: e.target.value}))}
                              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card">
                              <option value="client">Cliente</option>
                              <option value="provider">Prestador</option>
                              <option value="both">Ambos</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={editData.active} onChange={e => setEditData(p => ({...p, active: e.target.checked}))} />
                            Conta ativa
                          </label>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => updateMutation.mutate({ id: profile.id, data: editData })}
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
                            <Check className="w-3.5 h-3.5" /> Salvar
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs font-medium">
                            <X className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground">{cachedUser?.name || 'Carregando...'}</p>
                                {profile.role && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile.role] || 'bg-gray-100 text-gray-600'}`}>
                                    {ROLE_LABELS[profile.role] || profile.role}
                                  </span>
                                )}
                                {!profile.active && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Inativo</span>
                                )}
                                {profile.onboardingCompleted && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Onboarding</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                {cachedUser?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cachedUser.phone}</span>}
                                {cachedUser?.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cachedUser.city}{profile.neighborhood ? `, ${profile.neighborhood}` : ''}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                              className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            <button onClick={() => startEdit(profile)}
                              className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleDelete(profile)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <div>
                              <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2">DADOS DO PERFIL</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-secondary/30 rounded-lg p-2">
                                  <p className="text-muted-foreground">User ID</p>
                                  <p className="font-medium text-foreground truncate">{profile.userId}</p>
                                </div>
                                <div className="bg-secondary/30 rounded-lg p-2">
                                  <p className="text-muted-foreground">Cadastrado em</p>
                                  <p className="font-medium text-foreground">{new Date(profile.created_date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                {profile.address && (
                                  <div className="col-span-2 bg-secondary/30 rounded-lg p-2">
                                    <p className="text-muted-foreground">Endereço</p>
                                    <p className="font-medium text-foreground">{profile.address}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {userRequests.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-muted-foreground tracking-wider mb-2">PEDIDOS ({userRequests.length})</p>
                                <div className="space-y-1">
                                  {userRequests.slice(0, 3).map(r => (
                                    <div key={r.id} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 text-xs">
                                      <span className="text-foreground font-medium truncate">{r.title}</span>
                                      <span className="text-muted-foreground ml-2 shrink-0">{r.status}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}