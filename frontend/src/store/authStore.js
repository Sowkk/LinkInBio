import { create } from "zustand";
import { persist } from "zustand/middleware";

// Zustand store — global state for auth
// WHY persist? Wraps the store with localStorage so token survives page refresh
// Without persist, every refresh logs the user out
const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: "auth" }  // localStorage key name
  )
);

export default useAuthStore;