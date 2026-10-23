import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import { BrowserWindow, dialog } from "electron";
import { quitAppCompletely } from "main/index";
import { getAppDisplayName } from "./app-display-name";

export async function confirmAndQuitCompletely(): Promise<void> {
	const displayName = getAppDisplayName();
	try {
		const parent =
			BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
		const options: Electron.MessageBoxOptions = {
			type: "warning",
			buttons: [
				i18n._(
					msg({
						message: "Quit Completely",
					}),
				),
				i18n._(msg({ message: "Cancel" })),
			],
			defaultId: 1,
			cancelId: 1,
			title: i18n._(
				msg({
					message: `Quit ${displayName} Completely`,
				}),
			),
			message: i18n._(
				msg({
					message: `Quit ${displayName} and stop all background services?`,
				}),
			),
			detail: i18n._(
				msg({
					message: `All open terminal sessions will be killed and any running host-services will be stopped. Use “Close ${displayName}” instead if you want services to keep running for the next launch.`,
				}),
			),
		};
		const { response } = parent
			? await dialog.showMessageBox(parent, options)
			: await dialog.showMessageBox(options);
		if (response === 0) {
			quitAppCompletely();
		}
	} catch (error) {
		console.error("[quit] Quit-completely confirmation failed:", error);
	}
}
