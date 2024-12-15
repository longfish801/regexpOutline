import * as vscode from 'vscode';

/** 拡張子毎ルール */
interface RulesExt {
	ext: string;	// ファイルの拡張子
	showTOF: boolean;	// アウトラインにTOFを表示するか否か
	showEOF: boolean;	// アウトラインにEOFを表示するか否か
	bullets: Array<string>;	// 行頭記号のリスト
	rules: Array<HeaderRule>;	// 見出しルールのリスト
}

/** 見出しルール */
interface HeaderRule {
	level: number;	// レベル
	format: string;	// フォーマット（正規表現）
	nameIdx: number;	// 見出し文字列として表示したい箇所のグループのインデックス
	detail: string;	// アウトラインに詳細として表示する文字列
}

/**
 * 正規表現で指定された見出しのフォーマットからDocumentSymbolの配列を生成します。
 */
export class RegExpOutline {
	document: vscode.TextDocument;
	private rulesExts: Array<RulesExt>;
	private symbols: Array<vscode.DocumentSymbol>;
	private preLevel: number;
	private preParentSymbol: vscode.DocumentSymbol | null;

	/**
	 * コンストラクタ
	 * @param document TextDocument
	 * @param rulesExtsStr 文字列型の拡張子毎ルール
	 */
	constructor(document: vscode.TextDocument, rulesExtsStr?: string) {
		this.document = document;
		this.rulesExts = this.getRulesExts(rulesExtsStr);
		this.symbols = [];
		this.preLevel = 1;
		this.preParentSymbol = null;
	}

	/**
	 * 拡張子毎ルールのリストを参照します。
	 * @param rulesExtsStr 文字列型の拡張子毎ルール（省略時はワークスペースから参照）
	 * @returns 拡張子毎ルールのリスト
	 */
	private getRulesExts(rulesExtsStr?: string) {
		if (rulesExtsStr === undefined) {
			rulesExtsStr = vscode.workspace.getConfiguration('regexpOutline').get('headerRulesEachExt', '[]');
		}
		let rulesExts: Array<RulesExt> = [];
		try {
			rulesExts = JSON.parse(rulesExtsStr);
		} catch (exc: any) {
			console.error('[regexpOutline] Failed to parse rulesExts as JSON.', rulesExtsStr, exc);
		}
		// デフォルト値を設定します
		for (let rulesExtIdx = 0; rulesExtIdx < rulesExts.length; rulesExtIdx++) {
			let rulesExt: RulesExt = rulesExts[rulesExtIdx];
			if (!rulesExt.hasOwnProperty('showTOF')) {
				rulesExt.showTOF = true;
			}
			if (!rulesExt.hasOwnProperty('showEOF')) {
				rulesExt.showEOF = true;
			}
			if (rulesExt.hasOwnProperty('bullets')) {
				rulesExt.rules = [];
				for (let bulletIdx = 0; bulletIdx < rulesExt.bullets.length; bulletIdx++) {
					const rule = {
						"level": bulletIdx + 1,
						"format": "^" + rulesExt.bullets[bulletIdx] + "(.+)$",
						"nameIdx": 1,
						"detail": "",
					}
					rulesExt.rules.push(rule);
				}
			}
			for (let ruleIdx = 0; ruleIdx < rulesExt.rules.length; ruleIdx++) {
				let rule: HeaderRule = rulesExt.rules[ruleIdx];
				if (!rule.hasOwnProperty('nameIdx')) {
					rule.nameIdx = 1;
				}
				if (!rule.hasOwnProperty('detail')) {
					rule.detail = '';
				}
			}
		}
		return rulesExts;
	}

	/**
	 * DocumentSymbolのリストを作成します。
	 * @returns DocumentSymbolのリスト
	 */
	createSymbols() {
		this.symbols = [];
		this.preLevel = 1;
		this.preParentSymbol = null;
		for (let rulesExtIdx = 0; rulesExtIdx < this.rulesExts.length; rulesExtIdx++) {
			const rulesExt: RulesExt = this.rulesExts[rulesExtIdx];
			if (!this.document.fileName.endsWith(rulesExt.ext)) {
				continue;
			}
			if (rulesExt.showTOF) {
				this.createSymbolFile(0, 'TOF', 'top of file');
			}
			for (let lineIdx = 0; lineIdx < this.document.lineCount; lineIdx++) {
				const line: vscode.TextLine = this.document.lineAt(new vscode.Position(lineIdx, 0));
				const rules: Array<HeaderRule> = rulesExt.rules;
				for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
					if (this.createSymbol(line, rules[ruleIdx])) {
						break;
					}
				}
			}
			if (rulesExt.showEOF) {
				this.createSymbolFile(this.document.lineCount - 1, 'EOF', 'end of file');
			}
			break;
		}
		return this.symbols;
	}

	/**
	 * 走査行に見出しルールを適用できるならばDocumentSymbolを生成します。
	 * @param line 走査行
	 * @param rule 見出しルール
	 * @returns DocumentSymbolを作成したか否か
	 */
	private createSymbol(line: vscode.TextLine, rule: HeaderRule) {
		const headerRex = new RegExp(rule.format);
		const matches = headerRex.exec(line.text);
		if (!matches) {
			return false;
		}
		if (matches.length < rule.nameIdx + 1) {
			return false;
		}
		const name = matches[rule.nameIdx];
		const kind = this.getKind(rule.level);
		let symbol = new vscode.DocumentSymbol(name, rule.detail, kind, line.range, line.range);
		this.appendSymbol(symbol, rule.level);
		return true;
	}

	/**
	 * 見出しレベルに応じた位置にDocumentSymbolを追加します。
	 * 
	 * @remarks
	 * 方針としてドキュメントに誤記があったり作成中であっても、
	 * できるだけアウトラインを生成します。
	 * 具体的には、見出しレベルが連続していなくともアウトラインを生成します。
	 * たとえば、ある行が見出しレベル１、次の行が見出しレベル３だったとします。
	 * この場合でもエラーや無視にはせず、レベル１の下にレベル３の見出しを追加します。
	 * 
	 * @param symbol 追加したいDocumentSymbol
	 * @param level 見出しレベル
	 */
	private appendSymbol(symbol: vscode.DocumentSymbol, level: number) {
		if (level === this.preLevel) {
			// 前回と同じレベルの場合
			if (this.preParentSymbol === null) {
				// 前回が最上位なら、最上位に追加します
				this.symbols.push(symbol);
			} else {
				// 前回が最上位でなければ、前回と同じ親に追加します
				this.preParentSymbol.children.push(symbol);
			}
		} else if (level > this.preLevel) {
			// 前回よりレベルが大きい場合
			if (this.preParentSymbol === null) {
				// 前回が最上位なら、最上位の末尾を親とします
				this.preParentSymbol = this.symbols[this.symbols.length - 1];
			} else {
				// 前回が最上位でなければ、前回の親に所属する子の末尾を親とします
				this.preParentSymbol = this.preParentSymbol.children[this.preParentSymbol.children.length - 1];
			}
			this.preParentSymbol.children.push(symbol);
		} else {
			// 前回よりレベルが小さい場合
			if (level === 1) {
				// レベルが1ならば最上位に追加します
				this.symbols.push(symbol);
				this.preParentSymbol = null;
			} else {
				// レベルが1でなければレベルと同じ深さに追加します
				// ただし深さが足りない場合は現状でいちばん深い位置に追加します
				const appendSymbolWithLevel = (relLevel: number, symbol: vscode.DocumentSymbol, curSymbol: vscode.DocumentSymbol) => {
					if (relLevel === 0 || curSymbol.children.length === 0) {
						curSymbol.children.push(symbol);
						this.preParentSymbol = curSymbol;
					} else {
						appendSymbolWithLevel(relLevel - 1, symbol, curSymbol.children[curSymbol.children.length - 1]);
					}
				};
				appendSymbolWithLevel(level - 2, symbol, this.symbols[this.symbols.length - 1]);
			}
		}
		this.preLevel = level;
	}

	/**
	 * ファイル先頭/末尾のDocumentSymbolを追加します。
	 * @param lineIdx 行番号
	 * @param name DocumentSymbolのname
	 * @param detail DocumentSymbolのdetail
	 * @returns なし（早期リターンがあるのみ）
	 */
	private createSymbolFile(lineIdx: number, name: string, detail: string) {
		if (this.document.lineCount === 0) {
			return;
		}
		const line: vscode.TextLine = this.document.lineAt(new vscode.Position(lineIdx, 0));
		let symbol = new vscode.DocumentSymbol(name, detail, this.getKind(0), line.range, line.range);
		this.symbols.push(symbol);
	}

	/**
	 * 見出しレベルに応じたSymbolKindを返します。
	 * @param level 見出しレベル
	 * @returns SymbolKind
	 */
	private getKind(level: number) {
		let kind: vscode.SymbolKind = vscode.SymbolKind.Variable;
		switch (level) {
			case 0:
				kind = vscode.SymbolKind.File;
				break;
			case 1:
				kind = vscode.SymbolKind.Package;
				break;
			case 2:
				kind = vscode.SymbolKind.Class;
				break;
			case 3:
				kind = vscode.SymbolKind.Method;
				break;
		}
		return kind;
	}
}
