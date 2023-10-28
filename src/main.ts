import { readFile, writeFile } from "fs/promises";
import CloudflareAuthProvider from "./cloudflare/cloudflare-auth-provider";
import CloudflareZoneProvider from "./cloudflare/cloudflare-zones-provider";
import GoogleAuthProvider from "./google/google-auth-provider";
import GoogleCalendarProvider from "./google/google-calendar-provider";
import GoogleContactsTransformer from "./google/google-contacts-transformer";
import GoogleContactsProvider from "./google/google-contacts-provider";

const CREDENTIALS_FOLDER = __dirname + "/../private";
const OUTPUT_FOLDER = __dirname + "/../private/output";
const GOOGLE_CREDENTIALS_PATH = CREDENTIALS_FOLDER + "/google-credentials.json";
const CLOUDFLARE_CREDENTIALS_PATH = CREDENTIALS_FOLDER + "/cloudflare-credentials.json";
const CONTACTS_OUTPUT_PATH = OUTPUT_FOLDER + "/contacts.json";
const CONTACTS_CSV_OUTPUT_PATH = OUTPUT_FOLDER + "/contacts.csv";
const CONTACTS_JSON_OUTPUT_PATH = OUTPUT_FOLDER + "/calendars.json";
const ZONES_OUTPUT_PATH = OUTPUT_FOLDER + "/zones.json";

async function main() {
  const cloudflareCredentials = await readFile(CLOUDFLARE_CREDENTIALS_PATH, "utf-8");
  const cloudflareAuth = await new CloudflareAuthProvider(JSON.parse(cloudflareCredentials)).getClient();
  const zoneProvider = new CloudflareZoneProvider(cloudflareAuth);
  const zones = await zoneProvider.getZones();

  console.log(zones.length);
  await writeFile(ZONES_OUTPUT_PATH, JSON.stringify(zones, null, 2));
  console.log(`Written ${ZONES_OUTPUT_PATH}`);

  for (const zone of zones as any[]) {
    const outputPath = `${OUTPUT_FOLDER}/${zone.zone.name}.txt`;
    await writeFile(outputPath, zone.dnsRecords.export);
    console.log(`Written ${outputPath}`);
  }

  const googleCredentials = await readFile(GOOGLE_CREDENTIALS_PATH, "utf-8");
  const googleAuth = await new GoogleAuthProvider(JSON.parse(googleCredentials), [
    ...GoogleContactsProvider.scopes,
    ...GoogleCalendarProvider.scopes,
  ]).getClient();

  const peopleProvider = new GoogleContactsProvider(googleAuth);
  const contactGroups = await peopleProvider.getContactGroups();
  const contacts = await peopleProvider.getContacts();

  console.log(contacts.length);
  await writeFile(CONTACTS_OUTPUT_PATH, JSON.stringify({ contactGroups, contacts }, null, 2));
  console.log(`Written ${CONTACTS_OUTPUT_PATH}`);

  const calendarTransformer = new GoogleContactsTransformer();
  const contactsCsv = await calendarTransformer.generateContactsCsv(contactGroups, contacts);
  await writeFile(CONTACTS_CSV_OUTPUT_PATH, contactsCsv);
  console.log(`Written ${CONTACTS_CSV_OUTPUT_PATH}`);

  const calendarProvider = new GoogleCalendarProvider(googleAuth);
  const calendars = await calendarProvider.getCalendars();

  await writeFile(CONTACTS_JSON_OUTPUT_PATH, JSON.stringify(calendars, null, 2));
  console.log(`Written ${CONTACTS_JSON_OUTPUT_PATH}`);

  for (const calendar of calendars) {
    const outputPath = `${OUTPUT_FOLDER}/${calendar.calendar.id}.ics`;
    await writeFile(outputPath, calendar.events.export);
    console.log(`Written ${outputPath}`);
  }
}
main();
