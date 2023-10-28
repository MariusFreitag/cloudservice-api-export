import { readFile, writeFile } from "fs/promises";
import GoogleAuthProvider from "./google/google-auth-provider";
import CloudflareAuthProvider from "./cloudflare/cloudflare-auth-provider";
import PeopleProvider from "./google/google-contacts-provider";
import CloudflareZoneProvider from "./cloudflare/cloudflare-zones-provider";

const GOOGLE_CREDENTIALS_PATH = __dirname + "/../local/google-credentials.json";
const CLOUDFLARE_CREDENTIALS_PATH = __dirname + "/../local/cloudflare-credentials.json";
const CONTACTS_OUTPUT_PATH = __dirname + "/../local/contacts.json";
const CONTACTS_CSV_OUTPUT_PATH = __dirname + "/../local/contacts.csv";
const ZONES_OUTPUT_PATH = __dirname + "/../local/zones.json";

async function main() {
  const cloudflareCredentials = await readFile(CLOUDFLARE_CREDENTIALS_PATH, "utf-8");
  const cloudflareAuth = await new CloudflareAuthProvider(JSON.parse(cloudflareCredentials)).getClient();
  const zoneProvider = new CloudflareZoneProvider(cloudflareAuth);
  const zones = await zoneProvider.getZones();

  console.log(zones.length);
  await writeFile(ZONES_OUTPUT_PATH, JSON.stringify(zones, null, 2));
  console.log(`Written ${ZONES_OUTPUT_PATH}`);

  for (const zone of zones as any[]) {
    const outputPath = `${__dirname}/../local/${zone.zone.name}.txt`;
    await writeFile(outputPath, zone.dnsRecords.export);
    console.log(`Written ${outputPath}`);
  }

  const googleCredentials = await readFile(GOOGLE_CREDENTIALS_PATH, "utf-8");
  const googleAuth = await new GoogleAuthProvider(
    JSON.parse(googleCredentials),
    PeopleProvider.scopes,
  ).getClient();
  const peopleProvider = new PeopleProvider(googleAuth);
  const contacts = await peopleProvider.getContacts();

  console.log(contacts.length);
  await writeFile(CONTACTS_OUTPUT_PATH, JSON.stringify(contacts, null, 2));
  console.log(`Written ${CONTACTS_OUTPUT_PATH}`);

  const contactsCsv = await peopleProvider.generateContactsCsv(contacts);
  await writeFile(CONTACTS_CSV_OUTPUT_PATH, contactsCsv);
  console.log(`Written ${CONTACTS_CSV_OUTPUT_PATH}`);
}
main();
