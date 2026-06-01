import { Search, Building2, Check } from "lucide-react";

const CLIENT_BENEFITS = [
  "Encontre profissionais próximos",
  "Converse direto pelo app",
  "Evite depender de grupos de WhatsApp",
  "Solicite serviços em poucos minutos",
];

const PROVIDER_BENEFITS = [
  "Receba pedidos da sua região",
  "Cadastre seus serviços gratuitamente",
  "Atenda clientes da sua cidade",
  "Organize seus atendimentos em um só lugar",
];

function BenefitCard({ icon: Icon, title, items, iconBg }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex-1 min-w-[260px]">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Benefits() {
  return (
    <section className="px-4 py-10">
      <h2 className="font-heading text-xl sm:text-2xl text-center mb-6">
        Benefícios
      </h2>

      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
        <BenefitCard
          icon={Search}
          title="Para clientes"
          items={CLIENT_BENEFITS}
          iconBg="bg-secondary text-muted-foreground"
        />
        <BenefitCard
          icon={Building2}
          title="Para prestadores"
          items={PROVIDER_BENEFITS}
          iconBg="bg-secondary text-muted-foreground"
        />
      </div>
    </section>
  );
}