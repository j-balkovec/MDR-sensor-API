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
    const payload = JSON.parse(atob(base64Url.replace(/-/g, "+").replace(/_/g, "/")));

    setUser({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });
  };

  const initGoogleLogin = () => {
    if (!window.google || !window.google.accounts?.id) {
      console.warn("Google script not loaded yet — try again in a moment");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    // Opens the Google One-Tap or account chooser popup
    window.google.accounts.id.prompt();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("id_token");
  };

  return { token, user, initGoogleLogin, logout };
}
