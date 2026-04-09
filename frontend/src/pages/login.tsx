import { Link } from "react-router-dom";
import "./login.css";

function Login() {
  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="icon-circle">&#10003;</div>

        <h2 className="title">Welcome Back</h2>
        <p className="subtitle">
          Sign in to your account to manage your tasks
        </p>

        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="Enter your password" />
        </div>

        <button className="login-btn">Sign In</button>

        <p className="signup-text">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;