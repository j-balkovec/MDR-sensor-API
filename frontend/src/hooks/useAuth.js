import { useState } from "react";
import { GOOGLE_CLIENT_ID } from "../api/config";

export default function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("id_token"));
  const [user, setUser] = useState(null);

  const handleCredentialResponse = (response) => {
    const idToken = response.credential;
    setToken(idToken);
    localStorage.setItem("id_token", idToken);

    const base64Url = idToken.split(".")[1];
    const payload = JSON.parse(
      atob(base64Url.replace(/-/g, "+").replace(/_/g, "/"))
    );

    setUser({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });
  };

  const initGoogleLogin = () => {
    if (!window.google?.accounts?.id) {
      console.warn("Google script not ready — retrying...");
      setTimeout(initGoogleLogin, 500);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("id_token");
  };

  // Frontend should not determine admin status securely.
  // Always rely on backend checks.
  const isAuthenticated = Boolean(token);

  return { token, user, isAuthenticated, initGoogleLogin, logout };
}
