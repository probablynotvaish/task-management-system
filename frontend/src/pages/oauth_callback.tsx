import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

type MeResponse = {
  id: string;
  email: string;
};

function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error || !token) {
      navigate(`/?oauth_error=${error ?? "unknown"}`, { replace: true });
      return;
    }

    // Store the token and set default auth header immediately.
    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Fetch the user profile so the dashboard can display the real email.
    // Even if this fails we still navigate — dashboard has its own fallback.
    axios
      .get<MeResponse>("/api/me")
      .then(({ data }) => {
        localStorage.setItem("user", JSON.stringify({ id: data.id, email: data.email }));
      })
      .catch(() => {
        // /api/me failed — localStorage.user simply won't be set.
        // The dashboard's own /api/me fetch will pick it up.
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
