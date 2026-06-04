import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, HelpCircle, PlusCircle } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientHelp() {
  const navigate = useNavigate();

  const items = [
    {
      icon: HelpCircle,
      label: 'Perguntas frequentes',
      description: 'Respostas para as dúvidas mais comuns',
      action: () => navigate('/client/faq'),
    },
    {
      icon: PlusCircle,
      label: 'Abrir solicitação',
      description: 'Fale com nossa equipe de suporte',
      action: () => navigate('/client/support'),
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

      <div className="max-w-md mx-auto px-4 py-5">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {items.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors text-left ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
