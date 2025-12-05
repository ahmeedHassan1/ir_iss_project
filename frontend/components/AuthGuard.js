"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "../lib/auth";

export default function AuthGuard({ children }) {
	const router = useRouter();
	const { isAuthenticated, loadAuth } = useAuthStore();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Load auth state first
		loadAuth();
		setIsLoading(false);
	}, [loadAuth]);

	useEffect(() => {
		// Only redirect after auth is loaded
		if (!isLoading && !isAuthenticated) {
			router.push("/auth/login");
		}
	}, [isAuthenticated, isLoading, router]);

	if (isLoading || !isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	return children;
}
