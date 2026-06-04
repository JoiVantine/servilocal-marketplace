import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Headphones, MessageSquare, Mail, BookOpen, LifeBuoy } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

const WHATSAPP_NUMBER = '5511999999999';
const SUPPORT_EMAIL = 'suporte@servilocal.com';

export default function ClientHelp() {
  const navigate = useNavigate();

  const channels = [
    {
      icon: MessageSquare,
      label: 'WhatsApp',
      description: 'Fale com a gente pelo WhatsApp',
      action: () => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank'),
    },
    {
      icon: Mail,
      label: 'E-mail',
      description: SUPPORT_EMAIL,
      action: () => window.open(`mailto:${SUPPORT_EMAIL}`, '_blank'),
    },
    {
      icon: BookOpen,
      label: 'Central de ajuda',
      description: 'Perguntas frequentes',
      action: () => navigate('/client/support'),
    },
    {
      icon: LifeBuoy,
      label: 'Abrir chamado',
      description: 'Acompanhe seus chamados',
      action: () => navigate('/client/support'),
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-background border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-heading text-lg font-bold text-foreground">Ajuda e suporte</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Hero card */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">Como podemos te ajudar?</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fale com nossa equipe e resolvemos o que precisar.
            </p>
          </div>
        </div>

        {/* Channels */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-2 px-1">
            CANAIS DE ATENDIMENTO
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {channels.map((ch, i) => (
              <button
                key={ch.label}
                onClick={ch.action}
                className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/30 transition-colors text-left ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ch.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{ch.label}</p>
                  <p className="text-xs text-muted-foreground">{ch.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="bg-secondary/50 border border-border rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-foreground">Horário de atendimento</p>
          <p className="text-sm text-muted-foreground mt-0.5">Segunda a sexta, das 8h às 18h</p>
        </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
