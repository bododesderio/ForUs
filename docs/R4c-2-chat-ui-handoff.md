<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# R4c-2 — Chat UI screens off Stream Chat (handoff spec)

**Status:** the only remaining Phase-R item. Blocked on an **Expo runtime** — this is UI
work that must be typechecked (`tsc`) and run on a simulator/device to verify; it can't be
done blind. The backend + realtime layer it depends on is complete and tested (R4a/R4b) and
the client transport is done (R4c-1, `src/context/ChatContext.js`).

## What's already in place (use these — do not rebuild)
`useChatContext()` (native WebSocket, `src/context/ChatContext.js`) exposes:

| Member | Shape / use |
|---|---|
| `isConnected` | bool — WS connected |
| `messages` | `{ [roomId]: Message[] }` (normalized camelCase, see below) |
| `typingUsers` | `{ [roomId]: userId[] }` (auto-clears after 3s) |
| `sendMessage(roomId, text, attachments?, parentId?)` | emits `send_message` |
| `sendTyping(roomId)` | emits `typing` |
| `joinRoom(roomId)` | emits `join_room` → server replies `room_history` (fills `messages[roomId]`) |
| `sendReadReceipt(roomId, messageId)` | emits `read_receipt` |
| `fetchRooms()` | `GET /api/chat/rooms` → `[{ id, name, type, updatedAt?, role, joinedAt, lastMessage, lastMessageAt }]` |
| `loadHistory(roomId, before?)` | `GET /api/chat/rooms/:id/messages` → fills `messages[roomId]`, returns them |

**Message shape** (normalized): `{ id, roomId, userId, text, attachments, parentId, createdAt, username, firstName, lastName, profileImage }`.

Auth/transport is handled: `ChatProvider.connect()` fetches a single-use ticket
(`GET /api/chat/token`) and opens `wss://<gateway>/ws?ticket=…`. Nothing else to wire for auth.

## Files to rewrite (all currently import `stream-chat-expo` / `stream-chat-react-native*`)
1. `src/app/(tabs)/chat.tsx`, `src/app/(users)/chat.tsx`, `src/app/(consultants)/chat.tsx`
   — **room list**. Replace the Stream channel list with `fetchRooms()` + a `FlatList`; each row
   navigates to the room screen. Show `lastMessage` / unread. Refresh on focus.
2. `src/app/(screens)/ChatRoomScreen.tsx` — **the room**. Replace `<Channel>/<MessageList>/<MessageInput>/<Thread>`:
   - on mount: `joinRoom(roomId)` (or `loadHistory(roomId)`); render `messages[roomId]` in an inverted `FlatList`
   - input: `sendMessage(roomId, text)`, `onChangeText` → throttled `sendTyping(roomId)`
   - typing indicator from `typingUsers[roomId]`; mark read via `sendReadReceipt`
   - delete/react/thread: not in the native protocol yet — either omit for v1 or add WS events
     (`delete_message`, `reaction`) to `services/fastapi-rt/app/chat/ws.py` first
3. `src/components/ChatComponent.tsx`, `src/components/CustomMessage.tsx` — reusable list + bubble;
   render from the normalized message shape (`item.text`, `item.userId`, `item.username`, `item.createdAt`).
4. `src/app/_layout.tsx` — remove the Stream `OverlayProvider` / `Chat` wrapper and the Stream client
   init; keep `<ChatProvider>` (native) mounted.

## Feature parity checklist (decide keep/defer per item)
- [ ] 1:1 + group room lists · [ ] send/receive · [ ] typing · [ ] read receipts · [ ] history + pagination (`before`)
- [ ] attachments (image) — needs `/api/upload` (R5, done) → pass returned URL as `attachments`
- [ ] reactions / threads / message delete — **not in the WS protocol yet**; add server events if kept
- [ ] local push on new message already handled in `ChatContext.handleEvent`

## Remove after the screens compile & run clean
`package.json`: `stream-chat`, `stream-chat-expo`, `stream-chat-react-native`, `stream-chat-react-native-core`.
Then `npm install` and confirm `tsc` + a device run. **Do not remove the deps before the screens are migrated** — the app won't build.

## Bundle here (optional)
SEC-9: move `accessToken`/`refreshToken` from `AsyncStorage` to `expo-secure-store`
(`src/services/api.js` token helpers). Media uploads are on Cloudflare R2
via `uploadService.ts` → `/api/upload`.

## Verification (definition of done)
`tsc` clean · app builds · two devices exchange messages + typing in real time · history loads ·
no `stream-chat*` in `package.json` or imports.
