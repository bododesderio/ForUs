/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, jsonb, pgEnum, unique, index, time, real } from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('role', ['user', 'consultant', 'admin', 'super_admin']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'blocked', 'in_session', 'rejected']);
export const resourceTypeEnum = pgEnum('resource_type', ['book', 'article', 'music', 'audio', 'podcast', 'routine', 'video', 'image']);
export const eventStatusEnum = pgEnum('event_status', ['upcoming', 'ongoing', 'completed', 'cancelled']);
export const chatRoomTypeEnum = pgEnum('chat_room_type', ['messaging', 'livestream', 'team']);
export const chatMemberRoleEnum = pgEnum('chat_member_role', ['member', 'moderator', 'admin', 'owner']);
export const accessLevelEnum = pgEnum('access_level', ['basic', 'moderate', 'full']);

// ─── Core Users Table ─────────────────────────────────────────────────────────
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 100 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: roleEnum('role').default('user').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    tosAcceptedAt: timestamp('tos_accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});

// ─── Profiles (shared by all roles) ──────────────────────────────────────────
export const profiles = pgTable('profiles', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    firstName: varchar('first_name', { length: 50 }),
    lastName: varchar('last_name', { length: 50 }),
    username: varchar('username', { length: 100 }).unique(),
    phone: varchar('phone', { length: 20 }),
    dob: date('dob'),
    gender: genderEnum('gender'),
    profileImage: varchar('profile_image', { length: 500 }),
    pushToken: varchar('push_token', { length: 255 }),
    notificationsEnabled: boolean('notifications_enabled').default(true),
}, (t) => ({
    userIdIdx: index('profiles_user_id_idx').on(t.userId),
}));

// ─── Consultant Details (only for consultant role) ────────────────────────────
export const consultantDetails = pgTable('consultant_details', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    profession: varchar('profession', { length: 100 }),
    experience: integer('experience').default(0),
    education: varchar('education', { length: 255 }),
    language: varchar('language', { length: 100 }),
    availableFrom: time('available_from').default('09:00:00'),
    availableTo: time('available_to').default('17:00:00'),
    availableDays: jsonb('available_days').default(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    rating: real('rating').default(0),
    isApproved: boolean('is_approved').default(false).notNull(),
}, (t) => ({
    userIdIdx: index('consultant_details_user_id_idx').on(t.userId),
}));

// ─── Admin Details (only for admin role) ─────────────────────────────────────
export const adminDetails = pgTable('admin_details', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    department: varchar('department', { length: 100 }),
    accessLevel: accessLevelEnum('access_level').default('basic'),
    lastLogin: timestamp('last_login'),
});

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointments = pgTable('appointments', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    consultantId: integer('consultant_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).default('Consultation'),
    description: text('description'),
    appointmentDatetime: timestamp('appointment_datetime', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').default(60),
    status: appointmentStatusEnum('status').default('pending').notNull(),
    cancellationReason: text('cancellation_reason'),
    notes: text('notes'),
    mood: integer('mood'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
    userIdIdx: index('appointments_user_id_idx').on(t.userId),
    consultantIdIdx: index('appointments_consultant_id_idx').on(t.consultantId),
    datetimeIdx: index('appointments_datetime_idx').on(t.appointmentDatetime),
    statusIdx: index('appointments_status_idx').on(t.status),
}));

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = pgTable('reviews', {
    id: serial('id').primaryKey(),
    appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    consultantId: integer('consultant_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    rating: integer('rating').notNull(),
    reviewText: text('review_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    uniqueReview: unique().on(t.appointmentId, t.userId),
}));

// ─── Moods ────────────────────────────────────────────────────────────────────
export const moods = pgTable('moods', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    moodDate: date('mood_date').notNull(),
    mood: integer('mood').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
    uniqueUserDate: unique().on(t.userId, t.moodDate),
}));

// ─── Resources ────────────────────────────────────────────────────────────────
export const resources = pgTable('resources', {
    id: serial('id').primaryKey(),
    consultantId: integer('consultant_id').references(() => users.id).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    type: resourceTypeEnum('type').notNull(),
    fileUrl: varchar('file_url', { length: 500 }).notNull(),
    previewImageUrl: varchar('preview_image_url', { length: 500 }),
    author: varchar('author', { length: 255 }),
    duration: varchar('duration', { length: 50 }),
    downloads: integer('downloads').default(0),
    rating: real('rating').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});

// ─── Events ───────────────────────────────────────────────────────────────────
export const events = pgTable('events', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
    location: varchar('location', { length: 255 }),
    organizer: varchar('organizer', { length: 255 }),
    status: eventStatusEnum('status').default('upcoming'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
    id: serial('id').primaryKey(),
    recipientId: integer('recipient_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }),
    body: text('body'),
    data: jsonb('data'),
    isRead: boolean('is_read').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    recipientIdIdx: index('notifications_recipient_id_idx').on(t.recipientId),
}));

// ─── Refresh Tokens ───────────────────────────────────────────────────────────
export const refreshTokens = pgTable('refresh_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: varchar('token', { length: 512 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    tokenIdx: index('refresh_tokens_token_idx').on(t.token),
    userIdIdx: index('refresh_tokens_user_id_idx').on(t.userId),
}));

// ─── Activities ───────────────────────────────────────────────────────────────
export const activities = pgTable('activities', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Chat Rooms ───────────────────────────────────────────────────────────────
export const chatRooms = pgTable('chat_rooms', {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }),
    type: chatRoomTypeEnum('type').default('messaging'),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Chat Members ─────────────────────────────────────────────────────────────
export const chatMembers = pgTable('chat_members', {
    id: serial('id').primaryKey(),
    roomId: varchar('room_id', { length: 255 }).references(() => chatRooms.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    role: chatMemberRoleEnum('role').default('member'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
    uniqueRoomUser: unique().on(t.roomId, t.userId),
}));

// ─── Chat Messages ────────────────────────────────────────────────────────────
export const chatMessages = pgTable('chat_messages', {
    id: varchar('id', { length: 255 }).primaryKey(),
    roomId: varchar('room_id', { length: 255 }).references(() => chatRooms.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    text: text('text'),
    attachments: jsonb('attachments').default([]),
    mentionedUsers: jsonb('mentioned_users').default([]),
    parentId: varchar('parent_id', { length: 255 }),
    reactionCounts: jsonb('reaction_counts').default({}),
    replyCount: integer('reply_count').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
}, (t) => ({
    roomCreatedIdx: index('chat_messages_room_created_idx').on(t.roomId, t.createdAt),
    userCreatedIdx: index('chat_messages_user_created_idx').on(t.userId, t.createdAt),
}));

// ─── Message Reactions ────────────────────────────────────────────────────────
export const messageReactions = pgTable('message_reactions', {
    id: serial('id').primaryKey(),
    messageId: varchar('message_id', { length: 255 }).references(() => chatMessages.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    reactionType: varchar('reaction_type', { length: 50 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    uniqueReaction: unique().on(t.messageId, t.userId, t.reactionType),
}));

// ─── Community Posts ──────────────────────────────────────────────────────────
export const communityPosts = pgTable('community_posts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
});

// ─── Community Likes ──────────────────────────────────────────────────────────
export const communityLikes = pgTable('community_likes', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').references(() => communityPosts.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
    uniqueLike: unique().on(t.postId, t.userId),
}));

// ─── Community Comments ───────────────────────────────────────────────────────
export const communityComments = pgTable('community_comments', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').references(() => communityPosts.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Password Reset Tokens ────────────────────────────────────────────────────
export const passwordResetTokens = pgTable('password_reset_tokens', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
