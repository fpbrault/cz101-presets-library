export type Preset = {
	id: string;
	name: string;
	createdDate: string;
	modifiedDate: string;
	slot?: number;
	filename: string;
	sysexData: Uint8Array;
	tags: string[];
	author?: string;
	description?: string;
	isFactoryPreset?: boolean;
	favorite?: boolean;
	rating?: 1 | 2 | 3 | 4 | 5;
};
