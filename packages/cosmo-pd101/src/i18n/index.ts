import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import synthEn from "./locales/en/synth.json";

export function initI18n() {
	i18n.use(initReactI18next).init({
		resources: {
			en: { synth: synthEn },
		},
		lng: "en",
		fallbackLng: "en",
		ns: ["synth"],
		defaultNS: "synth",
		interpolation: {
			escapeValue: false,
		},
	});
}

export { i18n };
