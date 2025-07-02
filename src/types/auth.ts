// 认证相关类型定义

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenInfo {
  token: string;
  expiresAt: number; // 过期时间戳
  isExpired: boolean;
  willExpireSoon: boolean; // 即将过期（5分钟内）
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: TokenPair;
}

export interface TokenStatus {
  isAuthenticated: boolean;
  accessToken: TokenInfo | null;
  refreshToken: TokenInfo | null;
  lastRefresh: number | null;
  needsRefresh: boolean;
}

export interface TokenManagerEvents {
  'token-refreshed': { tokens: TokenPair };
  'token-expired': { reason: string };
  'token-will-expire': { token: TokenInfo };
  'authentication-lost': { reason: string };
  'refresh-failed': { error: string };
}

export type TokenEventCallback<T = any> = (data: T) => void;

export interface TokenManagerOptions {
  autoRefresh?: boolean;
  refreshThreshold?: number; // 提前多少毫秒刷新Token (默认5分钟)
  maxRetries?: number;
  storage?: Storage;
  apiBaseUrl?: string;
} 