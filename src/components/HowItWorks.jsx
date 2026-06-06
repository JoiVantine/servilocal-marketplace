const STEPS = [
  {
    number: 1,
    title: "Publique seu pedido",
    description: "Conte o que você precisa em poucos cliques.",
  },
  {
    number: 2,
    title: "Receba propostas",
    description: "Profissionais da região entram em contato com orçamentos.",
  },
  {
    number: 3,
    title: "Escolha quem contratar",
    description: "Converse pelo chat e combine os detalhes diretamente.",
  },
  {
    number: 4,
    title: "Avalie o profissional",
    description: "Depois do serviço, deixe sua avaliação e ajude a comunidade.",
  },
];

export default function HowItWorks() {
  return (
    <section className="px-4 py-10">
      <h2 className="font-heading text-xl sm:text-2xl text-center mb-6">
        Como funciona
      </h2>

      <div className="max-w-sm mx-auto flex flex-col gap-3">
        {STEPS.map((step) => (
          <div
            key={step.number}
            className="flex items-start gap-4 bg-card rounded-xl border border-border px-5 py-4"
          >
            <span className="w-9 h-9 shrink-0 rounded-full border-2 border-primary text-primary flex items-center justify-center text-sm font-semibold">
              {step.number}
            </span>
            <div>
              <h3 className="font-semibold text-sm text-foreground mb-0.5">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}