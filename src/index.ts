import type {
	Cursor,
	Document,
	DocumentCreateRequest,
	Ledger,
	LedgerAccount,
	LedgerAccountCreateRequest,
	LedgerAccountListResponse,
	LedgerListResponse,
	LedgerTransaction,
	LedgerTransactionCreateRequest,
	LedgerTransactionListResponse,
	Limit,
	ListLedgerBalancesResponse,
} from "./generated";

export * from "./generated/types.gen";

export class ApiError {
	constructor(
		public status: number,
		public body: unknown,
	) {}

	static async fromResponse(response: Response) {
		return new ApiError(response.status, await response.json());
	}
}

function queryParamsToString(
	params: Record<string, string | number | null> | undefined,
) {
	if (!params) return "";
	return new URLSearchParams(
		Object.fromEntries(
			Object.entries(params).flatMap(([key, value]) => {
				if (value === null) return [];
				return [[key, value.toString()]];
			}),
		),
	).toString();
}

/**
 * RechnungsAPI API client.
 *
 * See [https://www.rechnungs-api.de/docs] for more information.
 */
export class Client {
	constructor({
		apiKey,
		baseUrl,
	}: {
		apiKey: string;
		baseUrl?: string;
	}) {
		this.apiKey = apiKey;
		this.baseUrl = baseUrl ?? "https://www.rechnungs-api.de/api/v1";
	}

	private apiKey: string;
	private baseUrl: string;

	private get headers() {
		return {
			Authorization: `ApiKey ${this.apiKey}`,
			"Content-Type": "application/json",
		};
	}

	/**
	 * Create a new document
	 *
	 * Generate a new invoice, credit note, purchase order or other document type.
	 *
	 * @param document Information about the document that is to be created. Consult the API documentation
	 * for more information.
	 */
	public async createDocument(document: DocumentCreateRequest) {
		const response = await fetch(`${this.baseUrl}/documents`, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(document),
		});
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as Document;
	}

	/**
	 * Retrieve a document
	 *
	 * Loads the document as a machine readable JSON object, or downloads the document file (PDF or XML).
	 *
	 * @param id The ID of the document to read.
	 * @param format Which format to read. For e-invoices of type XRechnung, this must be XML or JSON.
	 * For all others, it must be PDF or JSON.
	 */
	public async readDocument(id: string): Promise<ArrayBuffer>;
	public async readDocument(id: string, format: "json"): Promise<Document>;
	public async readDocument(id: string, format: "xml"): Promise<string>;
	public async readDocument(id: string, format: "pdf"): Promise<ArrayBuffer>;
	public async readDocument(
		id: string,
		format: "json" | "xml" | "pdf" = "json",
	) {
		const response = await fetch(
			`${this.baseUrl}/documents/${id}?format=${format}`,
			{ headers: this.headers },
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		if (format === "xml") return await response.text();
		if (format === "pdf") return await response.arrayBuffer();
		return (await response.json()) as Document;
	}

	/**
	 * Lists all ledgers.
	 */
	public async listLedgers(queryParams: {
		limit?: Limit;
		cursor?: Cursor | null;
	}) {
		const response = await fetch(
			`${this.baseUrl}/ledgers?${queryParamsToString(queryParams)}`,
			{
				headers: this.headers,
			},
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as LedgerListResponse;
	}

	/**
	 * Creates a new ledger. This can be used to implement automated double-entry bookkeeping into your application.
	 */
	public async createLedger() {
		const response = await fetch(`${this.baseUrl}/ledgers`, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({}),
		});
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as Ledger;
	}

	/**
	 * Deletes a given ledger together with all associated accounts and transactions. This cannot be undone.
	 *
	 * @param ledgerId ID of the ledger to delete.
	 */
	public async deleteLedger(ledgerId: string) {
		const response = await fetch(`${this.baseUrl}/ledgers/${ledgerId}`, {
			method: "DELETE",
			headers: this.headers,
		});
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as Ledger;
	}

	/**
	 * Lists all accounts associated with a given ledger.
	 */
	public async listLedgerAccounts(
		ledgerId: string,
		queryParams: {
			limit?: Limit;
			cursor?: Cursor | null;
		},
	) {
		const response = await fetch(
			`${this.baseUrl}/ledgers/${ledgerId}/accounts?${queryParamsToString(queryParams)}`,
			{ headers: this.headers },
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as LedgerAccountListResponse;
	}

	/**
	 * Creates a new account on a given ledger. Each transaction on the ledger has exactly one debit and one credit account. German companies may want to use a scheme such as DATEV's SKR04. Note: Once an account has been created it can no longer be deleted.
	 *
	 * @param ledgerId ID of the ledger to create a new account for.
	 * @param account Details about the new account to be created.
	 */
	public async createLedgerAccount(
		ledgerId: string,
		account: LedgerAccountCreateRequest,
	) {
		const response = await fetch(
			`${this.baseUrl}/ledgers/${ledgerId}/accounts`,
			{
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(account),
			},
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as LedgerAccount;
	}

	/**
	 * Lists transactions associated with a given ledger.
	 */
	public async listLedgerTransactions(
		ledgerId: string,
		queryParams: {
			limit?: Limit;
			cursor?: Cursor | null;
		},
	) {
		const response = await fetch(
			`${this.baseUrl}/ledgers/${ledgerId}/transactions?${queryParamsToString(queryParams)}`,
			{ headers: this.headers },
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as LedgerTransactionListResponse;
	}

	/**
	 * Creates a new transaction on a given ledger. Once a transaction has been created it can no longer be deleted.
	 */
	public async createLedgerTransaction(
		ledgerId: string,
		transaction: LedgerTransactionCreateRequest,
	) {
		const response = await fetch(
			`${this.baseUrl}/ledgers/${ledgerId}/transactions`,
			{
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(transaction),
			},
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as LedgerTransaction;
	}

	/**
	 * Archives a transaction by creating a new transaction that reverses the effect of the archived transaction. Observably, this is similar to deleting a transaction, but it complies with the [GoBD](https://de.wikipedia.org/wiki/Grunds%C3%A4tze_zur_ordnungsm%C3%A4%C3%9Figen_F%C3%BChrung_und_Aufbewahrung_von_B%C3%BCchern,_Aufzeichnungen_und_Unterlagen_in_elektronischer_Form_sowie_zum_Datenzugriff).
	 *
	 * @returns The newly created transaction that cancels out the existing transaction.
	 */
	public async archiveLedgerTransaction(
		ledgerId: string,
		transactionNumber: number,
	) {
		const response = await fetch(
			`${this.baseUrl}/ledgers/${ledgerId}/transactions/${transactionNumber}`,
			{
				method: "DELETE",
				headers: this.headers,
			},
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as LedgerTransaction;
	}

	/**
	 * Lists balances of the accounts on a given ledger when taking into account transactions of a given timeframe.
	 */
	public async listLedgerBalances(
		ledgerId: string,
		queryParams?: {
			startDate?: string;
			endDate?: string;
		},
	) {
		const response = await fetch(
			`${this.baseUrl}/ledgers/${ledgerId}/balances?${queryParamsToString(queryParams)}`,
			{ headers: this.headers },
		);
		if (!response.ok) throw await ApiError.fromResponse(response);
		return (await response.json()) as ListLedgerBalancesResponse;
	}
}
