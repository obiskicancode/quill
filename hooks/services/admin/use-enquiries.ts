'use client';

import { useQuery } from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import { queryKeys } from '@/hooks/services/query-keys';

/** Badge count of enquiries still waiting for a first reply. */
export function useNewEnquiryCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.enquiries.newCount(),
    queryFn: async () => {
      const response = await adminService.getNewEnquiryCount();
      return response.data.count;
    },
    enabled,
    refetchInterval: 60_000,
  });
}
