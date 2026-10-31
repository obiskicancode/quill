'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { queryKeys } from '@/hooks/services/query-keys';
import type {
  BlockCheckInput,
  BlocksListQueryInput,
  CalendarDayResponse,
  CalendarResponse,
  CreateBlockInput,
  RoomBlocksListResponse,
  UpdateBlockInput,
} from '@/types/calendar.types';

interface CalendarRangeParams {
  from?: string;
  days?: number;
  roomTypeId?: string;
}

interface CalendarRangeOptions {
  initialData?: CalendarResponse;
  poll?: boolean;
}

export function useCalendarRange(
  params: CalendarRangeParams,
  { initialData, poll = false }: CalendarRangeOptions = {},
) {
  return useQuery({
    queryKey: queryKeys.admin.calendar.range(
      params.from,
      params.days,
      params.roomTypeId,
    ),
    queryFn: async (): Promise<CalendarResponse> => {
      const response = await adminService.getCalendar(params);
      return response.data;
    },
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchInterval: () => (poll ? 60_000 : false),
    refetchIntervalInBackground: false,
  });
}

export function useCalendarDay(date: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.calendar.day(date ?? ''),
    queryFn: async (): Promise<CalendarDayResponse> => {
      if (!date) throw new Error(ERROR_MESSAGES.FAILED_TO_LOAD_DAY_DETAILS);
      const response = await adminService.getCalendarDay(date);
      return response.data;
    },
    enabled: Boolean(date),
  });
}

function blocksQueryString(params: BlocksListQueryInput) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    status: params.status,
    ...(params.roomTypeId ? { roomTypeId: params.roomTypeId } : {}),
    ...(params.roomId ? { roomId: params.roomId } : {}),
    ...(params.reason ? { reason: params.reason } : {}),
  });
  return query.toString();
}

export function useBlocksList(
  params: BlocksListQueryInput,
  initialData?: RoomBlocksListResponse,
) {
  return useQuery({
    queryKey: queryKeys.admin.blocks.list(blocksQueryString(params)),
    queryFn: async () => {
      const response = await adminService.listBlocks(params);
      return response.data;
    },
    initialData,
    placeholderData: keepPreviousData,
  });
}

export function useBlockConflicts(
  input: BlockCheckInput | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.admin.blocks.conflicts(
      input ?? { roomIds: [], startDate: '', endDate: '' },
    ),
    queryFn: async () => {
      if (!input) {
        throw new Error(ERROR_MESSAGES.FAILED_TO_CHECK_BLOCK_CONFLICTS);
      }
      const response = await adminService.checkBlockConflicts(input);
      return response.data;
    },
    enabled:
      enabled &&
      Boolean(
        input && input.roomIds.length > 0 && input.startDate && input.endDate,
      ),
  });
}

function invalidateBlockCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.calendar.all,
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.admin.blocks.all,
  });
}

export function useCreateBlocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBlockInput) => {
      const response = await adminService.createBlocks(input);
      return response.data;
    },
    onSuccess: () => invalidateBlockCaches(queryClient),
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateBlockInput;
    }) => {
      const response = await adminService.updateBlock(id, body);
      return response.data;
    },
    onSuccess: () => invalidateBlockCaches(queryClient),
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.deleteBlock(id);
      return response.data;
    },
    onSuccess: () => invalidateBlockCaches(queryClient),
  });
}
