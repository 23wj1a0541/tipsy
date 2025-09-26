import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { NextRequest } from 'next/server';
import { headers as nextHeaders } from "next/headers"
import { db } from "@/db";
 
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
	}),
	emailAndPassword: {    
		enabled: true
	},
	plugins: [bearer()]
});

// Session validation helper
export async function getCurrentUser(request?: NextRequest | { headers: Headers }) {
  const hdrs = request?.headers ?? (await nextHeaders());
  const session = await auth.api.getSession({ headers: hdrs });
  return session?.user || null;
}