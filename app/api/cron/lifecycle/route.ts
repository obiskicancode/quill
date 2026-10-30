import { config } from '@/config';
import { runLifecycleJobs } from '@/lib/booking/lifecycle';
import { apiFail, apiOk } from '@/lib/http/envelope';
import { logStructured } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = config.CRON.SECRET;
  if (!secret)
    return apiFail(503, 'Lifecycle cron is not configured.', undefined, {
      noCache: true,
    });
  if (req.headers.get('authorization') !== `Bearer ${secret}`)
    return apiFail(401, 'Unauthorized.', undefined, { noCache: true });

  try {
    const result = await runLifecycleJobs();
    logStructured('lifecycle.job_completed', result);
    return apiOk(result, { noCache: true });
  } catch (error) {
    logStructured(
      'lifecycle.job_failed',
      { error: error instanceof Error ? error.message : String(error) },
      'error',
    );
    return apiFail(500, 'Lifecycle job failed.', undefined, { noCache: true });
  }
}
