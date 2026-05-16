import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

type MeResponse = {
  id: string;
  email: string;
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
    axios
      .post<TokenExchangeResponse>("/api/auth/token", { code })
      .then(({ data }) => {
        const token = data.token;
        localStorage.setItem("token", token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // Fetch the user profile so the dashboard can display the real email.
        // Even if this fails we still navigate — dashboard has its own fallback.
        return axios
          .get<MeResponse>("/api/me")
          .then(({ data: me }) => {
            localStorage.setItem(
              "user",
              JSON.stringify({ id: me.id, email: me.email })
            );
          })
          .catch(() => {
            // /api/me failed — localStorage.user simply won't be set.
            // The dashboard's own /api/me fetch will pick it up.
          });
      })
      .catch(() => {
        // Code invalid, expired, or already used — send the user back to login.
        navigate("/?oauth_error=exchange_failed", { replace: true });
        return;
      })
      .finally(() => {
        navigate("/dashboard", { replace: true });
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
