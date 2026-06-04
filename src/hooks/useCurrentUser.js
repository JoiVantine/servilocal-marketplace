import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';

export const USER_QUERY_KEY = ['currentUser'];

export function useCurrentUser({ redirectOnError = true } = {}) {
  const navigate = useNavigate();
  const result = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: () => api.auth.me(),
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (result.error && redirectOnError) navigate('/');
  }, [result.error]);

  return result;
}

export function useRefreshUser() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: USER_QUERY_KEY });
}
