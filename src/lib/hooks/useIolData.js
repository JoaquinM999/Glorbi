import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/apiClient'

const IOL_STALE = 60 * 1000

export function useIolPortfolio(enabled = true) {
  return useQuery({
    queryKey: ['iol', 'portfolio'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/iol/portfolio')
      return data
    },
    enabled,
    staleTime: IOL_STALE,
    refetchInterval: IOL_STALE,
    retry: (count, error) => error?.response?.data?.error === 'iol_not_configured' ? false : count < 1,
  })
}

export function useIolHistory(page = 1, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['iol', 'history', page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/iol/history', { params: { page, limit } })
      return data
    },
    enabled,
    staleTime: IOL_STALE,
    retry: 1,
  })
}

export function useIolPerformance(period = '1M', enabled = true) {
  return useQuery({
    queryKey: ['iol', 'performance', period],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/iol/performance', { params: { period } })
      return data
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
