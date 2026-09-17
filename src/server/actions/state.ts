// Kept out of the "use server" module, which may only export async functions
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  // Set on success when the action wants the client to navigate. The client
  // navigates rather than the action calling redirect(), so the form can raise
  // a toast first — a server redirect unmounts it before any state lands
  redirectTo?: string;
};

export const initialActionState: ActionState = { status: "idle" };
