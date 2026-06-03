import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ICON_MAP } from '@/lib/categories';
import { Wrench } from 'lucide-react';

export function useServices() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['services-catalog'],
    queryFn: () => api.entities.Service.list('order'),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const categories = data.map(svc => ({
    name: svc.name,
    subcategories: svc.subcategories || [],
    icon: ICON_MAP[svc.name] || Wrench,
  }));

  return { categories, isLoading };
}
