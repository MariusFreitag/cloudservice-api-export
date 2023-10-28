import { Auth, google, people_v1 } from "googleapis";
import { createObjectCsvStringifier } from "csv-writer";
import { EOL } from "os";

export default class PeopleProvider {
  private peopleClient?: people_v1.People;
  public static readonly scopes = ["https://www.googleapis.com/auth/contacts.readonly"];

  constructor(private readonly authClient: Auth.OAuth2Client) {}

  private async getClient(): Promise<people_v1.People> {
    if (this.peopleClient) {
      return this.peopleClient;
    }

    this.peopleClient = google.people({
      version: "v1",
      auth: this.authClient,
    });

    return this.peopleClient;
  }

  public async getContacts(
    contacts: people_v1.Schema$Person[] = [],
    nextPageToken?: string,
  ): Promise<people_v1.Schema$Person[]> {
    const service = await this.getClient();

    const res = await service.people.connections.list({
      resourceName: "people/me",
      pageSize: 10,
      pageToken: nextPageToken,
      personFields:
        "addresses,ageRanges,biographies,birthdays,calendarUrls,clientData,coverPhotos,emailAddresses,events,externalIds,genders,imClients,interests,locales,locations,memberships,metadata,miscKeywords,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,sipAddresses,skills,urls,userDefined",
    });

    contacts.push(...(res.data.connections ?? []));

    if (res.data.nextPageToken != undefined) {
      console.log(`Fetching next page (${res.data.nextPageToken})`);
      return this.getContacts(contacts, res.data.nextPageToken);
    }

    return contacts;
  }

  public async generateContactsCsv(contacts: people_v1.Schema$Person[]): Promise<string> {
    const csvWriter = createObjectCsvStringifier({
      header: [
        { id: "name", title: "NAME" },
        { id: "phone", title: "PHONE" },
      ],
    });

    const records = contacts.map((contact) => ({
      name: contact.names?.[0]?.displayName,
      phone: contact.phoneNumbers?.[0]?.value,
    }));

    return csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);
  }
}
