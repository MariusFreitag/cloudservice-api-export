import { readFile, writeFile } from "fs/promises";
import GoogleAuthProvider from "./google/google-auth-provider";
import PeopleProvider from "./google/google-contacts-provider";

const CREDENTIALS_PATH = __dirname + "/../local/credentials.json";
const CONTACTS_OUTPUT_PATH = __dirname + "/../local/contacts.json";

async function main() {
  const googleCredentials = await readFile(CREDENTIALS_PATH, "utf-8");
  const googleAuth = await new GoogleAuthProvider(
    JSON.parse(googleCredentials),
    PeopleProvider.scopes,
  ).getClient();
  const peopleProvider = new PeopleProvider(googleAuth);
  const contacts = await peopleProvider.getContacts();

  console.log(contacts.length);
  await writeFile(CONTACTS_OUTPUT_PATH, JSON.stringify(contacts, null, 2));
  console.log(`Data stored to ${CONTACTS_OUTPUT_PATH}`);
}
main();
