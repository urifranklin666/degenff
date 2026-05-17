import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { syncDiscordMember } from "@/lib/discord-sync";

type Role = "visitor" | "contributor" | "mod" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      handle: string;
      discordId: string | null;
    } & DefaultSession["user"];
  }
}

const { users, accounts, sessions, verificationTokens } = schema;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  session: { strategy: "database" },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          // identify+email for sign-in; guilds.members.read to read role membership in our guild
          scope: "identify email guilds guilds.members.read",
        },
      },
      // Discord profile → users row defaults the adapter will write
      profile(profile) {
        const avatar = profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith("a_") ? "gif" : "png"}`
          : null;
        return {
          id: profile.id,                              // not the row id; replaced by adapter
          name: profile.global_name || profile.username,
          email: profile.email ?? null,
          image: avatar,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Hydrate session with our custom user fields
      const u = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });
      session.user = {
        ...session.user,
        id: user.id,
        role: (u?.role ?? "contributor") as Role,
        handle: u?.handle ?? "anon",
        discordId: u?.discordId ?? null,
      };
      return session;
    },
    // We don't gate by Discord guild membership here; the bot does role sync.
    async signIn() {
      return true;
    },
  },
  events: {
    // Fires after both users and accounts rows exist. Single source of truth
    // for populating discord_id, handle, name, image, role, discord_roles.
    async signIn({ user, account }) {
      const accessToken = account?.access_token;
      if (account?.provider !== "discord" || !user.id || !accessToken) return;
      try {
        await syncDiscordMember(user.id, accessToken);
      } catch (err) {
        console.error("[auth.signIn] discord sync failed:", err);
      }
    },
  },
});
