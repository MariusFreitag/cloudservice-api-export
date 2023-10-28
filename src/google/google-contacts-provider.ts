import { Auth, google, people_v1 } from "googleapis";

export default class GoogleContactsProvider {
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

  public async getContactGroups(
    contactGroups: people_v1.Schema$ContactGroup[] = [],
    nextPageToken?: string,
  ): Promise<people_v1.Schema$ContactGroup[]> {
    const service = await this.getClient();
    const response = await service.contactGroups.list({
      pageToken: nextPageToken,
    });

    contactGroups.push(...(response.data.contactGroups ?? []));

    if (response.data.nextPageToken != undefined) {
      console.log(`Fetching next page (${response.data.nextPageToken})`);
      return this.getContactGroups(contactGroups, response.data.nextPageToken);
    }

    return contactGroups;
  }

  public async getContacts(
    contacts: people_v1.Schema$Person[] = [],
    nextPageToken?: string,
  ): Promise<people_v1.Schema$Person[]> {
    const service = await this.getClient();
    const response = await service.people.connections.list({
      resourceName: "people/me",
      pageToken: nextPageToken,
      personFields:
        "addresses,ageRanges,biographies,birthdays,calendarUrls,clientData,coverPhotos,emailAddresses,events,externalIds,genders,imClients,interests,locales,locations,memberships,metadata,miscKeywords,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,sipAddresses,skills,urls,userDefined",
    });

    contacts.push(...(response.data.connections ?? []));

    if (response.data.nextPageToken != undefined) {
      console.log(`Fetching next page (${response.data.nextPageToken})`);
      return this.getContacts(contacts, response.data.nextPageToken);
    }

    return contacts;
  }
}
