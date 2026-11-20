export type UserRole = 'USER' | 'CREATOR' | 'ADMIN';
export type ThemeMode = 'AUTO' | 'DARK' | 'LIGHT';

export interface UserProfile {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  country?: string;
  website?: string;
}

export interface UserPreference {
  theme: ThemeMode;
  preferredLanguage: string;
  emailNotifications: boolean;
  autoPlayNext: boolean;
  defaultQuality: string;
  activeTheme?: 'DARK' | 'LIGHT';
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  dailyDownloadLimit: number;
  profile?: UserProfile;
  preference?: UserPreference;
  createdAt: string;
}

export interface VideoCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  _count?: { videos: number };
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
  resolution?: string;
  categoryId?: string;
  category?: VideoCategory;
  uploaderId: string;
  uploader: {
    id: string;
    username: string;
    profile?: { displayName: string; avatarUrl?: string; bio?: string };
  };
  viewCount: number;
  likeCount: number;
  isPublished: boolean;
  userProgress?: {
    progressSeconds: number;
    watchedPercent: number;
    isCompleted: boolean;
  };
  createdAt: string;
  _count?: { comments: number; downloads: number };
}

export interface CommentReply {
  id: string;
  commentId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    role: string;
    profile?: { displayName: string; avatarUrl?: string };
  };
  content: string;
  isEdited: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    role: string;
    profile?: { displayName: string; avatarUrl?: string };
  };
  content: string;
  isEdited: boolean;
  likeCount: number;
  dislikeCount: number;
  currentUserReaction?: 'LIKE' | 'DISLIKE' | null;
  replies?: CommentReply[];
  createdAt: string;
}

export interface VideoDownloadRecord {
  id: string;
  videoId: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl?: string;
    durationSeconds: number;
    fileSizeBytes: number;
  };
  fileSizeBytes: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INTERRUPTED';
  ipAddress?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  errorMessage?: string;
  downloadDate: string;
}

export interface Meeting {
  id: string;
  roomCode: string;
  title: string;
  description?: string;
  hostId: string;
  host: {
    username: string;
    profile?: { displayName: string; avatarUrl?: string };
  };
  status: 'ACTIVE' | 'ENDED';
  isLocked: boolean;
  screenShareAllowed: boolean;
  chatAllowed: boolean;
  maxParticipants: number;
  startedAt: string;
  endedAt?: string;
}

export interface ActiveSession {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface TrustedDevice {
  id: string;
  deviceFingerprint: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  deviceType?: string;
  lastUsedAt: string;
  createdAt: string;
}

export interface LoginHistoryRecord {
  id: string;
  attemptedEmail: string;
  ipAddress: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  deviceType?: string;
  city?: string;
  country?: string;
  isSuccess: boolean;
  failureReason?: string;
  timestamp: string;
}

