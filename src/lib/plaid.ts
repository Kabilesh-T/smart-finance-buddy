import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

const env = process.env.PLAID_ENV ?? "sandbox";

const config = new Configuration({
  basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
      "Plaid-Version": "2020-09-14",
    },
  },
});

export const plaid = new PlaidApi(config);

export const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES ?? "US,CA")
  .split(",")
  .map((c) => c.trim() as CountryCode);

export const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS ?? "transactions")
  .split(",")
  .map((p) => p.trim() as Products);
