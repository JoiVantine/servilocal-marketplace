import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

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
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">Nenhuma forma de pagamento</p>
          <p className="text-sm text-muted-foreground">
            Integração com pagamentos em breve.
          </p>
        </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
