const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
}

/**
 * Get fresh admin token (JWT-based, refreshes if expired)
 */
async function getAdminToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    // Verify token is not expired (basic check)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      // If token expires in less than 5 minutes, try to refresh
      if (payload.exp && payload.exp - now < 300) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data?.accessToken) {
                localStorage.setItem('accessToken', data.data.accessToken);
                if (data.data.refreshToken) {
                  localStorage.setItem('refreshToken', data.data.refreshToken);
                }
                return data.data.accessToken;
              }
            }
          } catch (error) {
            // Refresh failed, continue with existing token
            console.error('Token refresh failed:', error);
          }
        }
      }
      
      // Token is still valid
      return accessToken;
    } catch (error) {
      // Invalid token format
      console.error('Invalid token format:', error);
      return null;
    }
  }

  return null;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAdminToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please login.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired, try to refresh once
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            localStorage.setItem('accessToken', refreshData.data.accessToken);
            if (refreshData.data.refreshToken) {
              localStorage.setItem('refreshToken', refreshData.data.refreshToken);
            }
            
            // Retry original request with new token
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshData.data.accessToken}`,
                ...options.headers,
              },
            });
            
            if (!retryResponse.ok) {
              throw new Error(`API request failed: ${retryResponse.statusText}`);
            }
            
            return await retryResponse.json();
          }
        }
      } catch (error) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    }
    
    // No refresh token, redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    // Handle 404 gracefully - return null instead of throwing
    if (response.status === 404) {
      console.warn(`API endpoint not found: ${endpoint}`);
      return null as T;
    }
    
    // For other errors, try to get error message but don't break the UI
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    const errorMessage = errorData.error || `API request failed: ${response.statusText}`;
    console.error(`API Error (${response.status}):`, errorMessage);
    
    // Only throw for critical errors (5xx), return null for client errors (4xx except 401)
    if (response.status >= 500) {
      throw new Error(errorMessage);
    }
    
    // For 4xx errors (except 401), return null to allow UI to show empty state
    return null as T;
  }

  return await response.json();
}

/**
 * Make unauthenticated API request (for login, etc.)
 */
export async function publicApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  return await response.json();
}
