import { Hammer, Zap, Droplet, Paintbrush2, Leaf, Sparkles, Home, Scissors, Heart, BookOpen, Monitor, Wrench, Palette, Camera, Calendar, Car } from 'lucide-react';

export const CATEGORIES = [
  {
    name: 'Construção e Reformas',
    icon: Hammer,
    subcategories: ['Pedreiro', 'Pintor', 'Gesseiro', 'Drywall', 'Azulejista', 'Carpinteiro', 'Serralheiro', 'Reforma Geral', 'Instalação de Pisos', 'Impermeabilização', 'Outros'],
  },
  {
    name: 'Elétrica',
    icon: Zap,
    subcategories: ['Eletricista Residencial', 'Eletricista Predial', 'Instalação de Tomadas', 'Instalação de Luminárias', 'Quadro Elétrico', 'Automação Residencial', 'Energia Solar', 'Outros'],
  },
  {
    name: 'Hidráulica',
    icon: Droplet,
    subcategories: ['Encanador', 'Desentupimento', 'Vazamentos', 'Instalação de Torneiras', 'Instalação de Chuveiros', "Caixa d'Água", 'Aquecedores', 'Outros'],
  },
  {
    name: 'Pintura',
    icon: Paintbrush2,
    subcategories: ['Pintura Residencial', 'Pintura Comercial', 'Pintura de Fachadas', 'Pintura Interna', 'Pintura Externa', 'Texturização', 'Grafiato', 'Cimento Queimado', 'Pintura de Portões e Grades', 'Pintura de Telhados', 'Outros'],
  },
  {
    name: 'Jardinagem',
    icon: Leaf,
    subcategories: ['Jardinagem Residencial', 'Paisagismo', 'Corte de Grama', 'Poda de Árvores', 'Manutenção de Jardins', 'Irrigação', 'Outros'],
  },
  {
    name: 'Limpeza',
    icon: Sparkles,
    subcategories: ['Limpeza Residencial', 'Limpeza Comercial', 'Pós-Obra', 'Limpeza de Estofados', 'Limpeza de Vidros', 'Higienização de Ambientes', 'Outros'],
  },
  {
    name: 'Serviços Domésticos',
    icon: Home,
    subcategories: ['Diarista', 'Faxineira', 'Passadeira', 'Cozinheira', 'Babá', 'Cuidador de Idosos', 'Organizador Residencial', 'Outros'],
  },
  {
    name: 'Costuras e Ajustes',
    icon: Scissors,
    subcategories: ['Bainha', 'Ajustes de Roupas', 'Costura Sob Medida', 'Consertos', 'Customização', 'Confecção de Peças', 'Outros'],
  },
  {
    name: 'Beleza e Estética',
    icon: Scissors,
    subcategories: ['Cabeleireiro', 'Manicure', 'Pedicure', 'Maquiagem', 'Design de Sobrancelhas', 'Alongamento de Cílios', 'Estética Facial', 'Estética Corporal', 'Outros'],
  },
  {
    name: 'Saúde e Bem-Estar',
    icon: Heart,
    subcategories: ['Massagista', 'Personal Trainer', 'Nutricionista', 'Psicólogo', 'Fisioterapeuta', 'Cuidador Particular', 'Outros'],
  },
  {
    name: 'Aulas e Consultoria',
    icon: BookOpen,
    subcategories: ['Aulas Particulares', 'Idiomas', 'Música', 'Reforço Escolar', 'Consultoria Empresarial', 'Consultoria Financeira', 'Mentoria', 'Outros'],
  },
  {
    name: 'Tecnologia',
    icon: Monitor,
    subcategories: ['Desenvolvimento de Sites', 'Desenvolvimento de Apps', 'Automação', 'IA', 'Suporte de TI', 'Banco de Dados', 'Integrações', 'Outros'],
  },
  {
    name: 'Assistência Técnica',
    icon: Wrench,
    subcategories: ['Computadores', 'Notebooks', 'Celulares', 'Impressoras', 'TVs', 'Eletrodomésticos', 'Ar-Condicionado', 'Outros'],
  },
  {
    name: 'Design e Marketing',
    icon: Palette,
    subcategories: ['Designer Gráfico', 'Social Media', 'Tráfego Pago', 'Branding', 'Copywriting', 'UX/UI', 'Criação de Sites', 'Outros'],
  },
  {
    name: 'Fotografia e Vídeo',
    icon: Camera,
    subcategories: ['Fotógrafo', 'Filmagem', 'Drone', 'Edição de Fotos', 'Edição de Vídeos', 'Ensaios Fotográficos', 'Outros'],
  },
  {
    name: 'Eventos',
    icon: Calendar,
    subcategories: ['Garçom', 'Bartender', 'DJ', 'Cerimonialista', 'Decoração', 'Recreação Infantil', 'Fotografia para Eventos', 'Outros'],
  },
  {
    name: 'Automotivo',
    icon: Car,
    subcategories: ['Mecânico', 'Funilaria', 'Pintura Automotiva', 'Elétrica Automotiva', 'Lavação', 'Outros'],
  },
];

export const CATEGORY_GROUPS = [
  {
    label: 'CASA E REFORMAS',
    items: ['Construção e Reformas', 'Elétrica', 'Hidráulica', 'Pintura', 'Jardinagem'],
  },
  {
    label: 'DIA A DIA',
    items: ['Limpeza', 'Serviços Domésticos', 'Costuras e Ajustes'],
  },
  {
    label: 'PESSOAL E BEM-ESTAR',
    items: ['Beleza e Estética', 'Saúde e Bem-Estar', 'Aulas e Consultoria'],
  },
  {
    label: 'TECNOLOGIA E NEGÓCIOS',
    items: ['Tecnologia', 'Assistência Técnica', 'Design e Marketing', 'Fotografia e Vídeo'],
  },
  {
    label: 'EVENTOS E VEÍCULOS',
    items: ['Eventos', 'Automotivo'],
  },
];

// Helper: get subcategories for a category name
export function getSubcategories(categoryName) {
  return CATEGORIES.find(c => c.name === categoryName)?.subcategories || [];
}

// Helper: given a subcategory, find its parent category name
export function getCategoryForSubcategory(subcategory) {
  return CATEGORIES.find(c => c.subcategories.includes(subcategory))?.name || '';
}