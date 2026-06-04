import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, CheckCircle2 } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

const SAMPLE_METHODS = [
  {
    id: 'visa',
    label: 'Visa final 4242',
    sub: 'Débito',
    active: true,
    icon: (
      <div className="w-10 h-7 rounded bg-blue-600 flex items-center justify-center">
        <span className="text-white text-xs font-bold tracking-tight">VISA</span>
      </div>
    ),
  },
  {
    id: 'master',
    label: 'Mastercard final 8688',
    sub: 'Crédito',
    active: true,
    icon: (
      <div className="w-10 h-7 rounded flex items-center justify-center">
        <div className="flex -space-x-2">
          <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
          <div className="w-5 h-5 rounded-full bg-orange-400 opacity-90" />
        </div>
      </div>
    ),
  },
  {
    id: 'pix',
    label: 'Pix',
    sub: 'Chave: (11) 98765-4321',
    active: false,
    icon: (
      <div className="w-10 h-7 rounded bg-teal-500 flex items-center justify-center">
        <span className="text-white text-xs font-bold">PIX</span>
      </div>
    ),
  },
];

export default function ClientPayments() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Formas de pagamento</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {SAMPLE_METHODS.map((method, i) => (
            <div
              key={method.id}
              className={`flex items-center gap-3 px-4 py-4 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <div className="shrink-0">{method.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{method.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{method.sub}</p>
              </div>
              {method.active && (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              )}
            </div>
          ))}
        </div>

        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Adicionar forma de pagamento
        </button>

        <p className="text-xs text-center text-muted-foreground px-4">
          Integração com pagamentos em breve.
        </p>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
