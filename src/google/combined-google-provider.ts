import { Logger } from "../logger";
import GoogleAuthProvider, { GoogleAuthCredentials } from "./google-auth-provider";
import GoogleCalendarsProvider, { GoogleCalendarsFeatures } from "./google-calendars-provider";
import GoogleContactsProvider from "./google-contacts-provider";
import GoogleContactsTransformer from "./google-contacts-transformer";

export type GoogleFeatures = {
  contacts: boolean;
  calendars: boolean;
} & GoogleCalendarsFeatures;

export type GoogleData = {
  contacts?: {
    contactGroups: Awaited<ReturnType<GoogleContactsProvider["getContactGroups"]>>;
    contacts: Awaited<ReturnType<GoogleContactsProvider["getContacts"]>>;
    csv: string;
  };
  calendars?: Awaited<ReturnType<GoogleCalendarsProvider["getFullCalendarData"]>>;
};

/**
 * Orchestrates the exporting process of the different Google providers.
 */
export default class CombinedGoogleProvider {
  constructor(
    private readonly log: Logger,
    private readonly credentials: GoogleAuthCredentials,
    private readonly tokenCachePath: string,
    private readonly authCallbackPort: string,
    private readonly features: GoogleFeatures,
  ) {}

  public async getData(): Promise<GoogleData> {
    this.log.normal(`Starting to authorize with Google`);
    const googleAuth = await new GoogleAuthProvider(
      this.log.createSubLogger("-Auth"),
      this.credentials,
      this.tokenCachePath,
      this.authCallbackPort,
      [
        ...(this.features.calendars ? GoogleCalendarsProvider.scopes : []),
        ...(this.features.contacts ? GoogleContactsProvider.scopes : []),
      ],
    ).getClient();

    const result: GoogleData = {};

    if (this.features.calendars) {
      this.log.normal(`Starting to export Google Calendars`);
      const calendarsProvider = new GoogleCalendarsProvider(
        this.log.createSubLogger("-Calendars"),
        googleAuth,
        this.features,
      );
      const calendars = await calendarsProvider.getFullCalendarData();

      result.calendars = calendars;
    }

    if (this.features.contacts) {
      this.log.normal(`Starting to export Google Contacts`);
      const peopleProvider = new GoogleContactsProvider(this.log.createSubLogger("-Contacts"), googleAuth);
      const contactGroups = await peopleProvider.getContactGroups();
      const contacts = await peopleProvider.getContacts();

      this.log.normal(`Starting to transform Google Contacts to CSV`);
      const contactsCsv = await new GoogleContactsTransformer().generateContactsCsv(contactGroups, contacts);

      result.contacts = { contactGroups, contacts, csv: contactsCsv };
    }

    return result;
  }
}
