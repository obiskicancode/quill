import type { AxiosRequestConfig } from 'axios';

import type { AdminProfileInput } from '@/schemas/account.schema';
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  Verify2faInput,
} from '@/schemas/auth.schema';
import type {
  AmenityInput,
  ExtraInput,
  ImageUpdate,
  RateRuleInput,
  RoomTypeInput,
  RoomUnitInput,
} from '@/schemas/inventory.schema';
import type { AuditDetailResponse, AuditListItem } from '@/types/audit.types';
import type {
  AccountResponse,
  AuthResult,
  MfaSetupResponse,
  RecoveryCodesResponse,
  RevokeResponse,
  SessionsResponse,
} from '@/types/auth.types';
import type {
  BlockCheckInput,
  BlockCheckResponse,
  BlocksListQueryInput,
  CalendarDayResponse,
  CalendarResponse,
  CreateBlockInput,
  RoomBlocksListResponse,
  UpdateBlockInput,
} from '@/types/calendar.types';
import type { CheckoutQuoteResponse } from '@/types/checkout.types';
import type {
  CheckInOutResponse,
  DashboardOccupancyResponse,
  DashboardRevenueResponse,
  DashboardSummaryResponse,
  RevenueRange,
} from '@/types/dashboard.types';
import type {
  AdminAmenity,
  AdminExtra,
  AdminRateRule,
  AdminRoomImage,
  AdminRoomTypeDetail,
  AdminRoomTypeListItem,
  AdminRoomUnit,
  PriceCalendarDay,
  RateRuleOverlapResponse,
  RoomImpactCheckResponse,
} from '@/types/inventory.types';
import type {
  ManualRefundItem,
  ManualRefundPayoutInput,
  PaymentDetailResponse,
  PaymentListItem,
  PaymentsBreakdownResponse,
  PaymentSummaryResponse,
  WebhookEventItem,
} from '@/types/payments.types';
import type {
  ApproveDeclineInput,
  CancelInput,
  changeDatesInput,
  ChangeDatesQuoteInput,
  CreateReservationInput,
  EditDetailsInput,
  NoShowInput,
  ReassignRoomInput,
  RecordPaymentInput,
  RefundInput,
  ResendConfirmationInput,
  ReservationDetail,
  ReservationNeighbors,
  ReservationsListResponse,
  VerifyTransferInput,
} from '@/types/reservation.types';
import type {
  Staff,
  StaffDetailResponse,
  StaffInviteInput,
  StaffListItem,
  StaffUpdateInput,
} from '@/types/staff.types';

import BaseService from './base.service';

const noRefresh: AxiosRequestConfig = { skipRefresh: true };

class AdminService extends BaseService {
  constructor() {
    super('/admin');
    this.retryPolicy = {
      retries: 1,
      delay: 0,
      shouldRetry: () => false,
    };
  }

  login(body: LoginInput) {
    return this.httpPost<LoginInput, AuthResult>(
      '/auth/login',
      body,
      noRefresh,
    );
  }

  verify2fa(body: Verify2faInput) {
    return this.httpPost<Verify2faInput, AuthResult>(
      '/auth/verify-2fa',
      body,
      noRefresh,
    );
  }

  logout() {
    return this.httpPost<undefined, Record<string, never>>(
      '/auth/logout',
      undefined,
    );
  }

  forgotPassword(body: ForgotPasswordInput) {
    return this.httpPost<ForgotPasswordInput, { sent: boolean }>(
      '/auth/forgot-password',
      body,
      noRefresh,
    );
  }

  resetPassword(body: ResetPasswordInput) {
    return this.httpPost<ResetPasswordInput, { redirectTo: string }>(
      '/auth/reset-password',
      body,
      noRefresh,
    );
  }

  getAccount() {
    return this.httpGet<AccountResponse>('/account');
  }

  updateProfile(body: AdminProfileInput) {
    return this.httpPatch<AdminProfileInput, { staff: Staff }>(
      '/account',
      body,
    );
  }

  changePassword(body: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return this.httpPost<typeof body, { revokedSessions: number }>(
      '/account/password',
      body,
    );
  }

  setup2fa() {
    return this.httpPost<undefined, MfaSetupResponse>(
      '/account/2fa/setup',
      undefined,
    );
  }

  confirm2fa(body: { code: string }) {
    return this.httpPost<typeof body, RecoveryCodesResponse>(
      '/account/2fa/confirm',
      body,
    );
  }

  disable2fa(body: { password: string }) {
    return this.httpPost<typeof body, { enabled: boolean }>(
      '/account/2fa/disable',
      body,
    );
  }

  rotateRecoveryCodes(body: { password: string }) {
    return this.httpPost<typeof body, RecoveryCodesResponse>(
      '/account/2fa/recovery-codes',
      body,
    );
  }

  getSessions() {
    return this.httpGet<SessionsResponse>('/account/sessions');
  }

  revokeSession(id: string) {
    return this.httpDelete<RevokeResponse>('/account/sessions', {
      data: { id },
    });
  }

  revokeOtherSessions() {
    return this.httpDelete<RevokeResponse>('/account/sessions');
  }

  getDashboardSummary(date?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.httpGet<DashboardSummaryResponse>(`/dashboard/summary${query}`);
  }

  getDashboardOccupancy(from?: string, days = 14) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (days) params.set('days', String(days));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.httpGet<DashboardOccupancyResponse>(
      `/dashboard/occupancy${query}`,
    );
  }

  getDashboardRevenue(range: RevenueRange = '7d') {
    return this.httpGet<DashboardRevenueResponse>(
      `/dashboard/revenue?range=${range}`,
    );
  }

  checkInReservation(id: string) {
    return this.httpPost<undefined, CheckInOutResponse>(
      `/reservations/${encodeURIComponent(id)}/check-in`,
      undefined,
    );
  }

  checkOutReservation(id: string) {
    return this.httpPost<undefined, CheckInOutResponse>(
      `/reservations/${encodeURIComponent(id)}/check-out`,
      undefined,
    );
  }

  getReservationsList(queryString = '') {
    const query = queryString
      ? queryString.startsWith('?')
        ? queryString
        : `?${queryString}`
      : '';
    return this.httpGet<ReservationsListResponse>(`/reservations${query}`);
  }

  getReservationDetail(id: string) {
    return this.httpGet<ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}`,
    );
  }

  getReservationNeighbors(id: string, queryString = '') {
    const query = queryString
      ? queryString.startsWith('?')
        ? queryString
        : `?${queryString}`
      : '';
    return this.httpGet<ReservationNeighbors>(
      `/reservations/${encodeURIComponent(id)}/neighbors${query}`,
    );
  }

  auditProofView(reservationId: string, paymentId?: string) {
    return this.httpPost<{ paymentId?: string }, { logged: boolean }>(
      `/reservations/${encodeURIComponent(reservationId)}/audit-proof-view`,
      { paymentId },
    );
  }

  createReservation(body: CreateReservationInput) {
    return this.httpPost<CreateReservationInput, ReservationDetail>(
      '/reservations',
      body,
    );
  }

  getAvailableRooms(params: {
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    excludeReservationId?: string;
  }) {
    const q = new URLSearchParams({
      roomTypeId: params.roomTypeId,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      ...(params.excludeReservationId
        ? { excludeReservationId: params.excludeReservationId }
        : {}),
    }).toString();
    return this.httpGet<{
      rooms: { id: string; roomNumber: string; floor: number | null }[];
    }>(`/availability/rooms?${q}`);
  }

  quoteReservation(body: {
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    extraBed?: boolean;
    extras?: { id: string; quantity: number }[];
    discount?: { type: 'fixed' | 'percentage'; value: number };
  }) {
    return this.httpPost<typeof body, CheckoutQuoteResponse>(
      '/reservations/quote',
      body,
    );
  }

  updateDetails(id: string, body: EditDetailsInput) {
    return this.httpPatch<EditDetailsInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/details`,
      body,
    );
  }

  reassignRoom(id: string, body: ReassignRoomInput) {
    return this.httpPost<ReassignRoomInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/reassign-room`,
      body,
    );
  }

  recordPayment(id: string, body: RecordPaymentInput) {
    return this.httpPost<RecordPaymentInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/payments`,
      body,
    );
  }

  verifyTransfer(id: string, paymentId: string, body: VerifyTransferInput) {
    return this.httpPost<VerifyTransferInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}/verify`,
      body,
    );
  }

  rejectTransfer(id: string, paymentId: string, body: VerifyTransferInput) {
    return this.httpPost<VerifyTransferInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}/reject`,
      body,
    );
  }

  approveReservation(id: string, body: ApproveDeclineInput) {
    return this.httpPost<ApproveDeclineInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/approve`,
      body,
    );
  }

  declineReservation(id: string, body: ApproveDeclineInput) {
    return this.httpPost<ApproveDeclineInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/decline`,
      body,
    );
  }

  quoteChangeDates(id: string, body: ChangeDatesQuoteInput) {
    return this.httpPost<
      ChangeDatesQuoteInput,
      {
        quote: {
          breakdown: {
            totalMinor: number;
          };
        };
        currentRoomAvailable: boolean;
        candidateRooms: {
          id: string;
          roomNumber: string;
          floor: number | null;
        }[];
        comparison: {
          currentTotalMinor: number;
          newTotalMinor: number;
          diffMinor: number;
          guestOwesMinor: number;
          refundDueMinor: number;
          noDifference: boolean;
        };
      }
    >(`/reservations/${encodeURIComponent(id)}/change-dates/quote`, body);
  }

  changeDates(id: string, body: changeDatesInput) {
    return this.httpPost<changeDatesInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/change-dates`,
      body,
    );
  }

  previewCancellation(id: string) {
    return this.httpGet<{
      calculatedRefundMinor: number;
      retainedMinor: number;
      rule: string;
      maxRefundMinor: number;
    }>(`/reservations/${encodeURIComponent(id)}/cancellation-preview`);
  }

  cancelReservation(id: string, body: CancelInput) {
    return this.httpPost<CancelInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/cancel`,
      body,
    );
  }

  issueRefund(id: string, body: RefundInput) {
    return this.httpPost<RefundInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/refunds`,
      body,
    );
  }

  markNoShow(id: string, body: NoShowInput) {
    return this.httpPost<NoShowInput, ReservationDetail>(
      `/reservations/${encodeURIComponent(id)}/no-show`,
      body,
    );
  }

  resendConfirmation(id: string, body: ResendConfirmationInput) {
    return this.httpPost<ResendConfirmationInput, { success: boolean }>(
      `/reservations/${encodeURIComponent(id)}/resend`,
      body,
    );
  }

  // ==================== CALENDAR & ROOM BLOCKS ====================

  getCalendar(params: { from?: string; days?: number; roomTypeId?: string }) {
    const q = new URLSearchParams({
      ...(params.from ? { from: params.from } : {}),
      ...(params.days ? { days: String(params.days) } : {}),
      ...(params.roomTypeId ? { roomTypeId: params.roomTypeId } : {}),
    }).toString();
    return this.httpGet<CalendarResponse>(`/calendar?${q}`);
  }

  getCalendarDay(date: string) {
    return this.httpGet<CalendarDayResponse>(
      `/calendar/day?date=${encodeURIComponent(date)}`,
    );
  }

  checkBlockConflicts(body: BlockCheckInput) {
    return this.httpPost<BlockCheckInput, BlockCheckResponse>(
      '/blocks/check',
      body,
    );
  }

  createBlocks(body: CreateBlockInput) {
    return this.httpPost<CreateBlockInput, { count: number; message: string }>(
      '/blocks',
      body,
    );
  }

  updateBlock(id: string, body: UpdateBlockInput) {
    return this.httpPatch<UpdateBlockInput, unknown>(
      `/blocks/${encodeURIComponent(id)}`,
      body,
    );
  }

  deleteBlock(id: string) {
    return this.httpDelete<{ success: boolean; message: string }>(
      `/blocks/${encodeURIComponent(id)}`,
    );
  }

  listBlocks(params: BlocksListQueryInput) {
    const q = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      status: params.status,
      ...(params.roomTypeId ? { roomTypeId: params.roomTypeId } : {}),
      ...(params.roomId ? { roomId: params.roomId } : {}),
      ...(params.reason ? { reason: params.reason } : {}),
    }).toString();
    return this.httpGet<RoomBlocksListResponse>(`/blocks?${q}`);
  }

  // Room Types
  listRoomTypes() {
    return this.httpGet<AdminRoomTypeListItem[]>('/room-types');
  }

  getRoomType(id: string) {
    return this.httpGet<AdminRoomTypeDetail>(
      `/room-types/${encodeURIComponent(id)}`,
    );
  }

  createRoomType(body: RoomTypeInput) {
    return this.httpPost<RoomTypeInput, AdminRoomTypeListItem>(
      '/room-types',
      body,
    );
  }

  updateRoomType(id: string, body: RoomTypeInput) {
    return this.httpPatch<RoomTypeInput, AdminRoomTypeDetail>(
      `/room-types/${encodeURIComponent(id)}`,
      body,
    );
  }

  deleteRoomType(id: string) {
    return this.httpDelete<{ success: boolean; message: string }>(
      `/room-types/${encodeURIComponent(id)}`,
    );
  }

  reorderRoomTypes(items: Array<{ id: string; sortOrder: number }>) {
    return this.httpPost<
      { items: Array<{ id: string; sortOrder: number }> },
      { success: boolean; message: string }
    >('/room-types/reorder', { items });
  }

  uploadRoomImage(roomTypeId: string, formData: FormData) {
    return this.httpPost<FormData, AdminRoomImage>(
      `/room-types/${encodeURIComponent(roomTypeId)}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  }

  updateImage(imageId: string, body: ImageUpdate) {
    return this.httpPatch<ImageUpdate, { success: boolean; message: string }>(
      `/images/${encodeURIComponent(imageId)}`,
      body,
    );
  }

  deleteImage(imageId: string) {
    return this.httpDelete<{ success: boolean; message: string }>(
      `/images/${encodeURIComponent(imageId)}`,
    );
  }

  reorderRoomImages(
    roomTypeId: string,
    items: Array<{ id: string; sortOrder: number }>,
  ) {
    return this.httpPost<
      { items: Array<{ id: string; sortOrder: number }> },
      { success: boolean; message: string }
    >(`/room-types/${encodeURIComponent(roomTypeId)}/images/reorder`, {
      items,
    });
  }

  updateRoomTypeAmenities(roomTypeId: string, amenityIds: string[]) {
    return this.httpPut<
      { amenityIds: string[] },
      { success: boolean; message: string }
    >(`/room-types/${encodeURIComponent(roomTypeId)}/amenities`, {
      amenityIds,
    });
  }

  // Room Units
  createRoom(body: RoomUnitInput & { roomTypeId: string }) {
    return this.httpPost<RoomUnitInput & { roomTypeId: string }, AdminRoomUnit>(
      '/rooms',
      body,
    );
  }

  updateRoom(roomId: string, body: RoomUnitInput) {
    return this.httpPatch<RoomUnitInput, { success: boolean; message: string }>(
      `/rooms/${encodeURIComponent(roomId)}`,
      body,
    );
  }

  deleteRoom(roomId: string) {
    return this.httpDelete<{ success: boolean; message: string }>(
      `/rooms/${encodeURIComponent(roomId)}`,
    );
  }

  checkRoomImpact(roomId: string) {
    return this.httpGet<RoomImpactCheckResponse>(
      `/rooms/${encodeURIComponent(roomId)}/status-impact`,
    );
  }

  // Rate Rules
  listRateRules(roomTypeId?: string) {
    const q = roomTypeId ? `?roomTypeId=${encodeURIComponent(roomTypeId)}` : '';
    return this.httpGet<AdminRateRule[]>(`/rate-rules${q}`);
  }

  createRateRule(body: RateRuleInput) {
    return this.httpPost<RateRuleInput, AdminRateRule>('/rate-rules', body);
  }

  updateRateRule(id: string, body: RateRuleInput) {
    return this.httpPatch<RateRuleInput, { success: boolean; message: string }>(
      `/rate-rules/${encodeURIComponent(id)}`,
      body,
    );
  }

  deleteRateRule(id: string) {
    return this.httpDelete<{ success: boolean; message: string }>(
      `/rate-rules/${encodeURIComponent(id)}`,
    );
  }

  checkRateRuleOverlap(body: RateRuleInput) {
    return this.httpPost<RateRuleInput, RateRuleOverlapResponse>(
      '/rate-rules/preview',
      body,
    );
  }

  getPriceCalendar(roomTypeId: string, startDate?: string, days = 90) {
    const q = new URLSearchParams({
      roomTypeId,
      ...(startDate ? { startDate } : {}),
      days: String(days),
    }).toString();
    return this.httpGet<PriceCalendarDay[]>(`/pricing/calendar?${q}`);
  }

  previewPricingQuote(body: {
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    extraBed: boolean;
  }) {
    return this.httpPost<typeof body, CheckoutQuoteResponse>(
      '/pricing/quote',
      body,
    );
  }

  // Extras
  listExtras() {
    return this.httpGet<AdminExtra[]>('/extras');
  }

  createExtra(body: ExtraInput) {
    return this.httpPost<ExtraInput, AdminExtra>('/extras', body);
  }

  updateExtra(id: string, body: ExtraInput) {
    return this.httpPatch<ExtraInput, { success: boolean; message: string }>(
      `/extras/${encodeURIComponent(id)}`,
      body,
    );
  }

  deleteExtra(id: string) {
    return this.httpDelete<{ success: boolean; message: string }>(
      `/extras/${encodeURIComponent(id)}`,
    );
  }

  reorderExtras(items: Array<{ id: string; sortOrder: number }>) {
    return this.httpPost<
      { items: Array<{ id: string; sortOrder: number }> },
      { success: boolean; message: string }
    >('/extras/reorder', { items });
  }

  // Amenities
  listAmenities() {
    return this.httpGet<AdminAmenity[]>('/amenities');
  }

  createAmenity(body: AmenityInput) {
    return this.httpPost<AmenityInput, AdminAmenity>('/amenities', body);
  }

  updateAmenity(id: string, body: AmenityInput) {
    return this.httpPatch<AmenityInput, { success: boolean; message: string }>(
      `/amenities/${encodeURIComponent(id)}`,
      body,
    );
  }

  deleteAmenity(id: string) {
    return this.httpDelete<{ success: boolean; message: string }>(
      `/amenities/${encodeURIComponent(id)}`,
    );
  }

  reorderAmenities(items: Array<{ id: string; sortOrder: number }>) {
    return this.httpPost<
      { items: Array<{ id: string; sortOrder: number }> },
      { success: boolean; message: string }
    >('/amenities/reorder', { items });
  }

  // Payments & Reconciliation
  listPayments(params: Record<string, string | number | undefined> = {}) {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, String(val));
      }
    }
    return this.httpGet<{
      items: PaymentListItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/payments?${q.toString()}`);
  }

  getPaymentsSummary(from?: string, to?: string) {
    const q = new URLSearchParams({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }).toString();
    return this.httpGet<{
      summary: PaymentSummaryResponse;
      breakdown: PaymentsBreakdownResponse;
    }>(`/payments/summary?${q}`);
  }

  getPaymentDetail(id: string) {
    return this.httpGet<PaymentDetailResponse>(
      `/payments/${encodeURIComponent(id)}`,
    );
  }

  reconcilePaymentsBulk(body: { paymentIds: string[]; note?: string }) {
    return this.httpPost<typeof body, { reconciledCount: number }>(
      '/payments/reconcile',
      body,
    );
  }

  unreconcilePayment(id: string, reason: string) {
    return this.httpPost<
      { reason: string },
      { success: boolean; message: string }
    >(`/payments/unreconcile?id=${encodeURIComponent(id)}`, { reason });
  }

  listManualRefunds() {
    return this.httpGet<ManualRefundItem[]>('/payments/manual-refunds');
  }

  markManualRefundPaidOut(id: string, body: ManualRefundPayoutInput) {
    return this.httpPost<
      ManualRefundPayoutInput,
      { success: boolean; message: string }
    >(`/payments/${encodeURIComponent(id)}/mark-paid-out`, body);
  }

  recheckRefundStatus(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; providerStatus: string; message: string }
    >(`/payments/${encodeURIComponent(id)}/recheck`, {});
  }

  listWebhookEvents(params: Record<string, string | number | undefined> = {}) {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, String(val));
      }
    }
    return this.httpGet<{ items: WebhookEventItem[]; total: number }>(
      `/webhook-events?${q.toString()}`,
    );
  }

  reprocessWebhookEvent(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/webhook-events/${encodeURIComponent(id)}/reprocess`, {});
  }

  // Staff Accounts (Owner only)
  listStaff(params: Record<string, string | undefined> = {}) {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, String(val));
      }
    }
    return this.httpGet<StaffListItem[]>(`/staff?${q.toString()}`);
  }

  getStaffDetail(id: string) {
    return this.httpGet<StaffDetailResponse>(
      `/staff/${encodeURIComponent(id)}`,
    );
  }

  inviteStaff(body: StaffInviteInput) {
    return this.httpPost<
      StaffInviteInput,
      { success: boolean; message: string; staffId: string }
    >('/staff', body);
  }

  updateStaff(id: string, body: StaffUpdateInput) {
    return this.httpPatch<
      StaffUpdateInput,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}`, body);
  }

  resendStaffInvite(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}/resend-invite`, {});
  }

  deactivateStaff(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}/deactivate`, {});
  }

  reactivateStaff(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}/reactivate`, {});
  }

  unlockStaff(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}/unlock`, {});
  }

  revokeStaffSessions(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}/revoke-sessions`, {});
  }

  resetStaff2FA(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}/reset-2fa`, {});
  }

  sendStaffPasswordReset(id: string) {
    return this.httpPost<
      Record<string, never>,
      { success: boolean; message: string }
    >(`/staff/${encodeURIComponent(id)}/send-password-reset`, {});
  }

  stepUpVerify(body: { password?: string; totpCode?: string }) {
    return this.httpPost<typeof body, { success: boolean; verifiedAt: string }>(
      '/auth/step-up',
      body,
    );
  }

  // Audit Log
  listAuditLogs(params: Record<string, string | number | undefined> = {}) {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, String(val));
      }
    }
    return this.httpGet<{
      items: AuditListItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/audit?${q.toString()}`);
  }

  getAuditDetail(id: string) {
    return this.httpGet<AuditDetailResponse>(
      `/audit/${encodeURIComponent(id)}`,
    );
  }
}

export const adminService = new AdminService();
