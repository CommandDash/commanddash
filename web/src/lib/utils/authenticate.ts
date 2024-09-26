type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export async function apiRequest(url: string, options: RequestOptions = {}) {
  try {
    let accessToken = localStorage.getItem("accessToken");
    const headers: Record<string, string> = {
      ...options.headers,
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Check if access token has expired (401 Unauthorized)
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the request with the new access token
        accessToken = localStorage.getItem("accessToken");
        headers.Authorization = `Bearer ${accessToken}`;
        return await fetch(url, {
          ...options,
          headers,
        });
      }
    }

    return response;
  } catch (error) {
    throw new Error(`API request failed: ${error}`);
  }
}

export async function refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        console.error("No refresh token available");
        return false;
      }
  
      const response = await fetch("https://api.commanddash.dev/account/github/refresh", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });
  
      const data = await response.json();
  
      if (response.ok) {
        const newAccessToken = data.access_token;
        if (newAccessToken) {
          localStorage.setItem("accessToken", newAccessToken);
          return true;
        }
      } else {
        console.error("Failed to refresh token", data);
      }
  
      return false;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      return false;
    }
  }
