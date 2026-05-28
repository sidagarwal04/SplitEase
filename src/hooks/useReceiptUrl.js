import { useQuery } from '@tanstack/react-query';
import { supabase, RECEIPTS_BUCKET } from '../lib/supabase.js';

export function useReceiptUrl(path) {
  return useQuery({
    queryKey: ['receipt', path],
    enabled: !!path,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrl(path, 60 * 30);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 25 * 60_000,
  });
}
