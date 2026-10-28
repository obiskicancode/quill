'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { adminService } from '@/app/api/services/admin.service';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { queryKeys } from '@/hooks/services/query-keys';
import type {
  AuditDetailResponse,
  AuditQueryParams,
} from '@/types/audit-admin.types';

function auditQueryString(filters: AuditQueryParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

export function useAuditLogs(filters: AuditQueryParams) {
  const queryString = useMemo(() => auditQueryString(filters), [filters]);

  return useQuery({
    queryKey: queryKeys.admin.audit.list(queryString),
    queryFn: async () => {
      const response = await adminService.listAuditLogs(filters);
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAuditDetail(
  id: string | null,
  enabled = true,
): ReturnType<typeof useQuery<AuditDetailResponse>> {
  return useQuery({
    queryKey: queryKeys.admin.audit.detail(id ?? ''),
    queryFn: async (): Promise<AuditDetailResponse> => {
      if (!id) throw new Error('An audit entry is required.');
      const response = await adminService.getAuditDetail(id);
      if (!response.data) {
        throw new Error(ERROR_MESSAGES.AUDIT_ENTRY_NOT_FOUND);
      }
      return response.data;
    },
    enabled: enabled && Boolean(id),
  });
}
