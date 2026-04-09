import { createContext, type ReactNode, useContext } from "react";
import type { PresetDatabase } from "@/lib/db/PresetDatabase";

const PresetDatabaseContext = createContext<PresetDatabase | undefined>(
	undefined,
);

interface PresetDatabaseProviderProps {
	children: ReactNode;
	database: PresetDatabase;
}

export function PresetDatabaseProvider({
	children,
	database,
}: PresetDatabaseProviderProps) {
	return (
		<PresetDatabaseContext.Provider value={database}>
			{children}
		</PresetDatabaseContext.Provider>
	);
}

export function usePresetDatabase(): PresetDatabase {
	const context = useContext(PresetDatabaseContext);
	if (!context) {
		throw new Error(
			"usePresetDatabase must be used within a PresetDatabaseProvider",
		);
	}
	return context;
}
