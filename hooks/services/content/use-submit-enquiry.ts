'use client';

import { useMutation } from '@tanstack/react-query';

import {
  contentService,
  type EnquirySubmitInput,
} from '@/app/api/services/content.service';

export function useSubmitEnquiry() {
  return useMutation({
    mutationFn: async (input: EnquirySubmitInput) => {
      const response = await contentService.sendEnquiry(input);
      return response.data;
    },
  });
}
