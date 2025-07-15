import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = NextAuth(authOptions as any)

export { handler as GET, handler as POST }
