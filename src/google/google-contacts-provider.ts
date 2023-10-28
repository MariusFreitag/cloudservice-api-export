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
    contacts.sort((a, b) => a.names?.[0].displayName?.localeCompare(b.names?.[0].displayName ?? "") ?? 0);

    const csvWriter = createObjectCsvStringifier({
      fieldDelimiter: ";", // Google uses "," and Excel uses ";"
      header: [
        { id: "Name", title: "Name" },
        { id: "Given Name", title: "Given Name" },
        { id: "Additional Name", title: "Additional Name" },
        { id: "Family Name", title: "Family Name" },
        { id: "Yomi Name", title: "Yomi Name" },
        { id: "Given Name Yomi", title: "Given Name Yomi" },
        { id: "Additional Name Yomi", title: "Additional Name Yomi" },
        { id: "Family Name Yomi", title: "Family Name Yomi" },
        { id: "Name Prefix", title: "Name Prefix" },
        { id: "Name Suffix", title: "Name Suffix" },
        { id: "Initials", title: "Initials" },
        { id: "Nickname", title: "Nickname" },
        { id: "Short Name", title: "Short Name" },
        { id: "Maiden Name", title: "Maiden Name" },
        { id: "Birthday", title: "Birthday" },
        { id: "Gender", title: "Gender" },
        { id: "Location", title: "Location" },
        { id: "Billing Information", title: "Billing Information" },
        { id: "Directory Server", title: "Directory Server" },
        { id: "Mileage", title: "Mileage" },
        { id: "Occupation", title: "Occupation" },
        { id: "Hobby", title: "Hobby" },
        { id: "Sensitivity", title: "Sensitivity" },
        { id: "Priority", title: "Priority" },
        { id: "Subject", title: "Subject" },
        { id: "Notes", title: "Notes" },
        { id: "Language", title: "Language" },
        { id: "Photo", title: "Photo" },
        { id: "Group Membership", title: "Group Membership" },
        { id: "E-mail 1 - Type", title: "E-mail 1 - Type" },
        { id: "E-mail 1 - Value", title: "E-mail 1 - Value" },
        { id: "E-mail 2 - Type", title: "E-mail 2 - Type" },
        { id: "E-mail 2 - Value", title: "E-mail 2 - Value" },
        { id: "E-mail 3 - Type", title: "E-mail 3 - Type" },
        { id: "E-mail 3 - Value", title: "E-mail 3 - Value" },
        { id: "E-mail 4 - Type", title: "E-mail 4 - Type" },
        { id: "E-mail 4 - Value", title: "E-mail 4 - Value" },
        { id: "Phone 1 - Type", title: "Phone 1 - Type" },
        { id: "Phone 1 - Value", title: "Phone 1 - Value" },
        { id: "Phone 2 - Type", title: "Phone 2 - Type" },
        { id: "Phone 2 - Value", title: "Phone 2 - Value" },
        { id: "Phone 3 - Type", title: "Phone 3 - Type" },
        { id: "Phone 3 - Value", title: "Phone 3 - Value" },
        { id: "Address 1 - Type", title: "Address 1 - Type" },
        { id: "Address 1 - Formatted", title: "Address 1 - Formatted" },
        { id: "Address 1 - Street", title: "Address 1 - Street" },
        { id: "Address 1 - City", title: "Address 1 - City" },
        { id: "Address 1 - PO Box", title: "Address 1 - PO Box" },
        { id: "Address 1 - Region", title: "Address 1 - Region" },
        { id: "Address 1 - Postal Code", title: "Address 1 - Postal Code" },
        { id: "Address 1 - Country", title: "Address 1 - Country" },
        { id: "Address 1 - Extended Address", title: "Address 1 - Extended Address" },
        { id: "Address 2 - Type", title: "Address 2 - Type" },
        { id: "Address 2 - Formatted", title: "Address 2 - Formatted" },
        { id: "Address 2 - Street", title: "Address 2 - Street" },
        { id: "Address 2 - City", title: "Address 2 - City" },
        { id: "Address 2 - PO Box", title: "Address 2 - PO Box" },
        { id: "Address 2 - Region", title: "Address 2 - Region" },
        { id: "Address 2 - Postal Code", title: "Address 2 - Postal Code" },
        { id: "Address 2 - Country", title: "Address 2 - Country" },
        { id: "Address 2 - Extended Address", title: "Address 2 - Extended Address" },
        { id: "Relation 1 - Type", title: "Relation 1 - Type" },
        { id: "Relation 1 - Value", title: "Relation 1 - Value" },
        { id: "Website 1 - Type", title: "Website 1 - Type" },
        { id: "Website 1 - Value", title: "Website 1 - Value" },
        { id: "Event 1 - Type", title: "Event 1 - Type" },
        { id: "Event 1 - Value", title: "Event 1 - Value" },
        { id: "Event 2 - Type", title: "Event 2 - Type" },
        { id: "Event 2 - Value", title: "Event 2 - Value" },
      ],
    });

    function formatDate(date: people_v1.Schema$Date | undefined) {
      if (!date) {
        return undefined;
      }
      const year = date.year ? String(date.year).padStart(4, "0") : "-";
      const month = date.month ? String(date.month).padStart(2, "0") : "-";
      const day = date.day ? String(date.day).padStart(2, "0") : "-";
      return `${year}-${month}-${day}`;
    }

    const records = contacts.map((contact) => ({
      Name: contact.names?.[0]?.displayName,
      "Given Name": contact.names?.[0]?.givenName,
      "Additional Name": contact.names?.[0]?.middleName,
      "Family Name": contact.names?.[0]?.familyName,
      Birthday: formatDate(contact.birthdays?.[0]?.date),
      Notes: contact.biographies?.[0].value,
      Photo: contact.photos?.[0].url?.includes("/contacts/") ? contact.photos?.[0].url : undefined,
      // ...
      "Phone 1 - Type": contact.phoneNumbers?.[0]?.formattedType,
      "Phone 1 - Value": contact.phoneNumbers?.[0]?.value,
      "Phone 2 - Type": contact.phoneNumbers?.[1]?.formattedType,
      "Phone 2 - Value": contact.phoneNumbers?.[1]?.value,
      "Phone 3 - Type": contact.phoneNumbers?.[2]?.formattedType,
      "Phone 3 - Value": contact.phoneNumbers?.[2]?.value,
      // ...
    }));

    // Replace undefined values with empty strings
    for (const record of records) {
      for (const [key, value] of Object.entries(record)) {
        if (value === undefined) {
          record[key as keyof typeof record] = "";
        }
      }
    }

    return csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);
  }
}
