import { createAuthClient } from "@neondatabase/neon-js/auth";

export type OnlineAuthSession = {
	userId: string;
	displayName: string;
	provider: string;
};

type OAuthProvider = "google" | "apple";

interface NeonAuthClient {
	getSession(): Promise<unknown>;
	signIn: {
		social(opts: { provider: OAuthProvider; callbackURL: string }): Promise<{
			data?: { url?: string };
			url?: string;
			error?: { message?: string };
			message?: string;
		}>;
	};
	signOut(): Promise<void>;
}

let neonAuthClientPromise: Promise<NeonAuthClient> | null = null;

export function getNeonAuthDiagnostics(): {
	rawValuePresent: boolean;
	isAbsoluteUrl: boolean;
	normalizedUrl: string | null;
	error: string | null;
} {
	const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
	const raw = typeof authUrl === "string" ? authUrl.trim() : "";

	if (!raw) {
		return {
			rawValuePresent: false,
			isAbsoluteUrl: false,
			normalizedUrl: null,
			error:
				"Missing VITE_NEON_AUTH_URL. Set it in .env and restart Vite/Tauri dev.",
		};
	}

	const normalized = raw.replace(/\/$/, "");
	const isAbsolute = /^https?:\/\//.test(normalized);

	return {
		rawValuePresent: true,
		isAbsoluteUrl: isAbsolute,
		normalizedUrl: normalized,
		error: isAbsolute ? null : "VITE_NEON_AUTH_URL must be an absolute URL.",
	};
}

function getNeonAuthUrl(): string {
	const diagnostics = getNeonAuthDiagnostics();
	if (diagnostics.error || !diagnostics.normalizedUrl) {
		throw new Error(
			diagnostics.error ||
				"Invalid VITE_NEON_AUTH_URL configuration for Neon Auth client.",
		);
	}

	return diagnostics.normalizedUrl;
}

async function getNeonAuthClient(): Promise<NeonAuthClient> {
	if (!neonAuthClientPromise) {
		const authUrl = getNeonAuthUrl();
		neonAuthClientPromise = Promise.resolve(
			createAuthClient(authUrl),
		) as unknown as Promise<NeonAuthClient>;
	}

	// biome-ignore lint/style/noNonNullAssertion: assigned above
	return neonAuthClientPromise!;
}

type MaybeRecord = Record<string, unknown> | null | undefined;

function parseSessionPayload(payload: unknown): OnlineAuthSession | null {
	const p = payload as MaybeRecord;
	const data = (p?.data ?? payload) as
		| Record<string, unknown>
		| null
		| undefined;
	const session = (data?.session ?? data) as
		| Record<string, unknown>
		| null
		| undefined;
	const user = (data?.user ?? session?.user) as
		| Record<string, unknown>
		| null
		| undefined;
	const userId = String(user?.id ?? session?.userId ?? "");

	if (!userId) {
		return null;
	}

	const displayName = String(
		user?.name ?? user?.displayName ?? user?.email ?? userId,
	);
	const accounts = user?.accounts as Array<{ provider?: string }> | undefined;
	const provider = String(
		accounts?.[0]?.provider ?? session?.provider ?? "neon",
	);

	return {
		userId,
		displayName,
		provider,
	};
}

export async function getNeonOnlineSession(): Promise<OnlineAuthSession | null> {
	try {
		const neonAuthClient = await getNeonAuthClient();
		const payload = await neonAuthClient.getSession();
		return parseSessionPayload(payload);
	} catch {
		return null;
	}
}

export async function signInWithNeonProvider(
	provider: OAuthProvider,
	callbackURL: string,
): Promise<string> {
	const neonAuthClient = await getNeonAuthClient();
	const response = await neonAuthClient.signIn.social({
		provider,
		callbackURL,
	});

	const redirectUrl = response?.data?.url ?? response?.url;
	if (typeof redirectUrl === "string" && redirectUrl) {
		return redirectUrl;
	}

	const errorMessage =
		response?.error?.message ??
		response?.message ??
		"Neon social sign-in failed: missing redirect URL.";
	throw new Error(errorMessage);
}

export async function signOutNeonSession(): Promise<void> {
	const neonAuthClient = await getNeonAuthClient();
	await neonAuthClient.signOut();
}
