import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        // Una cuenta suspendida no entra, aunque la contraseña sea correcta
        const sub = await prisma.subscription.findUnique({
          where: { userEmail: user.email },
          select: { accountState: true },
        });
        if (sub?.accountState === "suspendida") return null;

        // Deja constancia de la última entrada, para el panel del equipo
        if (sub) {
          prisma.subscription
            .update({ where: { userEmail: user.email }, data: { lastSeenAt: new Date() } })
            .catch(() => {});
        }

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      if (request.nextUrl.pathname.startsWith("/dashboard")) {
        return !!auth?.user;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = (user as { role?: string }).role;
      }
      // Al actualizar el perfil, el nombre nuevo debe reflejarse sin volver a iniciar sesión
      if (trigger === "update" && session && typeof session === "object") {
        const updated = session as { name?: string };
        if (updated.name) token.name = updated.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
