/* Wire shapes + constants shared between server and client. Keep this file
 * free of server imports — the chat client bundles it. */

export const MAX_MESSAGE_CHARS = 2000;
export const HISTORY_LIMIT = 100;

/** The Barker's resident account, seeded in migration 0005. */
export const BARKER_USER_ID = "the-barker-resident-1";
export const BARKER_HANDLE = "the-barker";

/** A message shaped for the wire: what the client renders and the SSE stream carries. */
export type WireMessage = {
  id: string;
  roomId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    handle: string;
    name: string | null;
    image: string | null;
    role: string;
    /** Latest 'title' award, worn like a name tag. */
    title: string | null;
  } | null;
};

export type RoomSummary = {
  id: string;
  slug: string;
  name: string;
  topic: string | null;
  modOnly: boolean;
};
