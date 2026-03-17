// src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/authSlice";

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const token = useSelector((s) => s.auth.token);
  const roles = useSelector((s) => s.auth.roles);
  const isAdmin = roles.includes("Admin");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const onLogout = () => {
    localStorage.removeItem("token");
    dispatch(logout());
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/">
        SafeSend Stock
      </Link>

      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#nav"
        aria-controls="nav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon" />
      </button>

      <div id="nav" className="collapse navbar-collapse">
        {token && (
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className="nav-link" to="/dashboard">Dashboard</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/companies">Companies</NavLink>
            </li>
            {!isAdmin && (
              <li className="nav-item">
                <NavLink className="nav-link" to="/kyc">KYC</NavLink>
              </li>
            )}
            <li className="nav-item">
              <NavLink className="nav-link" to="/trade">Trade (Buy/Sell)</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/trades">Trades</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/portfolio">Portfolio</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/watchlist">Watchlist</NavLink>
            </li>
            {isAdmin && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/admin/kyc">Admin KYC</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/admin/users">Admin Users</NavLink>
                </li>
              </>
            )}
          </ul>
        )}

        <ul className="navbar-nav ms-auto align-items-center">
          {!token ? (
            <li className="nav-item">
              <NavLink className="nav-link" to="/login">Login / Register</NavLink>
            </li>
          ) : (
            <li className="nav-item position-relative" ref={dropdownRef}>

              {/* ── User Avatar Button ── */}
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                title="My Account"
                style={{
                  background: "linear-gradient(135deg, var(--accent, #7c6af7) 0%, var(--accent-light, #a78bfa) 100%)",
                  border: "2px solid rgba(255,255,255,0.25)",
                  borderRadius: "50%",
                  width: "42px",
                  height: "42px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(124,106,247,0.4)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,106,247,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 10px rgba(124,106,247,0.4)";
                }}
              >
                {/* ── Proper person icon with head + shoulders ── */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {/* Head circle */}
                  <circle cx="12" cy="8" r="4" />
                  {/* Shoulders / body arc */}
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </button>

              {/* ── Dropdown ── */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    minWidth: "200px",
                    zIndex: 1000,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                  }}
                >
                  {/* My Profile */}
                  <button
                    style={itemStyle}
                    onClick={() => { navigate("/profile"); setDropdownOpen(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, flexShrink: 0 }}>
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    My Profile
                  </button>

                  {/* My Documents */}
                  <button
                    style={itemStyle}
                    onClick={() => { navigate("/my-documents"); setDropdownOpen(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                    My Documents
                  </button>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "4px 0" }} />

                  {/* Logout */}
                  <button
                    style={{ ...itemStyle, color: "#ff6b6b" }}
                    onClick={onLogout}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,107,107,0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, flexShrink: 0 }}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

const itemStyle = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "11px 16px",
  background: "transparent",
  border: "none",
  color: "#e0e0e0",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background 0.15s",
};