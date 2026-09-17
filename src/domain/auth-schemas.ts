import { z } from "zod";

import { ROLES } from "@/domain/roles";

// Stored and compared lowercase, so "Ken@x.com" and "ken@x.com" are one account
const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254)
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const name = z.string().trim().min(1, "Name is required").max(80);

// Length is the only rule that reliably buys strength; character-class rules
// mostly push people towards "Password1!" and a sticky note
export const MIN_PASSWORD_LENGTH = 10;

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(200, "That password is too long");

// Login never applies the strength rules — an account created before they
// changed must still be able to sign in and then fix its password
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});

export const createUserSchema = z.object({
  name,
  email,
  password,
  role: z.enum(ROLES),
});

// Password lives on its own action, so a rename cannot quietly reset it
export const updateUserSchema = z.object({
  name,
  email,
  role: z.enum(ROLES),
});

export const setPasswordSchema = z.object({ password });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
