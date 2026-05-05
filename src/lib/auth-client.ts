import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    plugins: [
        adminClient(),
    ],
    user: {
        additionalFields: {
            phoneNumber: {
                type: "string",
            },
            fullImage: {
                type: "string",
            },
        }
    }
});

export const {
    signIn,
    signUp,
    signOut,
    useSession,
    updateUser,
} = authClient;

/**
 * Manual implementation to ensure correctness and bypass potential type/version mismatches.
 * Better Auth v1 uses '/api/auth/request-password-reset' for triggering the email.
 */
export const forgetPassword = async ({ email, redirectTo }: { email: string; redirectTo?: string }) => {
    try {
        const res = await fetch("/api/auth/request-password-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, redirectTo }),
        });

        const data = await res.json();
        if (!res.ok) {
            return { error: data || { message: "Failed to send reset email" } };
        }
        return { data: { status: true }, error: null };
    } catch (err: any) {
        return { error: { message: err.message || "Network error" } };
    }
};

/**
 * Better Auth v1 uses '/api/auth/reset-password' for updating the password with a token.
 */
export const resetPassword = async ({ newPassword, token }: { newPassword: string; token?: string }) => {
    try {
        const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPassword, token }),
        });

        const data = await res.json();
        if (!res.ok) {
            return { error: data || { message: "Failed to reset password" } };
        }
        return { data: { status: true }, error: null };
    } catch (err: any) {
        return { error: { message: err.message || "Network error" } };
    }
};
