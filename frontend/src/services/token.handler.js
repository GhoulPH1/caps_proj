// tokenHandler.js
export class TokenHandler {
    static TOKEN_KEY = 'auth_token';
    
    static getToken() {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    
    static setToken(token) {
      if (token) {
        localStorage.setItem(this.TOKEN_KEY, token);
      }
    }
    
    static clearToken() {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    
    static getAuthHeader() {
      const token = this.getToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    
    static setupInterceptors(axios) {
      // Request interceptor
      axios.interceptors.request.use(
        (config) => {
          const token = this.getToken();
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );
      
      // Response interceptor
      axios.interceptors.response.use(
        (response) => {
          const newToken = response.headers['x-new-access-token'];
          if (newToken) {
            this.setToken(newToken);
          }
          return response;
        },
        async (error) => {
          const originalRequest = error.config;
          
          // If error is 401 and we haven't already tried to refresh
          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              // Try to refresh the token
              const response = await axios.post('/api/user/refresh-token', {}, {
                withCredentials: true
              });
              
              if (response.data?.token) {
                this.setToken(response.data.token);
                
                // Update the failed request with new token
                originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              // Token refresh failed, proceed with logout
              this.clearToken();
              // Optional: Redirect to login or show notification
              return Promise.reject(refreshError);
            }
          }
          
          return Promise.reject(error);
        }
      );
    }
  }