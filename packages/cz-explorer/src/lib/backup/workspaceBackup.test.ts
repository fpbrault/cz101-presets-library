import { describe, expect, it } from "vitest";
import { isWorkspaceBackupEnvelope } from "@/lib/backup/workspaceBackup";

describe("workspace backup envelope", () => {
	it("recognizes valid workspace backup shape", () => {
		const valid = {
			schema: "cz101-workspace-backup",
			version: 1,
			createdAt: new Date().toISOString(),
			sections: {
				presets: { format: "preset-database-json", data: [] },
			},
		};

		expect(isWorkspaceBackupEnvelope(valid)).toBe(true);
	});

	it("rejects invalid workspace backup shape", () => {
		const invalid = {
			schema: "not-cz101",
			version: "1",
			sections: null,
		};

		expect(isWorkspaceBackupEnvelope(invalid)).toBe(false);
	});
});
