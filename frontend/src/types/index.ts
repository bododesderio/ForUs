// ─── User ─────────────────────────────────────────────────────────────────────
export type UserRole = 'user' | 'consultant' | 'admin' | 'super_admin';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface User {
    id: number;
    email: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    role: UserRole;
    profile_image?: string;
    phone?: string;
    dob?: string;
    gender?: Gender;
    push_token?: string;
    push_notifications_enabled?: boolean;
    created_at?: string;
}

export interface Consultant extends User {
    profession?: string;
    experience?: number;
    education?: string;
    language?: string;
    available_from?: string;
    available_to?: string;
    available_days?: string[];
    rating?: string;
    is_approved?: boolean;
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export type AppointmentStatus =
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'no_show'
    | 'blocked'
    | 'in_session'
    | 'rejected';

export interface Appointment {
    id: number;
    user_id: number;
    consultant_id: number;
    title?: string;
    description?: string;
    appointment_datetime: string;
    duration_minutes: number;
    status: AppointmentStatus;
    cancellation_reason?: string;
    notes?: string;
    mood?: number;
    created_at: string;
    updated_at: string;
    // Joined fields
    consultant_name?: string;
    user_name?: string;
    profile_image?: string;
    rating?: number;
    review_text?: string;
}

// ─── Resources ────────────────────────────────────────────────────────────────
export type ResourceType = 'book' | 'article' | 'music' | 'audio' | 'podcast' | 'routine' | 'video' | 'image';

export interface Resource {
    id: number;
    consultant_id: number;
    title: string;
    description?: string;
    category?: string;
    type: ResourceType;
    file_url: string;
    preview_image_url?: string;
    author?: string;
    duration?: string;
    downloads: number;
    rating: string;
    created_at: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
    id: number;
    title: string;
    description?: string;
    event_date: string;
    location?: string;
    organizer?: string;
    status: EventStatus;
    created_at: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatRoom {
    id: string;
    name?: string;
    type: 'messaging' | 'livestream' | 'team';
    created_by: number;
    last_message?: string;
    last_message_at?: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    userId: number;
    text: string;
    attachments?: any[];
    parentId?: string;
    reactionCounts?: Record<string, number>;
    replyCount?: number;
    createdAt: string;
    // Joined
    username?: string;
    first_name?: string;
    last_name?: string;
    profile_image?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
    id: number;
    recipient_id: number;
    title?: string;
    body?: string;
    data?: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
export interface Review {
    id: number;
    rating: number;
    review_text?: string;
    created_at: string;
    user_name?: string;
    user_profile_image?: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T = void> {
    success: boolean;
    message?: string;
    data?: T;
}

export interface PaginatedResponse<T> {
    success: boolean;
    message?: string;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    };
}
