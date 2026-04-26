export interface AudioDevice {
	id: string;
	name: string;
	channels: number;
	sample_rate: number;
}

export interface AudioSettings {
	audio_driver?: string;
	audio_device?: string;
	midi_input_device?: string;
	input_channels?: number;
	buffer_size?: number;
	sample_rate?: number;
}
