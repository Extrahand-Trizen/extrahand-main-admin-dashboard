import { publicApiRequest, apiRequest } from './client';
import { LoginResponse, AuthTokens, ApiResponse } from '@/types';

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string,
  dashboardType: string = 'main_admin'
): Promise<LoginResponse> {
  return publicApiRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, dashboardType }),
  });
}

/**
 * Verify access token
 */
export async function verifyToken(): Promise<ApiResponse<any>> {
  return apiRequest<ApiResponse<any>>('/api/v1/auth/verify');
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
  return publicApiRequest<ApiResponse<AuthTokens>>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Logout
 */
export async function logout(): Promise<ApiResponse<void>> {
  return apiRequest<ApiResponse<void>>('/api/v1/auth/logout', {
    method: 'POST',
  });
}
