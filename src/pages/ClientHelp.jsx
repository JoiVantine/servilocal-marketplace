import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, HelpCircle, MessageSquare, FileText, Shield } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientHelp() {
  const navigate = useNavigate();

  const items = [
    {
      icon: HelpCircle,
      label: 'Perguntas frequentes',
      action: () => navigate('/client/support'),
    },
    {
      icon: MessageSquare,
      label: 'Falar com suporte',
      action: () => navigate('/client/support'),
    },
    {
      icon: FileText,
      label: 'Termos de uso',
      action: () => {},
    },
    {
      icon: Shield,
      label: 'Política de privacidade',
      action: () => {},
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Ajuda e suporte</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {items.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors text-left ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <item.icon className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Help card */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground mb-1">Precisa de ajuda?</p>
          <p className="text-xs text-muted-foreground mb-4">Nossa equipe está pronta para te atender.</p>
          <button
            onClick={() => navigate('/client/support')}
            className="w-full py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-secondary/50 transition-colors"
          >
            Falar com suporte
          </button>
        </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
