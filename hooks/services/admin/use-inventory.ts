'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { adminService } from '@/app/api/services/admin.service';
import { queryKeys } from '@/hooks/services/query-keys';
import type { CheckoutQuoteResponse } from '@/types/checkout.types';
import type {
  AdminAmenity,
  AdminExtra,
  AdminRateRule,
  AdminRoomTypeDetail,
  AdminRoomTypeListItem,
  AmenityInput,
  ExtraInput,
  ImageUpdate,
  PriceCalendarDay,
  RateRuleInput,
  RateRuleOverlapResponse,
  RoomImpactCheckResponse,
  RoomTypeInput,
  RoomUnitInput,
} from '@/types/inventory.types';

export interface PricingQuoteInput {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  extraBed: boolean;
}

export function useRoomTypes(initialData?: AdminRoomTypeListItem[]) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.roomTypes(),
    queryFn: async (): Promise<AdminRoomTypeListItem[]> => {
      const response = await adminService.listRoomTypes();
      return response.data;
    },
    initialData,
  });
}

export function useRoomType(
  id: string | null | undefined,
  initialData?: AdminRoomTypeDetail | null,
) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.roomType(id ?? ''),
    queryFn: async (): Promise<AdminRoomTypeDetail> => {
      if (!id) throw new Error('A room type ID is required.');
      const response = await adminService.getRoomType(id);
      return response.data;
    },
    enabled: Boolean(id),
    initialData: initialData ?? undefined,
  });
}

export function useAmenities(initialData?: AdminAmenity[]) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.amenities(),
    queryFn: async (): Promise<AdminAmenity[]> => {
      const response = await adminService.listAmenities();
      return response.data;
    },
    initialData,
  });
}

export function useExtras(initialData?: AdminExtra[]) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.extras(),
    queryFn: async (): Promise<AdminExtra[]> => {
      const response = await adminService.listExtras();
      return response.data;
    },
    initialData,
  });
}

export function useRateRules(
  roomTypeId?: string,
  initialData?: AdminRateRule[],
) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.rateRules(roomTypeId),
    queryFn: async (): Promise<AdminRateRule[]> => {
      const response = await adminService.listRateRules(roomTypeId);
      return response.data;
    },
    initialData,
  });
}

export function usePriceCalendar(
  roomTypeId: string,
  startDate?: string,
  days = 90,
) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.priceCalendar(
      roomTypeId,
      startDate,
      days,
    ),
    queryFn: async (): Promise<PriceCalendarDay[]> => {
      const response = await adminService.getPriceCalendar(
        roomTypeId,
        startDate,
        days,
      );
      return response.data;
    },
    enabled: Boolean(roomTypeId),
  });
}

export function useRateRuleOverlap(
  input: RateRuleInput | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.rateRuleOverlap(input),
    queryFn: async (): Promise<RateRuleOverlapResponse> => {
      if (!input) throw new Error('A rate rule is required.');
      const response = await adminService.checkRateRuleOverlap(input);
      return response.data;
    },
    enabled: Boolean(enabled && input),
  });
}

export function useRoomImpact() {
  return useMutation({
    mutationFn: async (roomId: string): Promise<RoomImpactCheckResponse> => {
      const response = await adminService.checkRoomImpact(roomId);
      return response.data;
    },
  });
}

export function usePricingQuote(
  input: PricingQuoteInput | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.admin.inventory.pricingQuote(input),
    queryFn: async (): Promise<CheckoutQuoteResponse> => {
      if (!input) throw new Error('A pricing quote is required.');
      const response = await adminService.previewPricingQuote(input);
      return response.data;
    },
    enabled: Boolean(enabled && input),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RoomTypeInput) => {
      const response = await adminService.createRoomType(input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      }),
  });
}

export function useUpdateRoomType(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RoomTypeInput) => {
      const response = await adminService.updateRoomType(id, input);
      return response.data;
    },
    onSuccess: (roomType) => {
      queryClient.setQueryData(
        queryKeys.admin.inventory.roomType(id),
        roomType,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useDeleteRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.deleteRoomType(id);
      return response.data;
    },
    onSuccess: (_result, id) => {
      queryClient.removeQueries({
        queryKey: queryKeys.admin.inventory.roomType(id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useReorderRoomTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; sortOrder: number }>) => {
      const response = await adminService.reorderRoomTypes(items);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      }),
  });
}

export function useUploadRoomImage(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await adminService.uploadRoomImage(roomTypeId, formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomType(roomTypeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useUpdateImage(roomTypeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      imageId,
      input,
    }: {
      imageId: string;
      input: ImageUpdate;
    }) => {
      const response = await adminService.updateImage(imageId, input);
      return response.data;
    },
    onSuccess: () => {
      if (roomTypeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.inventory.roomType(roomTypeId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useDeleteImage(roomTypeId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      const response = await adminService.deleteImage(imageId);
      return response.data;
    },
    onSuccess: () => {
      if (roomTypeId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.inventory.roomType(roomTypeId),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useReorderRoomImages(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; sortOrder: number }>) => {
      const response = await adminService.reorderRoomImages(roomTypeId, items);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomType(roomTypeId),
      }),
  });
}

export function useUpdateRoomTypeAmenities(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amenityIds: string[]) => {
      const response = await adminService.updateRoomTypeAmenities(
        roomTypeId,
        amenityIds,
      );
      return response.data;
    },
    onSuccess: (_result, amenityIds) => {
      queryClient.setQueryData(
        queryKeys.admin.inventory.roomType(roomTypeId),
        (current: AdminRoomTypeDetail | undefined) =>
          current ? { ...current, amenityIds } : current,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.amenities(),
      });
    },
  });
}

export function useCreateRoom(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RoomUnitInput) => {
      const response = await adminService.createRoom({
        ...input,
        roomTypeId,
      });
      return response.data;
    },
    onSuccess: (room) => {
      queryClient.setQueryData(
        queryKeys.admin.inventory.roomType(roomTypeId),
        (current: AdminRoomTypeDetail | undefined) =>
          current ? { ...current, rooms: [...current.rooms, room] } : current,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useUpdateRoom(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roomId,
      input,
    }: {
      roomId: string;
      input: RoomUnitInput;
    }) => {
      const response = await adminService.updateRoom(roomId, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomType(roomTypeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useDeleteRoom(roomTypeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = await adminService.deleteRoom(roomId);
      return response.data;
    },
    onSuccess: (_result, roomId) => {
      queryClient.setQueryData(
        queryKeys.admin.inventory.roomType(roomTypeId),
        (current: AdminRoomTypeDetail | undefined) =>
          current
            ? {
                ...current,
                rooms: current.rooms.filter((room) => room.id !== roomId),
              }
            : current,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.roomTypes(),
      });
    },
  });
}

export function useCreateRateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RateRuleInput) => {
      const response = await adminService.createRateRule(input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.rateRules(),
      }),
  });
}

export function useUpdateRateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: RateRuleInput }) => {
      const response = await adminService.updateRateRule(id, input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.rateRules(),
      }),
  });
}

export function useDeleteRateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.deleteRateRule(id);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.rateRules(),
      }),
  });
}

export function useCreateAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AmenityInput) => {
      const response = await adminService.createAmenity(input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.amenities(),
      }),
  });
}

export function useUpdateAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: AmenityInput }) => {
      const response = await adminService.updateAmenity(id, input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.amenities(),
      }),
  });
}

export function useDeleteAmenity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.deleteAmenity(id);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.amenities(),
      }),
  });
}

export function useReorderAmenities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; sortOrder: number }>) => {
      const response = await adminService.reorderAmenities(items);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.amenities(),
      }),
  });
}

export function useCreateExtra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExtraInput) => {
      const response = await adminService.createExtra(input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.extras(),
      }),
  });
}

export function useUpdateExtra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ExtraInput }) => {
      const response = await adminService.updateExtra(id, input);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.extras(),
      }),
  });
}

export function useDeleteExtra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await adminService.deleteExtra(id);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.extras(),
      }),
  });
}

export function useReorderExtras() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; sortOrder: number }>) => {
      const response = await adminService.reorderExtras(items);
      return response.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.inventory.extras(),
      }),
  });
}
