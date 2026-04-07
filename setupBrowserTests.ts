/// <reference types="vite/client" />

import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import "./src/App.css";

beforeEach(() => {
	document.body.innerHTML = "";
});
