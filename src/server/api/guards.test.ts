import { beforeEach, describe, expect, it, vi } from "vitest";

// Both mocks are needed before the import below: guards.ts pulls in server-only
// (which throws outside the react-server condition) and the DAL reaches the
// database. The logic under test is the mapping from viewer to status code
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/dal", () => ({ getCurrentUser: vi.fn() }));

import { canManageExercises } from "@/domain/roles";
import { getCurrentUser } from "@/server/auth/dal";
import { authorizeRequest } from "@/server/api/guards";
import type { User } from "@/domain/types";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

const admin: User = {
  id: "507f1f77bcf86cd799439011",
  email: "admin@example.com",
  name: "Admin",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const plain: User = { ...admin, id: "507f1f77bcf86cd799439012", role: "user" };

beforeEach(() => {
  mockedGetCurrentUser.mockReset();
});

describe("authorizeRequest", () => {
  it("passes a signed-in account through when no permission is required", async () => {
    mockedGetCurrentUser.mockResolvedValue(plain);

    const auth = await authorizeRequest();
    expect(auth.ok).toBe(true);
    expect(auth.ok && auth.user).toEqual(plain);
  });

  it("401s when there is no session", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const auth = await authorizeRequest();
    expect(auth.ok).toBe(false);
    expect(auth.ok === false && auth.response.status).toBe(401);
  });

  // 403 rather than 404: the caller is authenticated, the role is simply wrong
  it("403s an authenticated account whose role is not permitted", async () => {
    mockedGetCurrentUser.mockResolvedValue(plain);

    const auth = await authorizeRequest(canManageExercises);
    expect(auth.ok).toBe(false);
    expect(auth.ok === false && auth.response.status).toBe(403);
  });

  it("lets an admin through the same check", async () => {
    mockedGetCurrentUser.mockResolvedValue(admin);

    const auth = await authorizeRequest(canManageExercises);
    expect(auth.ok).toBe(true);
  });

  // A database outage must not read as "not signed in", which would bounce a
  // working client into a login loop
  it("503s when the account cannot be loaded", async () => {
    mockedGetCurrentUser.mockRejectedValue(new Error("connection refused"));

    const auth = await authorizeRequest();
    expect(auth.ok).toBe(false);
    expect(auth.ok === false && auth.response.status).toBe(503);
  });

  it("returns the shared failure envelope, not a bare string", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const auth = await authorizeRequest();
    const body = auth.ok === false ? await auth.response.json() : null;
    expect(body).toEqual({
      success: false,
      data: null,
      error: "Authentication required",
    });
  });
});
