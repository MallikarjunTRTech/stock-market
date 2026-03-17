import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginStart, loginSuccess, loginFailure, clearError } from "../store/authSlice";
import api from "../api/axiosInstance";
import "../styles/LoginRegisterPage.css";

export default function LoginRegisterPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(clearError());
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegisterSuccess(false);

    if (mode === "register" && password !== confirmPassword) {
      dispatch(loginFailure("Passwords do not match."));
      return;
    }

    dispatch(loginStart());

    try {
      if (mode === "register") {
          await api.post("/api/auth/register", { email, password });
          dispatch(loginFailure(null));
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setRegisterSuccess(true);
          return;
      }

      const { data } = await api.post("/api/auth/login", { email, password });

      if (!data?.token) {
        dispatch(loginFailure("Login succeeded but token was missing."));
        return;
      }

      dispatch(loginSuccess({ token: data.token }));
      navigate("/dashboard");
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data ||
        "Something went wrong. Please try again.";
      dispatch(
        loginFailure(typeof message === "string" ? message : "Login failed.")
      );
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setRegisterSuccess(false);
    dispatch(clearError());
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">

        {/* ── Left Panel ── */}
        <div className="auth-left">
          <div className="auth-left-logo">📈 SafeSend Stock</div>
          <p className="auth-left-tagline">
            Your smart platform for trading, tracking, and growing your portfolio.
          </p>
          <ul className="auth-left-features">
            <li>
              <span className="icon">💹</span>
              Real-time stock prices
            </li>
            <li>
              <span className="icon">📊</span>
              Portfolio analytics
            </li>
            <li>
              <span className="icon">⭐</span>
              Personalised watchlist
            </li>
            <li>
              <span className="icon">🔒</span>
              Secure KYC verification
            </li>
          </ul>
        </div>

        {/* ── Right Panel ── */}
        <div className="auth-right">

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>

          <div className="auth-heading">
            {mode === "login" ? "Welcome back 👋" : "Create account 🚀"}
          </div>
          <div className="auth-subheading">
            {mode === "login"
              ? "Enter your credentials to access your account"
              : "Fill in the details below to get started"}
          </div>

          {registerSuccess && (
            <div className="auth-alert-success">
              ✅ Account created! Please sign in.
            </div>
          )}

          {error && (
            <div className="auth-alert-danger">⚠️ {error}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "register" && (
              <div className="auth-field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In →"
                : "Create Account →"}
            </button>
          </form>

          <div className="auth-switch">
            {mode === "login" ? (
              <>
                Don't have an account?
                <button onClick={() => switchMode("register")}>
                  Register here
                </button>
              </>
            ) : (
              <>
                Already have an account?
                <button onClick={() => switchMode("login")}>
                  Sign in here
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}