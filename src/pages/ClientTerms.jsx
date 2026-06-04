import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientTerms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Termos de uso</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5 text-sm text-foreground leading-relaxed">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Última atualização: junho de 2025</p>
            <p>
              Bem-vindo ao ServiLocal. Ao usar nossa plataforma, você concorda com os termos
              descritos abaixo.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">1. Sobre a plataforma</h2>
            <p className="text-muted-foreground">
              O ServiLocal é um marketplace que conecta clientes a prestadores de serviços locais.
              Não somos parte na relação de prestação de serviço entre cliente e prestador.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">2. Uso da conta</h2>
            <p className="text-muted-foreground">
              Você é responsável por manter a confidencialidade de suas credenciais de acesso.
              É proibido usar a plataforma para fins ilícitos ou prejudiciais a terceiros.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">3. Responsabilidade pelos serviços</h2>
            <p className="text-muted-foreground">
              O ServiLocal não se responsabiliza pela qualidade, segurança ou legalidade dos
              serviços prestados. Avaliações e histórico dos prestadores são fornecidos como
              referência.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">4. Pagamentos</h2>
            <p className="text-muted-foreground">
              Os valores são combinados diretamente entre cliente e prestador. O ServiLocal
              pode aplicar uma taxa de plataforma sobre os pagamentos processados.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">5. Cancelamento e disputas</h2>
            <p className="text-muted-foreground">
              Em caso de disputas, entre em contato com o suporte. Reservamo-nos o direito
              de suspender contas que violem estes termos.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">6. Alterações</h2>
            <p className="text-muted-foreground">
              Podemos atualizar estes termos a qualquer momento. Mudanças relevantes serão
              comunicadas via e-mail ou notificação no aplicativo.
            </p>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Dúvidas? Entre em contato pelo{' '}
              <button
                onClick={() => navigate('/client/support')}
                className="text-primary underline"
              >
                suporte
              </button>.
            </p>
          </div>
        </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
