export async function loadWrapper<T>(
  wrapped: () => Promise<T>,
  { onStart, onEnd, onError }: { onStart?: () => void; onEnd?: () => void; onError?: () => void },
) {
  if (onStart) onStart();
  try {
    return await wrapped();
  } catch (err) {
    if (onError) onError();
    throw err;
  } finally {
    if (onEnd) onEnd();
  }
}
