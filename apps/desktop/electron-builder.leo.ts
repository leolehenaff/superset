/**
 * Electron Builder Configuration - Fork leo
 *
 * Unsigned build to share the fork. Installs side by side with the official
 * Superset. Compile with SUPERSET_WORKSPACE_NAME=leo so data and the deep link
 * scheme stay separate too.
 *
 * @see https://www.electron.build/configuration/configuration
 */

import { join } from "node:path";
import type { Configuration } from "electron-builder";
import baseConfig from "./electron-builder";
import pkg from "./package.json";

const productName = "Hive";

const config: Configuration = {
	...baseConfig,
	appId: "com.leolehenaff.hive",
	productName,
	publish: null,

	protocols: {
		name: productName,
		schemes: ["superset-leo"],
	},

	mac: {
		...baseConfig.mac,
		icon: join(pkg.resources, "build/icons/icon-dev.icns"),
		target: "dmg",
		identity: "-",
		hardenedRuntime: false,
		notarize: false,
		artifactName: `Hive-\${version}-\${arch}.\${ext}`,
		extendInfo: {
			...baseConfig.mac?.extendInfo,
			CFBundleName: productName,
			CFBundleDisplayName: productName,
		},
	},
};

export default config;
