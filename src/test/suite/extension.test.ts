import * as vscode from 'vscode';
import { RegExpOutline } from '../../RegExpOutline';
import * as assert from 'assert';

const rulesExts_full = [
	{
		"ext": ".txt",
		"showTOF": true,
		"showEOF": true,
		"rules": [
			{
				"level": 1,
				"format": "^■(.+)$",
				"nameIdx": 1,
				"detail": "H1"
			},
			{
				"level": 2,
				"format": "^□(.+)$",
				"nameIdx": 1,
				"detail": "H2"
			},
			{
				"level": 3,
				"format": "^▼(.+)$",
				"nameIdx": 1,
				"detail": "H3"
			},
			{
				"level": 4,
				"format": "^▽(.+)$",
				"nameIdx": 1,
				"detail": "H4"
			}
		]
	}
];

const rulesExts_dflt = [
	{
		"ext": ".txt",
		"rules": [
			{
				"level": 1,
				"format": "^■(.+)$"
			},
			{
				"level": 2,
				"format": "^□(.+)$"
			},
			{
				"level": 3,
				"format": "^▼(.+)$"
			},
			{
				"level": 4,
				"format": "^▽(.+)$"
			}
		]
	}
];

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('対象外のファイル拡張子であればなにもしません', () => {
		const lines = [
			'',
		];
		const symbols = getSymbols(lines, 'test.dat', rulesExts_full);
		assert.strictEqual(symbols.length, 0);
	});

	test('見出しがなければファイルの先頭、終端のみDocumentSymbolを作成します', () => {
		const lines = [
			'',
		];
		const symbols = getSymbols(lines, 'test.txt', rulesExts_full);
		assert.strictEqual(symbols.length, 2);
		// TOF Symbol
		assert.strictEqual(symbols[0].name, 'TOF');
		assert.strictEqual(symbols[0].detail, 'top of file');
		assert.strictEqual(symbols[0].kind, vscode.SymbolKind.File);
		// EOF Symbol
		assert.strictEqual(symbols[symbols.length - 1].name, 'EOF');
		assert.strictEqual(symbols[symbols.length - 1].detail, 'end of file');
		assert.strictEqual(symbols[symbols.length - 1].kind, vscode.SymbolKind.File);
		// デフォルト値が適用されることの確認です
		const symbols_dflt = getSymbols(lines, 'test.txt', rulesExts_dflt);
		assert.strictEqual(symbols_dflt.length, 2);
		// TOF Symbol
		assert.strictEqual(symbols_dflt[0].name, 'TOF');
		assert.strictEqual(symbols_dflt[0].detail, 'top of file');
		assert.strictEqual(symbols_dflt[0].kind, vscode.SymbolKind.File);
		// EOF Symbol
		assert.strictEqual(symbols_dflt[symbols_dflt.length - 1].name, 'EOF');
		assert.strictEqual(symbols_dflt[symbols_dflt.length - 1].detail, 'end of file');
		assert.strictEqual(symbols_dflt[symbols_dflt.length - 1].kind, vscode.SymbolKind.File);
	});

	test('showTOF, showEOFが偽なら先頭、終端のDocumentSymbolを作成しません', () => {
		const lines = [
			'',
		];
		let rulesExts_copy = structuredClone(rulesExts_full);
		rulesExts_copy[0].showTOF = false;
		rulesExts_copy[0].showEOF = false;
		const symbols = getSymbols(lines, 'test.txt', rulesExts_copy);
		assert.strictEqual(symbols.length, 0);
	});

	test('同じレベルの見出しが続いた場合です', () => {
		const lines = [
			'■１',
			'■２',
			'■３'
		];
		const symbols = getSymbols(lines, 'test.txt', rulesExts_full);
		assert.strictEqual(symbols.length, 5);
		// H1 Symbol
		assert.strictEqual(symbols[1].name, '１');
		assert.strictEqual(symbols[1].detail, 'H1');
		assert.strictEqual(symbols[1].kind, vscode.SymbolKind.Package);
		// H1 Symbol
		assert.strictEqual(symbols[2].name, '２');
		// H1 Symbol
		assert.strictEqual(symbols[3].name, '３');
		// デフォルト値が適用されることの確認です
		const symbols_dflt = getSymbols(lines, 'test.txt', rulesExts_dflt);
		assert.strictEqual(symbols_dflt.length, 5);
		// H1 Symbol
		assert.strictEqual(symbols_dflt[1].name, '１');
		assert.strictEqual(symbols_dflt[1].detail, '');
		assert.strictEqual(symbols_dflt[1].kind, vscode.SymbolKind.Package);
		// H1 Symbol
		assert.strictEqual(symbols_dflt[2].name, '２');
		// H1 Symbol
		assert.strictEqual(symbols_dflt[3].name, '３');
	});

	test('低いレベルの見出しが続いた場合です', () => {
		const lines = [
			'■１',
			'□１－１',
			'▼１－１－１'
		];
		const symbols = getSymbols(lines, 'test.txt', rulesExts_full);
		assert.strictEqual(symbols.length, 3);
		// H1 Symbol
		assert.strictEqual(symbols[1].name, '１');
		// H2 Symbol
		const symbolH2 = symbols[1].children[0];
		assert.strictEqual(symbolH2.name, '１－１');
		assert.strictEqual(symbolH2.detail, 'H2');
		assert.strictEqual(symbolH2.kind, vscode.SymbolKind.Class);
		// H3 Symbol
		const symbolH3 = symbolH2.children[0];
		assert.strictEqual(symbolH3.name, '１－１－１');
		assert.strictEqual(symbolH3.detail, 'H3');
		assert.strictEqual(symbolH3.kind, vscode.SymbolKind.Method);
	});

	test('低いレベルの見出しから始まった場合です', () => {
		const lines = [
			'▼０－１',
			'□０－２',
			'■１'
		];
		const symbols = getSymbols(lines, 'test.txt', rulesExts_full);
		assert.strictEqual(symbols.length, 3);
		// H3 Symbol
		const symbolH3 = symbols[0].children[0];
		assert.strictEqual(symbolH3.name, '０－１');
		// H2 Symbol
		const symbolH2 = symbols[0].children[1];
		assert.strictEqual(symbolH2.name, '０－２');
		// H1 Symbol
		assert.strictEqual(symbols[1].name, '１');
	});

	test('低いレベルから高いレベル（レベル１）にスキップした場合です', () => {
		const lines = [
			'■１',
			'▼１－１',
			'■２'
		];
		const symbols = getSymbols(lines, 'test.txt', rulesExts_full);
		assert.strictEqual(symbols.length, 4);
		// H1 Symbol
		const symbolH11 = symbols[1];
		assert.strictEqual(symbolH11.name, '１');
		// H3 Symbol
		const symbolH3 = symbolH11.children[0];
		assert.strictEqual(symbolH3.name, '１－１');
		// H1 Symbol
		const symbolH12 = symbols[2];
		assert.strictEqual(symbolH12.name, '２');
	});

	test('低いレベルから高いレベル（レベル１以外）にスキップした場合です', () => {
		const lines = [
			'■１',
			'□１－１',
			'▼１－１－１',
			'▽１－１－１－１',
			'□１－２'
		];
		const symbols = getSymbols(lines, 'test.txt', rulesExts_full);
		assert.strictEqual(symbols.length, 3);
		// H1 Symbol
		const symbolH11 = symbols[1];
		assert.strictEqual(symbolH11.name, '１');
		// H4 Symbol
		const symbolH4 = symbols[1].children[0].children[0].children[0];
		assert.strictEqual(symbolH4.name, '１－１－１－１');
		assert.strictEqual(symbolH4.detail, 'H4');
		assert.strictEqual(symbolH4.kind, vscode.SymbolKind.Variable);
		// H2 Symbol
		const symbolH2 = symbols[1].children[1];
		assert.strictEqual(symbolH2.name, '１－２');
	});

	test('複合的な場合です', () => {
		const lines = [
			'■１',
			'■２',
			'□２－１',
			'▼２－１－１',
			'□２－２',
			'▽２－２－１',
			'▼２－２－２',
			'▽２－２－２－１',
			'□２－３',
			'□２－４',
			'■３'
		];
		const symbols = getSymbols(lines, 'test.txt', rulesExts_full);
		assert.strictEqual(symbols.length, 5);
		// H1 Symbol
		const symbolH11 = symbols[1];
		assert.strictEqual(symbolH11.name, '１');
		// H1 Symbol
		const symbolH12 = symbols[2];
		assert.strictEqual(symbolH12.name, '２');
		// H2 Symbol
		const symbolH21 = symbols[2].children[0];
		assert.strictEqual(symbolH21.name, '２－１');
		// H3 Symbol
		const symbolH31 = symbolH21.children[0];
		assert.strictEqual(symbolH31.name, '２－１－１');
		// H2 Symbol
		const symbolH22 = symbols[2].children[1];
		assert.strictEqual(symbolH22.name, '２－２');
		// H4 Symbol
		const symbolH41 = symbolH22.children[0];
		assert.strictEqual(symbolH41.name, '２－２－１');
		// H3 Symbol
		const symbolH32 = symbolH22.children[1];
		assert.strictEqual(symbolH32.name, '２－２－２');
		// H4 Symbol
		const symbolH42 = symbolH32.children[0];
		assert.strictEqual(symbolH42.name, '２－２－２－１');
		// H2 Symbol
		const symbolH23 = symbols[2].children[2];
		assert.strictEqual(symbolH23.name, '２－３');
		// H2 Symbol
		const symbolH24 = symbols[2].children[3];
		assert.strictEqual(symbolH24.name, '２－４');
		// H1 Symbol
		const symbolH13 = symbols[3];
		assert.strictEqual(symbolH13.name, '３');
	});
});

function getSymbols(lines:Array<string>, fname:string, rulesExts:object){
	const textLines = lines.map((text, idx) => {
		return getTextLine(idx, text);
	});
	const document = <vscode.TextDocument>{
		fileName: fname,
		lineCount: lines.length,
		lineAt: (position: vscode.Position) => { return textLines[position.line]; }
	};
	const rulesExtsStr = JSON.stringify(rulesExts);
	const regExpOutline = new RegExpOutline(document, rulesExtsStr);
	return regExpOutline.createSymbols();
}

function getTextLine(lnum: number, text: string) {
	const startPosition = new vscode.Position(lnum, 0);
	const endPosition = new vscode.Position(lnum, text.length);
	const line = <vscode.TextLine>{
		lineNumber: lnum,
		range: new vscode.Range(startPosition, endPosition),
		text: text
	};
	return line;
}
