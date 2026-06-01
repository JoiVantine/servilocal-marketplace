import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Home, List, CalendarDays, Pencil, MessageCircle, CheckCircle, Star, Inbox, Zap, MapPin, Clock, Briefcase } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ProposalModal from '@/components/ProposalModal';

const LOGO_URL = "https://media.base44.com/images/public/6a1cd8a8428cf973557907e8/947386a2f_ChatGPT_Image_27_de_mai_de_2026__10_42_43-removebg-preview.png";

export default function ProviderHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [providerSpecialties, setProviderSpecialties] = useState([]);
  const [hasProviderServices, setHasProviderServices] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [accepting, setAccepting] = useState(true);
  const [userProfileId, setUserProfileId] = useState(null);
  const [proposalRequest, setProposalRequest] = useState(null);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const profiles = await base44.entities.UserProfile.filter({ userId: u.id });
      const providerProfile = profiles.find(p => (p.role === 'provider' || p.role === 'both') && p.onboardingCompleted);
      if (!providerProfile) { navigate('/provider/onboarding'); return; }
      setUserProfileId(providerProfile.id);
      setAccepting(providerProfile.active !== false);
      // Load provider specialties for matching
      const provProfiles = await base44.entities.ProviderProfile.filter({ created_by_id: u.id });
      if (provProfiles.length > 0) setProviderSpecialties(provProfiles[0].specialties || []);
      const services = await base44.entities.ProviderService.filter({ providerId: u.id });
      setHasProviderServices(services.length > 0);
    }).catch(() => navigate('/provider/onboarding'));
  }, []);

  const handleToggleAccepting = async () => {
    const next = !accepting;
    setAccepting(next);
    if (userProfileId) {
      await base44.entities.UserProfile.update(userProfileId, { active: next });
    }
  };

  const { data: rawRequests = [], isLoading } = useQuery({
    queryKey: ['provider-requests', user?.city],
    queryFn: async () => {
      const query = { status: 'open' };
      if (user?.city) query.city = user.city;
      return base44.entities.ServiceRequest.filter(query, '-created_date', 50);
    },
    enabled: !!user,
  });

  // Filter by specialties match (if provider has specialties set)
  const requests = providerSpecialties.length > 0
    ? rawRequests.filter(r => !r.subcategory || providerSpecialties.includes(r.subcategory))
    : rawRequests;

  const { data: conversations = [] } = useQuery({
    queryKey: ['provider-conversations', user?.id],
    queryFn: () => base44.entities.Conversation.filter({ providerId: user.id }),
    enabled: !!user?.id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-reviews', user?.id],
    queryFn: () => base44.entities.ProviderReview.filter({ providerId: user.id }),
    enabled: !!user?.id,
  });

  const completed = conversations.filter(c => c.status === 'completed').length;
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const inConversation = conversations.filter(c => c.status === 'active').length;

  const handleLogout = () => base44.auth.logout('/');

  const firstName = (user?.fullName || user?.full_name)?.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-1"
        >
          Logout
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted-foreground">Olá,</p>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-3xl font-bold text-foreground">{firstName || '...'}</h1>
            <button
              onClick={() => navigate('/provider/onboarding')}
              className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${accepting ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            <div>
              <p className="text-sm font-semibold text-foreground">Recebendo pedidos</p>
              <p className="text-xs text-muted-foreground">
                {accepting ? 'Você está visível para novos clientes.' : 'Você está invisível para novos clientes.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAccepting}
            className={`relative w-12 h-6 rounded-full transition-colors ${accepting ? 'bg-primary' : 'bg-border'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${accepting ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'available', label: 'Disponíveis', count: requests.length },
            { id: 'conversation', label: 'Em conversa', count: inConversation },
            { id: 'completed', label: 'Concluídos', count: completed },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl border text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground'
              }`}
            >
              <span className="font-bold text-base leading-none">{tab.count}</span>
              <span className="mt-0.5 leading-tight text-center">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Seus Números */}
        <div>
          <p className="text-xs font-bold text-muted-foreground tracking-wider mb-3">SEUS NÚMEROS</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">CONVERSAS</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{conversations.length}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">CONCLUÍDOS</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{completed}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">AVALIAÇÃO MÉDIA</p>
              </div>
              {avgRating ? (
                <p className="text-2xl font-bold text-foreground">{avgRating}</p>
              ) : (
                <p className="text-sm text-primary font-medium mt-1">Sem avaliações</p>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">TOTAL AVALIAÇÕES</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
            </div>
          </div>
        </div>

        {/* Requests or empty state */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 || !accepting ? (
          <div className="flex flex-col items-center py-10 gap-3 text-center">
            <Inbox className="w-14 h-14 text-muted-foreground/40" />
            <p className="font-semibold text-foreground text-base">Nenhum pedido disponível</p>
            {hasProviderServices === false ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  Você ainda não cadastrou categorias ou serviços.{' '}
                  <button
                    onClick={() => navigate('/provider/onboarding?step=services')}
                    className="text-primary underline"
                  >
                    Complete seu perfil
                  </button>{' '}
                  para começar a receber pedidos compatíveis.
                </p>
                <button
                  onClick={() => navigate('/provider/onboarding?step=services')}
                  className="mt-2 px-6 py-2.5 border border-border rounded-full text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                >
                  Completar perfil
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Ainda não há pedidos na sua área compatíveis com seus serviços. Volte mais tarde.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(request => (
              <div key={request.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{request.title}</h3>
                  {request.urgency === 'urgent' && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-50 text-red-600">Urgente</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{request.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{request.city}</div>
                  <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.floor((Date.now() - new Date(request.created_date)) / 60000)} min atrás</div>
                </div>
                <button
                  onClick={() => setProposalRequest(request)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90"
                >
                  <Zap className="w-4 h-4" /> Tenho interesse
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {proposalRequest && (
        <ProposalModal
          request={proposalRequest}
          onClose={() => setProposalRequest(null)}
          onSent={() => setProposalRequest(null)}
        />
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <button className="flex-1 flex flex-col items-center gap-1 py-3 text-primary font-medium">
            <Home className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </button>
          <Link to="/provider/services" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <Briefcase className="w-5 h-5" />
            <span className="text-xs">Meus serviços</span>
          </Link>
          <Link to="/provider/conversations" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">Conversas</span>
          </Link>
        </div>
      </div>
    </div>
  );
}