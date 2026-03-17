# SafeSend.Stock.Api — Backend (Current State)

This repository contains the backend API for a simple stock trading system with **JWT authentication** and **role-based authorization**.

As of **March 9, 2026**, the backend supports:
- User registration + login (JWT)
- Identity roles: **Admin** and **User**
- A seeded **Admin** account created automatically at startup (development convenience)
- A secured admin endpoint to promote an existing user to Admin
- Swagger configured to work with JWT (Authorize button)

---

## 1) Tech Stack / Packages (High level)

- ASP.NET Core Web API
- Entity Framework Core + SQL Server
- ASP.NET Core Identity (users + roles)
- JWT Bearer authentication
- Swagger with JWT support

---

## 2) Project Concepts (Business Rules)

### Roles
- **Admin**
  - Can perform admin-only operations (e.g., later: create companies/stocks, set stock prices).
  - Can promote users to Admin.
- **User**
  - Default role for normal users.
  - Later: allowed to buy/sell stocks (trade endpoints).

### Authorization Strategy
- JWT tokens are issued on login.
- Tokens include:
  - `NameIdentifier` (user id)
  - email + username
  - **role claims** (`ClaimTypes.Role`) so that `[Authorize(Roles="Admin")]` works.

---

## 3) How Authentication Works

### Register
`POST /auth/register`

- Creates an Identity user (email/username).
- Assigns the default role: **User**

### Login
`POST /auth/login`

- Verifies credentials using Identity.
- Returns a JWT (expires in ~2 hours).
- Token includes role claims.

---

## 4) Seeded Admin Account (Development)

On application startup, roles and a default admin account are created automatically.

### Seeded roles
- `Admin`
- `User`

### Seeded admin user
- **Email / Username:** `admin@safesend.local`
- **Password:** `Admin@12345`

> Important: This seeded password is for development/testing only. Do not keep a known default admin password for production.

Seeding happens from:
- `IdentitySeeder.SeedAsync(app.Services);` in `Program.cs`

---

## 5) Admin Promotion Endpoint (No UI Required)

A backend-only admin endpoint exists to promote users to Admin.

### Endpoint
`POST /api/admin/users/{email}/make-admin`

- Protected by `[Authorize(Roles="Admin")]`
- Only Admins can call it.
- It assigns the `Admin` role to the target user.

### Usage flow
1. Register a new user via `/auth/register` (they become `User` by default).
2. Login with seeded admin via `/auth/login`.
3. Use the returned JWT in Swagger **Authorize** (`Bearer <token>`).
4. Call the promote endpoint:
   - `POST /api/admin/users/testuser@example.com/make-admin`

> Note: If you promote a user to Admin, they must **log in again** to receive a new JWT containing the `Admin` role claim.

---

## 6) Running the Project

### Prerequisites
- .NET SDK installed
- SQL Server available
- Connection string configured in `appsettings.json`:
  - `ConnectionStrings:DefaultConnection`

### Run
From the project directory:
```powershell
dotnet run