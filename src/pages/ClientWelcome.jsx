import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const SLIDES = [
  {
    img: '/onboarding-city.png',
    title: 'Bem-vindo ao ServiLocal',
    subtitle: 'Encontre profissionais da sua cidade para resolver o que você precisa.',
  },
  {
    img: '/onboarding-map.png',
    title: 'Serviços perto de você',
    subtitle: 'Encontre profissionais da sua região em poucos minutos.',
  },
  {
    img: '/onboarding-chat.png',
    title: 'Converse antes de contratar',
    subtitle: 'Receba propostas, tire dúvidas e escolha o melhor profissional.',
  },
];

export default function ClientWelcome() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);
  const isLast = current === SLIDES.length - 1;
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const goTo = (idx) => setCurrent(Math.max(0, Math.min(SLIDES.length - 1, idx)));

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) goTo(current + (delta > 0 ? 1 : -1));
    touchStart.current = null;
  };

  const slide = SLIDES[current];

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-12 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Logo topo */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground tracking-tight">
          Servi<span className="text-primary">Local</span>
        </span>
      </div>

      {/* Conteúdo central */}
      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        <img
          key={current}
          src={slide.img}
          alt={slide.title}
          className="w-64 h-64 object-contain drop-shadow-md transition-opacity duration-300"
          onError={(e) => { e.currentTarget.src = '/onboarding-city.png'; }}
        />

        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-bold text-foreground leading-snug">
            {slide.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
            {slide.subtitle}
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div className="w-full max-w-sm space-y-4">
        {isLast ? (
          <button
            onClick={() => navigate('/client')}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md"
          >
            Começar
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/client')}
              className="flex-1 py-4 border border-border text-muted-foreground rounded-2xl font-medium text-base hover:bg-muted/50 transition-colors"
            >
              Pular
            </button>
            <button
              onClick={() => goTo(current + 1)}
              className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md"
            >
              Próximo
            </button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <button
            onClick={() => navigate('/login?role=client')}
            className="text-primary font-semibold hover:underline"
          >
            Entrar
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
          Ao continuar, você concorda com os{' '}
          <button
            onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
            className="underline hover:text-muted-foreground"
          >
            Termos de Uso
          </button>{' '}
          e a{' '}
          <button
            onClick={(e) => { e.stopPropagation(); setShowPrivacy(true); }}
            className="underline hover:text-muted-foreground"
          >
            Política de Privacidade
          </button>.
        </p>
      </div>

      {/* Modal Termos de Uso */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="font-semibold text-foreground">Termos de Uso</h3>
              <button onClick={() => setShowTerms(false)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm text-foreground leading-relaxed">
              <p className="text-xs text-muted-foreground">Última atualização: junho de 2025</p>
              <p>Bem-vindo ao ServiLocal. Ao usar nossa plataforma, você concorda com os termos descritos abaixo.</p>
              <div className="space-y-1"><h4 className="font-semibold">1. Sobre a plataforma</h4><p className="text-muted-foreground">O ServiLocal é um marketplace que conecta clientes a prestadores de serviços locais. Não somos parte na relação de prestação de serviço entre cliente e prestador.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">2. Uso da conta</h4><p className="text-muted-foreground">Você é responsável por manter a confidencialidade de suas credenciais de acesso. É proibido usar a plataforma para fins ilícitos ou prejudiciais a terceiros.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">3. Responsabilidade pelos serviços</h4><p className="text-muted-foreground">O ServiLocal não se responsabiliza pela qualidade, segurança ou legalidade dos serviços prestados. Avaliações e histórico dos prestadores são fornecidos como referência.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">4. Pagamentos</h4><p className="text-muted-foreground">Os valores são combinados diretamente entre cliente e prestador. O ServiLocal pode aplicar uma taxa de plataforma sobre os pagamentos processados.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">5. Cancelamento e disputas</h4><p className="text-muted-foreground">Em caso de disputas, entre em contato com o suporte. Reservamo-nos o direito de suspender contas que violem estes termos.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">6. Alterações</h4><p className="text-muted-foreground">Podemos atualizar estes termos a qualquer momento. Mudanças relevantes serão comunicadas via e-mail ou notificação no aplicativo.</p></div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0">
              <button onClick={() => setShowTerms(false)} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Política de Privacidade */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="font-semibold text-foreground">Política de Privacidade</h3>
              <button onClick={() => setShowPrivacy(false)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm text-foreground leading-relaxed">
              <p className="text-xs text-muted-foreground">Última atualização: junho de 2025</p>
              <p>Sua privacidade é importante para nós. Esta política explica como coletamos, usamos e protegemos seus dados no ServiLocal.</p>
              <div className="space-y-1"><h4 className="font-semibold">1. Dados que coletamos</h4><p className="text-muted-foreground">Coletamos dados de cadastro (nome, e-mail, telefone), dados de uso da plataforma (pedidos criados, avaliações) e, opcionalmente, endereço e foto de perfil.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">2. Como usamos seus dados</h4><p className="text-muted-foreground">Seus dados são usados para operar a plataforma, conectar você a prestadores, enviar notificações relevantes e melhorar nossos serviços. Não vendemos seus dados.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">3. Compartilhamento</h4><p className="text-muted-foreground">Compartilhamos apenas as informações necessárias com prestadores quando você confirma um serviço (nome, telefone de contato). Não compartilhamos com anunciantes.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">4. Seus direitos</h4><p className="text-muted-foreground">Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo suporte. Sua conta pode ser excluída permanentemente mediante solicitação.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">5. Segurança</h4><p className="text-muted-foreground">Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração indevida.</p></div>
              <div className="space-y-1"><h4 className="font-semibold">6. Cookies e rastreamento</h4><p className="text-muted-foreground">Usamos armazenamento local (localStorage) apenas para manter sua sessão autenticada. Não utilizamos cookies de rastreamento de terceiros.</p></div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0">
              <button onClick={() => setShowPrivacy(false)} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
