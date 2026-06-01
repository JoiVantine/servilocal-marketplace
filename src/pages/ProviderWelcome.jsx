import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, X, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GoogleIcon from '../components/GoogleIcon';

const LOGO_URL = '/logo.png';

const TERMS_HTML = `
TERMOS DE USO — SERVILOCAL
Última atualização: 27/05/2026

Bem-vindo ao ServiLocal.

O ServiLocal é uma plataforma digital que conecta clientes que buscam serviços locais a prestadores independentes interessados em atender essas demandas.

Ao utilizar a plataforma, você declara que leu, compreendeu e concorda com estes Termos de Uso.

1. SOBRE A PLATAFORMA
O ServiLocal atua exclusivamente como plataforma de intermediação digital aproximando clientes e prestadores de serviços independentes.

O ServiLocal não executa diretamente qualquer serviço, não emprega os prestadores e não participa da negociação final entre as partes.

Os serviços eventualmente contratados são de responsabilidade exclusiva do cliente e do prestador envolvido.

2. AVISO IMPORTANTE — MVP / VERSÃO BETA
O ServiLocal foi lançada em fase experimental (MVP / Beta). Isto significa que funcionalidades podem sofrer alterações; erros, falhas ou indisponibilidades podem ocorrer. Flucos podem ser modificados sem aviso prévio; dados podem ser ajustados; reiniciados ou removidos durante testes.

Ao utilizar a plataforma, você reconhece que está participando de uma versão experimental. Não recomendamos o uso da plataforma para situações críticas, urgências sensíveis ou demandas cuja falha possa causar prejuízo relevante.

3. CADASTRO E ACESSO
Para utilizar determinadas funcionalidades, o usuário deverá realizar cadastro com informações básicas, incluindo: nome, número de telefone celular, cidade, bairro/região, informações relacionadas aos serviços oferecidos ou solicitados.

O usuário declara que fornecerá informações verdadeiras, completas e atualizadas. O ServiLocal poderá suspender ou remover contas com informações falsas, suspeitas ou inconsistentes.

4. USUÁRIOS PRESTADORES
Prestadores podem utilizar a plataforma para oferecer serviços. Prestadores devem estar autorizados a oferecer os serviços publicados e cumprir todas as leis aplicáveis.

Prestadores são responsáveis por: executar os serviços com qualidade e profissionalismo; manter contato claro com clientes; honrar prazos e condições acordadas.

O ServiLocal não valida, certifica ou garante a qualidade dos serviços oferecidos. A plataforma não fornece seguro, cobertura legal ou garantia de execução.

5. PRIVACIDADE E DADOS
Seus dados são utilizados para funcionamento da plataforma: autenticação, busca de serviços, conexão entre clientes e prestadores, análise de qualidade de serviço. Seus dados não serão vendidos para terceiros, exceto conforme exigido por lei.
`;

const PRIVACY_HTML = `
POLÍTICA DE PRIVACIDADE — SERVILOCAL
Última atualização: 27/05/2026

1. DADOS COLETADOS
Coletamos: nome, telefone, cidade, bairro/região, serviços selecionados, disponibilidade, informações de localizações, fotos anexadas, dados técnicos básicos de navegação.

2. FINALIDADE
Utilizamos os dados para: autenticação, criação de contas, conexão entre clientes e prestadores, matching de solicitações, operação da plataforma, suporte, prevenção de abuso/fraude, melhoria do produto.

3. COMPARTILHAMENTO
Dados poderão ser compartilhados entre usuários apenas quando necessário para operação da plataforma. Exemplo: cliente e prestador conectados para atendimento. Também poderá haver compartilhamento técnico necessário ao funcionamento da plataforma.

4. ARMAZENAMENTO
Os dados poderão ser armazenados em serviços de terceiros utilizados pela infraestrutura da plataforma. Adotamos medidas razoáveis de segurança, mas nenhum sistema é totalmente inviolável.

5. DIREITOS DO TITULAR
Nos termos de LGPD, você poderá solicitar: acesso aos seus dados, correção, exclusão, quando aplicável; esclarecimentos sobre tratamento.

6. CONTATO
Solicitações relacionadas à privacidade podem ser enviadas para: [seu e-mail de contato]
`;

export default function ProviderWelcome() {
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!acceptedTerms) return;
    setLoading(true);
    navigate('/provider/onboarding');
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider('google', '/provider/onboarding');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back button */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-secondary rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 flex flex-col flex-1">
        {/* Illustration */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-44 h-44 rounded-full border-2 border-border overflow-hidden mb-8 bg-card flex items-center justify-center">
            <img src={LOGO_URL} alt="ServiLocal" className="w-full h-full object-contain p-4" />
          </div>

          {/* Headline */}
          <h2 className="font-heading text-2xl text-center font-bold text-foreground mb-6 leading-snug">
            Conectamos quem<br />precisa com{' '}
            <span className="text-[#c17f3a]">quem faz</span>
          </h2>

          {/* Benefit box */}
          <div className="bg-card border border-border rounded-xl p-4 flex gap-3 w-full">
            <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-primary">Perfil pronto em menos de 2 minutos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cadastre-se e comece a receber pedidos rapidamente.</p>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="py-6 space-y-3">
          {/* Terms */}
          <label className="flex items-center gap-3 cursor-pointer bg-card border border-border rounded-xl px-4 py-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-4 h-4 rounded-full border-border cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              Li e aceito os{' '}
              <button onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-primary underline font-medium">Termos de Uso</button>
              {' '}e a{' '}
              <button onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-primary underline font-medium">Política de Privacidade</button>.
            </span>
          </label>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!acceptedTerms || loading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Começar cadastro
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">OU</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full py-3.5 border border-border rounded-xl font-medium text-sm text-foreground flex items-center justify-center gap-2 hover:bg-secondary/30 transition-colors bg-card"
          >
            <GoogleIcon />
            Continuar com Google
          </button>



          {/* Disclaimer */}
          <div className="flex items-start gap-2 pt-1">
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground text-center">
              O ServiLocal está em fase de testes. Serviços são executados por prestadores independentes.
            </p>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Termos de Uso</h3>
              <button
                onClick={() => setShowTerms(false)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs text-muted-foreground whitespace-pre-wrap">
              {TERMS_HTML}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowTerms(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Política de Privacidade</h3>
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs text-muted-foreground whitespace-pre-wrap">
              {PRIVACY_HTML}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}