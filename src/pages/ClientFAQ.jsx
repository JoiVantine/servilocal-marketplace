import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import ClientBottomNav from '@/components/ClientBottomNav';

const FAQS = [
  {
    q: 'Como faço um pedido de serviço?',
    a: 'Na tela inicial, toque na categoria do serviço que precisa (ex: Elétrica, Limpeza). Descreva o que precisa e publique o pedido. Prestadores da sua cidade vão enviar propostas.',
  },
  {
    q: 'Como escolho um prestador?',
    a: 'Após publicar seu pedido, você receberá propostas de prestadores interessados. Veja o perfil, avaliações e o valor proposto. Quando decidir, toque em "Confirmar profissional".',
  },
  {
    q: 'Posso cancelar um pedido?',
    a: 'Sim. Enquanto o pedido estiver em aberto ou em conversa, você pode cancelá-lo na tela de detalhes do pedido.',
  },
  {
    q: 'Como avalio um serviço concluído?',
    a: 'Após o serviço ser marcado como concluído, você receberá uma notificação para avaliar o prestador. A avaliação aparecerá no perfil público dele.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Seus dados pessoais são armazenados com segurança e nunca compartilhados com terceiros sem seu consentimento. Consulte nossa Política de Privacidade para detalhes.',
  },
  {
    q: 'Como entro em contato com o suporte?',
    a: 'Acesse Ajuda → Falar com suporte, ou toque no botão abaixo. Nossa equipe responde em até 24 horas úteis.',
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-foreground pr-3">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function ClientFAQ() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Perguntas frequentes</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {FAQS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground mb-1">Não encontrou sua resposta?</p>
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
