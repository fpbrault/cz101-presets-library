import { createContext, type ReactNode, useContext } from "react";
import type { ModMatrix } from "@/lib/synth/bindings/synth";

interface ModMatrixContextType {
	modMatrix: ModMatrix;
	setModMatrix: (matrix: ModMatrix) => void;
}

const ModMatrixContext = createContext<ModMatrixContextType | undefined>(
	undefined,
);

export const ModMatrixProvider = ({
	children,
	modMatrix,
	setModMatrix,
}: {
	children: ReactNode;
	modMatrix: ModMatrix;
	setModMatrix: (matrix: ModMatrix) => void;
}) => {
	return (
		<ModMatrixContext.Provider value={{ modMatrix, setModMatrix }}>
			{children}
		</ModMatrixContext.Provider>
	);
};

export const useModMatrix = () => {
	const context = useContext(ModMatrixContext);
	if (!context) {
		throw new Error("useModMatrix must be used within a ModMatrixProvider");
	}
	return context;
};

export const useOptionalModMatrix = () => useContext(ModMatrixContext);
