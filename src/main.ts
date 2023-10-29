import { readFile, writeFile } from "fs/promises";
import CloudflareAuthProvider from "./cloudflare/cloudflare-auth-provider";
import CloudflareZoneProvider from "./cloudflare/cloudflare-zones-provider";
import GitHubIssuesProvider from "./github/github-issues-provider";
import GoogleAuthProvider from "./google/google-auth-provider";
import GoogleCalendarProvider from "./google/google-calendar-provider";
import GoogleContactsProvider from "./google/google-contacts-provider";
import GoogleContactsTransformer from "./google/google-contacts-transformer";
import { createLogger } from "./logger";

const AUTH_CALLBACK_PORT = "3124";

const CREDENTIALS_FOLDER = __dirname + "/../private/credentials";
const OUTPUT_FOLDER = __dirname + "/../private/output";
const GOOGLE_CREDENTIALS_PATH = CREDENTIALS_FOLDER + "/google-credentials.json";
const GOOGLE_TOKEN_CACHE_PATH = CREDENTIALS_FOLDER + "/cached-google-token.json";
const CLOUDFLARE_CREDENTIALS_PATH = CREDENTIALS_FOLDER + "/cloudflare-credentials.json";
const GITHUB_CREDENTIALS_PATH = CREDENTIALS_FOLDER + "/github-credentials.json";
const CONTACTS_OUTPUT_PATH = OUTPUT_FOLDER + "/contacts.json";
const CONTACTS_CSV_OUTPUT_PATH = OUTPUT_FOLDER + "/contacts.csv";
const CONTACTS_JSON_OUTPUT_PATH = OUTPUT_FOLDER + "/calendars.json";
const ZONES_OUTPUT_PATH = OUTPUT_FOLDER + "/zones.json";

async function main() {
  const mainLogger = createLogger("main");

  mainLogger.normal("Starting to export Cloudflare");
  const cloudflareCredentials = await readFile(CLOUDFLARE_CREDENTIALS_PATH, "utf-8");
  const cloudflareAuth = await new CloudflareAuthProvider(JSON.parse(cloudflareCredentials)).getClient();
  const zoneProvider = new CloudflareZoneProvider(createLogger("Cloudflare"), cloudflareAuth);
  const zones = await zoneProvider.getZones();

  mainLogger.info(zones.length);
  await writeFile(ZONES_OUTPUT_PATH, JSON.stringify(zones, null, 2));
  mainLogger.info(`Wrote ${ZONES_OUTPUT_PATH}`);

  for (const zone of zones) {
    const outputPath = `${OUTPUT_FOLDER}/${zone.zone.name}.txt`;
    await writeFile(outputPath, zone.dnsRecords.export ?? "");
    mainLogger.info(`Wrote ${outputPath}`);
  }

  mainLogger.normal("Starting to authorize with Google");
  const googleCredentials = await readFile(GOOGLE_CREDENTIALS_PATH, "utf-8");
  const googleAuth = await new GoogleAuthProvider(
    createLogger("GoogleAuth"),
    JSON.parse(googleCredentials),
    GOOGLE_TOKEN_CACHE_PATH,
    AUTH_CALLBACK_PORT,
    [...GoogleContactsProvider.scopes, ...GoogleCalendarProvider.scopes],
  ).getClient();

  mainLogger.normal("Starting to export Google Contacts");
  const peopleProvider = new GoogleContactsProvider(createLogger("GoogleContacts"), googleAuth);
  const contactGroups = await peopleProvider.getContactGroups();
  const contacts = await peopleProvider.getContacts();

  mainLogger.info(contacts.length);
  await writeFile(CONTACTS_OUTPUT_PATH, JSON.stringify({ contactGroups, contacts }, null, 2));
  mainLogger.info(`Wrote ${CONTACTS_OUTPUT_PATH}`);

  const calendarTransformer = new GoogleContactsTransformer();
  const contactsCsv = await calendarTransformer.generateContactsCsv(contactGroups, contacts);
  await writeFile(CONTACTS_CSV_OUTPUT_PATH, contactsCsv);
  mainLogger.info(`Wrote ${CONTACTS_CSV_OUTPUT_PATH}`);

  mainLogger.normal("Starting to export Google Calendar");
  const calendarProvider = new GoogleCalendarProvider(createLogger("GoogleCalendar"), googleAuth);
  const calendars = await calendarProvider.getCalendars();

  await writeFile(CONTACTS_JSON_OUTPUT_PATH, JSON.stringify(calendars, null, 2));
  mainLogger.info(`Wrote ${CONTACTS_JSON_OUTPUT_PATH}`);

  for (const calendar of calendars) {
    const outputPath = `${OUTPUT_FOLDER}/${calendar.calendar.id}.ics`;
    await writeFile(outputPath, calendar.events.export);
    mainLogger.info(`Wrote ${outputPath}`);
  }

  mainLogger.normal("Starting to export Google GitHub Issues");
  const gitHubCredentials = JSON.parse(await readFile(GITHUB_CREDENTIALS_PATH, "utf-8"));
  const issuesProvider = new GitHubIssuesProvider(createLogger("GitHubIssues"), gitHubCredentials);
  for (const repository of gitHubCredentials.repositories) {
    const issues = await issuesProvider.getIssues(repository);
    const outputPath = `${OUTPUT_FOLDER}/${repository.replace("/", "-")}.ghissues.json`;
    await writeFile(outputPath, JSON.stringify(issues, null, 2));
    mainLogger.info(`Wrote ${outputPath}`);
  }

  mainLogger.success(`Done`);
}
main();
