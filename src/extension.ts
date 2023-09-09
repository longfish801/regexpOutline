import * as vscode from 'vscode';
import { RegExpOutline } from './RegExpOutline';

/**
 * アウトラインを生成します。
 */
class OutlineProvider {
	async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {
		const regExpOutline = new RegExpOutline(document);
		let symbols: Array<vscode.DocumentSymbol> = [];
		try {
			symbols = regExpOutline.createSymbols();
		} catch (exc: any) {
			console.error('[regexpOutline] Failed to create outline.', exc);
		}
		return symbols;
	}
}

export function activate(context: vscode.ExtensionContext) {
	// 新規ファイルは拡張子が未定のため対象外にします
	const documentFilter: vscode.DocumentFilter = { scheme: 'file' };
	// アウトラインの生成処理を格納します
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(documentFilter, new OutlineProvider()));
}

export function deactivate() {
	return undefined;
}
