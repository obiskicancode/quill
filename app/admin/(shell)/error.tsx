'use client';

import { useEffect } from 'react';

import { AdminError } from '@/components/admin/AdminStates';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button, ButtonLink } from '@/components/ui/button';

/**
 * A server page under the admin shell that cannot render - a booking that
 * vanished mid-load, a database call that timed out - used to fall through to
 * the guest-facing root boundary, which offered "Back to home" to a signed-in
 * operator. This keeps the failure inside the admin chrome.
 */
export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="This page could not be loaded"
        description="Nothing was saved or changed. Retry, or go back to the dashboard and open the record again."
      />
      <AdminError
        message={error.message || 'Unexpected server error'}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <ButtonLink href="/admin" variant="secondary">
              Back to dashboard
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
