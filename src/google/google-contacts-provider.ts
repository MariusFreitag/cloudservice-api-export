import { GaxiosResponse } from "gaxios";
import { Auth, google, people_v1 } from "googleapis";
import { Logger } from "../logger";

export default class GoogleContactsProvider {
  private peopleClient?: people_v1.People;
  public static readonly scopes = ["https://www.googleapis.com/auth/contacts.readonly"];

  constructor(
    private readonly log: Logger,
    private readonly authClient: Auth.OAuth2Client,
  ) {}

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

  public async getContactGroups(): Promise<people_v1.Schema$ContactGroup[]> {
    const service = await this.getClient();

    const contactGroups = [];

    let nextPageToken = undefined;
    do {
      const response = (await service.contactGroups.list({
        pageToken: nextPageToken,
      })) as GaxiosResponse<people_v1.Schema$ListContactGroupsResponse>;

      contactGroups.push(...(response.data.contactGroups ?? []));
      nextPageToken = response.data.nextPageToken;
      this.log.info(`Fetched ${response.data.contactGroups?.length ?? 0} contact groups`);
    } while (nextPageToken);

    return contactGroups;
  }

  public async getContacts(): Promise<people_v1.Schema$Person[]> {
    const service = await this.getClient();

    const contacts = [];

    let nextPageToken = undefined;
    do {
      const response = (await service.people.connections.list({
        resourceName: "people/me",
        pageToken: nextPageToken,
        personFields:
          "addresses,ageRanges,biographies,birthdays,calendarUrls,clientData,coverPhotos,emailAddresses,events,externalIds,genders,imClients,interests,locales,locations,memberships,metadata,miscKeywords,names,nicknames,occupations,organizations,phoneNumbers,photos,relations,sipAddresses,skills,urls,userDefined",
      })) as GaxiosResponse<people_v1.Schema$ListConnectionsResponse>;

      contacts.push(...(response.data.connections ?? []));
      nextPageToken = response.data.nextPageToken;
      this.log.info(`Fetched ${response.data.connections?.length ?? 0} contacts`);
    } while (nextPageToken);

    return contacts;
  }
}
