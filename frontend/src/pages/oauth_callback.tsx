import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

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

    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    navigate("/dashboard", { replace: true });
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
