import { useState, useRef } from "react";
import { API_BASE, GOOGLE_CLIENT_ID } from "../api/config.js";

export default function useAuth() {
  const [token, setToken] = useState(() =>
    localStorage.getItem("access_token")
  );

  const [user, setUser] = useState(null);

  const [isAdmin, setIsAdmin] = useState(() => {
    const saved = localStorage.getItem("is_admin");
    return saved === "true";
  });

  const googleInitialized = useRef(false);

  const handleCredentialResponse = async (response) => {
    console.log("GOOGLE CALLBACK FIRED", response);

    window.google.accounts.id.cancel();

    const idToken = response.credential;

    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!res.ok) {
        throw new Error("Backend auth failed");
      }

      const data = await res.json();

      // Persist auth state
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("is_admin", data.is_admin ? "true" : "false");

      setToken(data.access_token);
      setUser(data.user);
      setIsAdmin(data.is_admin);

      console.log("AUTH COMPLETE", data);
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const initGoogleLogin = () => {
    console.log("initGoogleLogin was CALLED");

    if (!window.google?.accounts?.id) {
      setTimeout(initGoogleLogin, 500);
      return;
    }

    if (!googleInitialized.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        use_fedcm: false,
      });

      googleInitialized.current = true;
      console.log("Google initialized (FedCM disabled)");
    }

    window.google.accounts.id.prompt({ mode: "select_account" });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAdmin(false);

    localStorage.removeItem("access_token");
    localStorage.removeItem("is_admin");
  };

  const isAuthenticated = Boolean(token);

  return {
    token,
    user,
    isAdmin,
    isAuthenticated,
    initGoogleLogin,
    logout,
  };
}
