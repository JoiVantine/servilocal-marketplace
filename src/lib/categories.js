import { Hammer, Zap, Droplet, Paintbrush2, Leaf, Sparkles, Home, Scissors, Heart, BookOpen, Monitor, Wrench, Palette, Camera, Calendar, Car } from 'lucide-react';

export const ICON_MAP = {
  'Construção e Reformas': Hammer,
  'Elétrica': Zap,
  'Hidráulica': Droplet,
  'Pintura': Paintbrush2,
  'Jardinagem': Leaf,
  'Limpeza': Sparkles,
  'Serviços Domésticos': Home,
  'Costuras e Ajustes': Scissors,
  'Beleza e Estética': Scissors,
  'Saúde e Bem-Estar': Heart,
  'Aulas e Consultoria': BookOpen,
  'Tecnologia': Monitor,
  'Assistência Técnica': Wrench,
  'Design e Marketing': Palette,
  'Fotografia e Vídeo': Camera,
  'Eventos': Calendar,
  'Automotivo': Car,
};

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
