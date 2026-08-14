"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAccessToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setLoading(false);
    });
  }, []);

  return { token, loading };
}