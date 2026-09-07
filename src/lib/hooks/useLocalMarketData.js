import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';

export function useMacroData() {
  return useQuery({
    queryKey: ['localMarket', 'macro'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/iol/market/macro');
      return data;
    },
    refetchInterval: 60000,
  });
}

export function useLocalPanel(panel) {
  return useQuery({
    queryKey: ['localMarket', 'panel', panel],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/iol/market/${panel}`);
      return data;
    },
    enabled: !!panel,
    refetchInterval: 60000,
    retry: false,
  });
}
