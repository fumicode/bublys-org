"use client";

import { User } from "@bublys-org/tailor-genie-model";
import { ConversationFeature } from "@bublys-org/tailor-genie-libs";

const USERS: User[] = [
  new User({ id: "user-1", name: "Alice" }),
  new User({ id: "user-2", name: "Bob" }),
];

export default function Index() {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: 24,
        height: "100vh",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>Tailor Genie</h1>
      <div style={{ height: "calc(100% - 80px)" }}>
        <ConversationFeature users={USERS} />
      </div>
    </div>
  );
}
