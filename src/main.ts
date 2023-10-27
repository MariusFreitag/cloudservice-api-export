import { readFile, writeFile } from "fs/promises";
import AuthProvider from "./auth-provider";
import PeopleProvider from "./people-provider";

const CREDENTIALS_PATH = __dirname + "/../local/credentials.json";
const CONTACTS_OUTPUT_PATH = __dirname + "/../local/contacts.json";

async function main() {
  const credentials = await readFile(CREDENTIALS_PATH, "utf-8");
  const authProvider = new AuthProvider(
    JSON.parse(credentials),
    PeopleProvider.scopes,
  );
  const authClient = await authProvider.getClient();

  const peopleProvider = new PeopleProvider(authClient);
  const connections = await peopleProvider.getConnections();

  console.log(connections.length);
  await writeFile(CONTACTS_OUTPUT_PATH, JSON.stringify(connections, null, 2));
  console.log(`Data stored to ${CONTACTS_OUTPUT_PATH}`);
}
main();
