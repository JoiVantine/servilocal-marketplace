import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { CATEGORIES, ICON_MAP } from '@/lib/categories';
import { Wrench } from 'lucide-react';

export function useServices() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['services-catalog'],
    queryFn: () => api.entities.Service.list('order'),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const categories = data.length > 0
    ? data.map(svc => ({
        name: svc.name,
        subcategories: svc.subcategories || [],
        icon: ICON_MAP[svc.name] || Wrench,
      }))
    : CATEGORIES;

  return { categories, isLoading: isLoading && data.length === 0 };
}
