"use client"
import { createAuthClient } from "better-auth/react"
import { useEffect, useState } from "react"

export const authClient = createAuthClient({
   baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL,
  fetchOptions: {
      onSuccess: (ctx) => {
          const authToken = ctx.response.headers.get("set-auth-token")
          if(authToken){
            localStorage.setItem("bearer_token", authToken);
          }
      }
  }
});

type SessionData = ReturnType<typeof authClient.useSession>

export function useSession(): SessionData {
   const [session, setSession] = useState<any>(null);
   const [isPending, setIsPending] = useState(true);
   const [error, setError] = useState<any>(null);

   const fetchSession = async () => {
      try {
         const token = typeof window !== 'undefined' ? localStorage.getItem("bearer_token") || "" : ""
         const res = await authClient.getSession({
            fetchOptions: {
               auth: token
                 ? { type: "Bearer", token }
                 : undefined,
            },
         });
         setSession(res.data);
         setError(null);
      } catch (err) {
         // Do not forcibly null the existing session on transient failures
         setError(err);
      } finally {
         setIsPending(false);
      }
   };

   const refetch = () => {
      setIsPending(true);
      setError(null);
      fetchSession();
   };

   useEffect(() => {
      fetchSession();
      // React to bearer token changes across tabs or after login
      const onStorage = (e: StorageEvent) => {
        if (e.key === "bearer_token") {
          refetch();
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', onStorage);
      }
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', onStorage);
        }
      };
   }, []);

   return { data: session, isPending, error, refetch };
}