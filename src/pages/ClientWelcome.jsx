import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, X } from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/user_6a1b978483783dbaa09aae7d/7e2cd2b0e_ChatGPT_Image_27_de_mai_de_2026__10_42_43-removebg-preview.png';

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

4. USUÁRIOS CLIENTES
Clientes podem utilizar a plataforma para publicar solicitações de serviços. Ao publicar uma solicitação, o cliente declara que as informações fornecidas são verdadeiras: a demanda é legítima; não utilizará a plataforma para fraude, spam ou atividade ilícita; entendo que o atendimento será realizado por terceiros independentes.

O cliente é responsável por validar diretamente com o prestador: valores, preço, escopo, endereço completo, condições de execução, forma de pagamento.

5. USUÁRIOS PRESTADORES
Prestadores podem utilizar a plataforma para oferecer serviços. Prestadores devem estar autorizados a oferecer os serviços publicados e cumprir todas as leis aplicáveis.

Prestadores são responsáveis por: executar os serviços com qualidade e profissionalismo; manter contato claro com clientes; honrar prazos e condições acordadas.

O ServiLocal não valida, certifica ou garante a qualidade dos serviços oferecidos. A plataforma não fornece seguro, cobertura legal ou garantia de execução.

6. PRIVACIDADE E DADOS
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

export default function ClientWelcome() {
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!acceptedTerms) return;
    setLoading(true);
    navigate('/client/onboarding');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading text-lg font-bold">serviLocal</h1>
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Illustration */}
          <div className="w-40 h-40 mb-8">
            <img
              src={LOGO_URL}
              alt="Ilustração cidade"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Headline */}
          <h2 className="font-heading text-2xl text-center mb-2 text-foreground">
            Encontre <span className="text-primary">profissionais</span>
            <br />
            da sua cidade
          </h2>

          <p className="text-center text-muted-foreground text-sm mb-6">
            Contrате quem está perto, com poucos cliques.
          </p>

          {/* Benefit */}
          <div className="bg-secondary/50 border border-primary/20 rounded-lg p-4 mb-8 flex gap-3 w-full">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-foreground">Cadastro rápido</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete seu perfil em menos de 2 minutos
              </p>
            </div>
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-5 h-5 rounded border-border mt-0.5 cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              Li e concordo com os{' '}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowTerms(true);
                }}
                className="text-primary hover:underline font-medium"
              >
                Termos de Uso
              </button>{' '}
              e{' '}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowPrivacy(true);
                }}
                className="text-primary hover:underline font-medium"
              >
                Política de Privacidade
              </button>
            </span>
          </label>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!acceptedTerms || loading}
            className="w-full px-4 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Começar cadastro
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Sem dados são protegidos e nunca serão compartilhados.
          </p>
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