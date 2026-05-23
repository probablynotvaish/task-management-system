import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

type MeResponse = {
  id: string;
  email: string;
  name: string;
};

type TokenExchangeResponse = {
  token: string;
};

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      navigate(`/?oauth_error=${error ?? "unknown"}`, { replace: true });
      return;
    }

    // Exchange the short-lived opaque code for the real JWT.
    // The JWT is received only in the response body — it never appears in any
    // URL, preventing leakage through gateway logs, Referer headers, and
    // browser history.
    api
      .post<TokenExchangeResponse>("/api/auth/token", { code })
      .then(({ data }) => {
        localStorage.setItem("token", data.token);
        return api.get<MeResponse>("/api/me").then(({ data: me }) => {
          localStorage.setItem(
            "user",
            JSON.stringify({ id: me.id, email: me.email, name: me.name }),
          );
        });
      })
      .then(() => {
        // Both token exchange and /api/me succeeded — go to dashboard.
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        // Code invalid, expired, network error, or /api/me failed
        // — send the user back to login with an error hint.
        navigate("/?oauth_error=exchange_failed", { replace: true });
      });
  }, [navigate, searchParams]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#cfd5e1",
        fontSize: "16px",
        color: "#555",
      }}
    >
      Signing you in…
    </div>
  );
}

export default OAuthCallback;
