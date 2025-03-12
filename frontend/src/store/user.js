import { create } from 'zustand';

export const useUserStore = create((set) => ({
  // State
  users: [],
  currentUser: null,
  isLoading: false,
  error: null,
  
  // Actions
  setUsers: (users) => set({ users }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Create a new user
  createUsers: async (newUser) => {
    // Validate required fields
    if (!newUser.name || !newUser.birthday || !newUser.sexualOrientation || !newUser.email || !newUser.password || !newUser.pin || !newUser.age) {
      throw new Error('Missing required fields');
    }
    
    // Validate PIN format
    if (!/^\d{4}$/.test(newUser.pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    
    // Set loading state
    set({ isLoading: true, error: null });
    
    try {
      // Make API request
      const res = await fetch("/api/user", { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      // Parse response data
      const data = await res.json();
      
      // Check if request was successful
      if (!res.ok) {
        throw new Error(data.msg || 'Failed to create user');
      }
      
      // Update store state
      set((state) => ({
        users: [...state.users, data.data],
        currentUser: data.data,
        isLoading: false,
        error: null
      }));
      
      return { success: true, msg: "User Registration Successful" };
    } catch (error) {
      // Handle errors
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  // Login user
  // Update your loginUser function in useUserStore.js
loginUser: async (credentials) => {
  // Validate required fields
  if (!credentials.email || !credentials.password || !credentials.pin) {
    throw new Error('Email, password, and PIN are required');
  }
  
  // Set loading state
  set({ isLoading: true, error: null });
  
  try {
    // Make API request to complete login
    const res = await fetch("/api/user/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    // Parse response data
    const data = await res.json();
    
    // Check if request was successful
    if (!res.ok) {
      throw new Error(data.msg || 'Login failed');
    }
    
    // Update store state
    set({
      currentUser: data.user,
      isLoading: false,
      error: null
    });
    
    return { success: true, msg: "Login Successful" };
  } catch (error) {
    // Handle errors
    set({ isLoading: false, error: error.message });
    throw error;
  }
},
  
  // Logout user
  logoutUser: async () => {
    // Set loading state
    set({ isLoading: true });
    
    try {
      // Make API request (if needed)
      await fetch("/api/user", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Update store state
      set({
        currentUser: null,
        isLoading: false,
        error: null
      });
      
      return { success: true, msg: "Logout Successful" };
    } catch (error) {
      // Handle errors
      set({ isLoading: false, error: error.message });
      return { success: false, msg: error.message };
    }
  }
}));