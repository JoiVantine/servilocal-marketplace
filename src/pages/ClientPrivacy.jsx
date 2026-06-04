import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientPrivacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Política de privacidade</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5 text-sm text-foreground leading-relaxed">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Última atualização: junho de 2025</p>
            <p>
              Sua privacidade é importante para nós. Esta política explica como coletamos,
              usamos e protegemos seus dados no ServiLocal.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">1. Dados que coletamos</h2>
            <p className="text-muted-foreground">
              Coletamos dados de cadastro (nome, e-mail, telefone), dados de uso da plataforma
              (pedidos criados, avaliações) e, opcionalmente, endereço e foto de perfil.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">2. Como usamos seus dados</h2>
            <p className="text-muted-foreground">
              Seus dados são usados para operar a plataforma, conectar você a prestadores,
              enviar notificações relevantes e melhorar nossos serviços. Não vendemos seus dados.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">3. Compartilhamento</h2>
            <p className="text-muted-foreground">
              Compartilhamos apenas as informações necessárias com prestadores quando você
              confirma um serviço (nome, telefone de contato). Não compartilhamos com anunciantes.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">4. Seus direitos</h2>
            <p className="text-muted-foreground">
              Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento
              pelo suporte. Sua conta pode ser excluída permanentemente mediante solicitação.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">5. Segurança</h2>
            <p className="text-muted-foreground">
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
              não autorizado, perda ou alteração indevida.
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">6. Cookies e rastreamento</h2>
            <p className="text-muted-foreground">
              Usamos armazenamento local (localStorage) apenas para manter sua sessão autenticada.
              Não utilizamos cookies de rastreamento de terceiros.
            </p>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Para exercer seus direitos ou tirar dúvidas, acesse o{' '}
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
