import { describe, expect, it } from "vitest";

import { isLocalMongoUri } from "@/lib/env";

describe("isLocalMongoUri", () => {
  it("accepts the Docker Compose default", () => {
    expect(isLocalMongoUri("mongodb://localhost:27017")).toBe(true);
  });

  it("accepts loopback addresses and the compose service name", () => {
    expect(isLocalMongoUri("mongodb://127.0.0.1:27017/gym_tracker")).toBe(true);
    expect(isLocalMongoUri("mongodb://[::1]:27017")).toBe(true);
    expect(isLocalMongoUri("mongodb://mongo:27017")).toBe(true);
  });

  it("accepts a local host with no port", () => {
    expect(isLocalMongoUri("mongodb://localhost")).toBe(true);
  });

  it("accepts credentials in front of a local host", () => {
    expect(isLocalMongoUri("mongodb://user:pass@localhost:27017")).toBe(true);
  });

  it("rejects an Atlas SRV URI", () => {
    expect(
      isLocalMongoUri("mongodb+srv://user:pass@cluster0.abcde.mongodb.net/?retryWrites=true"),
    ).toBe(false);
  });

  // The hostname has to end at a port, path, or query — otherwise a remote host
  // that merely starts with "localhost" would pass as local
  it("rejects a remote host prefixed with a local name", () => {
    expect(isLocalMongoUri("mongodb://localhost.attacker.example:27017")).toBe(false);
    expect(isLocalMongoUri("mongodb://mongo.example.com:27017")).toBe(false);
  });

  it("rejects a local-looking name in the credentials of a remote host", () => {
    expect(isLocalMongoUri("mongodb://localhost:pass@db.example.com:27017")).toBe(false);
  });
});
