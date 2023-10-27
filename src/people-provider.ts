import { Auth, google, people_v1 } from "googleapis";

export default class PeopleProvider {
  private peopleClient?: people_v1.People;
  public static readonly scopes = [
    "https://www.googleapis.com/auth/contacts.readonly",
  ];

  constructor(private readonly authClient: Auth.OAuth2Client) {}

  public async getClient(): Promise<people_v1.People> {
    if (this.peopleClient) {
      return this.peopleClient;
    }

    this.peopleClient = google.people({ version: "v1", auth: this.authClient });

    return this.peopleClient;
  }

  public async getConnections(
    connections: people_v1.Schema$Person[] = [],
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

    connections.push(...(res.data.connections ?? []));

    if (res.data.nextPageToken != undefined) {
      console.log(`Fetching next page (${res.data.nextPageToken})`);
      return this.getConnections(connections, res.data.nextPageToken);
    }

    return connections;
  }
}
