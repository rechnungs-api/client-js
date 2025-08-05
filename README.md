# RechnungsAPI Client for JavaScript / TypeScript

This is the official JavaScript and TypeScript client for [RechnungsAPI](https://www.rechnungs-api.de), a powerful API for generating German invoices, including e-invoices with ZUGFeRD and XRechnung. The API also supports automated double-entry bookkeeping.

This library is fully typed and provides convenient access to all API endpoints.

## Documentation

For more detailed information about the API, its features, and all available options, please refer to the official [RechnungsAPI Documentation](https://www.rechnungs-api.de/docs).

The complete API specification is also available as an [OpenAPI v3 file](https://www.rechnungs-api.de/api/v1/openapi.yaml).

## Installation

You can install the client library using npm or your favorite package manager:

```bash
npm install @rechnungs-api/client
```

## Authentication

To use the API, you need an API key. You can get one by signing up at [RechnungsAPI](https://www.rechnungs-api.de).

Initialize the client with your API key. It's recommended to store your key in an environment variable.

```ts
import { Client } from "@rechnungs-api/client";

export const client = new Client({
	// It is recommended to load the API key from environment variables
	apiKey: process.env.RECHNUNGS_API_KEY || "YOUR_API_KEY",
});
```

## Usage

### Creating an Invoice

Here is an example of how to create a compliant PDF invoice with an embedded ZUGFeRD/XRechnung XML file.

```ts
import * as fs from "node:fs/promises";
import type {
	DocumentCreateRequest,
	RecipientParty,
	SenderParty,
} from "@rechnungs-api/client";
import { client } from "./client"; // Your initialized client

// 1. Define the Sender (your company's details)
const sender: SenderParty = {
	name: "Muster GmbH",
	address: {
		line1: "Musterstraße 55a",
		postalCode: "12345",
		city: "Hamburg",
		country: "DE",
	},
	electronicAddress: {
		scheme: "EM",
		value: "info@example.com",
	},
	contact: {
		name: "Max Mustermann",
		email: "max.mustermann@example.com",
		phone: "+49123456789",
		website: "https://www.rechnungs-api.de",
	},
	vatId: "DE1234569",
	taxId: "12/345/67890",
	owner: "Max Mustermann",
	registration: {
		office: "Amtsgericht Hamburg",
		number: "HRB 12345678",
	},
};

// 2. Define the Recipient (your client's details)
const recipient: RecipientParty = {
	name: "Beispiel UG (haftungsbeschränkt)",
	address: {
		line1: "Musterweg 3c",
		postalCode: "54321",
		city: "Berlin",
		country: "DE",
	},
	electronicAddress: {
		scheme: "EM",
		value: "info@rechnungs-api.de",
	},
	contact: {
		name: "Erika Musterfrau",
		email: "erika.musterfrau@example.com",
		phone: "+49987654321",
	},
	vatId: "DE987654321",
};

// 3. Construct the invoice document
const documentRequest: DocumentCreateRequest = {
	type: "invoice",
	locale: "de-DE",
	number: "RE-1012",
	issueDate: "2025-02-28",
	dueDate: "2025-02-28",
	sender,
	recipient,

	preTableText:
		"Sehr geehrte Damen und Herren,\n\nDie folgende Leistung wird Ihnen in Rechnung gestellt:",
	postTableText:
		"Bitte überweisen Sie den Betrag binnen 30 Tagen auf das vereinbarte Bankkonto.",

	// Add line items
	lines: [
		{
			unitPrice: { value: "95.00", currency: "EUR" },
			item: {
				name: "Beratung und Konzeption",
				description: "Analyse und Erarbeitung eines Konzepts.",
				vat: { code: "S", rate: "19.00" },
			},
			quantity: { value: "3", unit: "HUR" }, // HUR = Hour
		},
		{
			unitPrice: { value: "500.00", currency: "EUR" },
			item: {
				name: "Erstellung des Logos",
				vat: { code: "S", rate: "19.00" },
			},
			quantity: { value: "1", unit: "H87" }, // H87 = Piece
		},
	],
	// Define payment details
	payment: {
		means: [{
			code: "30", // SEPA credit transfer
			bankAccount: {
				bankName: "Muster Bank",
				iban: "DE12345678901234567890",
				bic: "MUSTER123",
			},
		}],
		terms: "30 Tage Netto",
	},
	// Enable electronic invoicing (e.g., ZUGFeRD / XRechnung)
	eInvoice: {
		type: "zugferd",
		profile: "xrechnung",
	},
	// Customize the look of your invoice
	theme: {
		logo: `data:image/png;base64,${(await fs.readFile("./your_logo.png")).toString("base64")}`,
		fontFamily: "Open Sans",
	},
};

// 4. Create the document via the API
const document = await client.createDocument(documentRequest);
console.log("Successfully created document:", document);

// 5. Download the generated PDF file
const pdfBuffer = await client.readDocument(document.id, "pdf");
await fs.writeFile("invoice.pdf", Buffer.from(pdfBuffer));
console.log("Saved invoice.pdf successfully!");
```

### Working with Ledgers

The API provides a double-entry bookkeeping system to track financial transactions.

Here's a simplified example of how to create a ledger, add accounts, and record transactions.

```ts
import type { LedgerAccountCreateRequest } from "@rechnungs-api/client";
import { client } from "./client"; // Your initialized client

// 1. Create a new ledger for your accounting
const ledger = await client.createLedger({
	customData: { internalId: "project-alpha" },
});
console.log("Created ledger:", ledger);

// 2. Define your chart of accounts
const accounts: LedgerAccountCreateRequest[] = [
	{ number: "1800", type: "assets", name: "Bank" },
	{ number: "1200", type: "assets", name: "Forderungen aus LuL" },
	{ number: "4400", type: "revenue", name: "Erlöse 19% USt." },
	{ number: "3806", type: "liabilities", name: "USt. 19%" },
];

// 3. Create the accounts in the ledger
for (const account of accounts) {
	await client.createLedgerAccount(ledger.id, account);
}
console.log("Successfully created accounts.");

// 4. Record a transaction for a new invoice (Value: 1000 + 190 VAT)
await client.createLedgerTransaction(ledger.id, {
	accountingDate: "2025-08-02",
	description: "Invoice RE-100",
	positions: [
		{ debitAccountNumber: "1200", creditAccountNumber: "4400", value: "1000" },
		{ debitAccountNumber: "1200", creditAccountNumber: "3806", value: "190" },
	],
});
console.log("Transaction for invoice RE-100 recorded.");

// 5. Record a transaction for the payment of the invoice
await client.createLedgerTransaction(ledger.id, {
	accountingDate: "2025-08-20",
	description: "Payment for RE-100",
	positions: [
		{ debitAccountNumber: "1800", creditAccountNumber: "1200", value: "1190" },
	],
});
console.log("Payment transaction recorded.");

// 6. List account balances
const balances = await client.listLedgerBalances(ledger.id);
console.log("Current account balances:", balances);
```
