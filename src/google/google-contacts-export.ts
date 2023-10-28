import { createObjectCsvStringifier } from "csv-writer";
import { people_v1 } from "googleapis";

export default class GoogleContactsExport {
  private sortContacts(contacts: people_v1.Schema$Person[]) {
    const clonedContacts = JSON.parse(JSON.stringify(contacts)) as people_v1.Schema$Person[];
    clonedContacts.sort((a, b) => {
      const aName = a.names?.[0];
      const bName = b.names?.[0];
      const givenNameComparison =
        aName?.givenName && bName?.givenName ? aName.givenName.localeCompare(bName.givenName) : 0;
      const familyNameComparison =
        aName?.familyName && bName?.familyName ? aName.familyName.localeCompare(bName.familyName) : 0;
      const displayNameComparison =
        aName?.displayName && bName?.displayName ? aName.displayName.localeCompare(bName.displayName) : 0;
      return givenNameComparison || familyNameComparison || displayNameComparison;
    });
    return clonedContacts;
  }

  private formatDate(date: people_v1.Schema$Date | undefined) {
    if (!date) {
      return undefined;
    }
    const year = date.year ? String(date.year).padStart(4, "0") : " -"; // The leading space is how Google does it
    const month = date.month ? String(date.month).padStart(2, "0") : "-";
    const day = date.day ? String(date.day).padStart(2, "0") : "-";
    return `${year}-${month}-${day}`;
  }

  private formatPhoto(photos: people_v1.Schema$Photo | undefined) {
    return photos?.url?.includes("/contacts/") ? photos.url.replace(/=s100$/, "") : undefined;
  }

  private formatGroupMemberships(
    contactGroups: people_v1.Schema$ContactGroup[],
    memberships: people_v1.Schema$Membership[] | undefined,
  ): string {
    return (memberships ?? [])
      .map((membership) => {
        if (!membership.contactGroupMembership?.contactGroupId) {
          return;
        }
        const contactGroup = contactGroups.find(
          (group) => group.resourceName === membership.contactGroupMembership?.contactGroupResourceName,
        );
        return (contactGroup?.groupType === "SYSTEM_CONTACT_GROUP" ? "* " : "") + contactGroup?.name;
      })
      .filter((membership) => membership)
      .join(" ::: ");
  }

  private formatEmailAddresses(
    emailAddresses: people_v1.Schema$EmailAddress[] | undefined,
  ): Record<string, string | undefined | null> {
    const result: Record<string, string | undefined | null> = {};
    for (const [i, emailAddress] of (emailAddresses ?? []).entries()) {
      result[`E-mail ${i + 1} - Value`] = emailAddress.value;
      result[`E-mail ${i + 1} - Type`] = (i === 0 ? "* " : "") + emailAddress.formattedType;
    }
    return result;
  }

  private formatPhoneNumbers(
    phoneNumbers: people_v1.Schema$PhoneNumber[] | undefined,
  ): Record<string, string | undefined | null> {
    const result: Record<string, string | undefined | null> = {};
    for (const [i, phoneNumber] of (phoneNumbers ?? []).entries()) {
      result[`Phone ${i + 1} - Value`] = phoneNumber.value;
      result[`Phone ${i + 1} - Type`] = phoneNumber.formattedType;
    }
    return result;
  }

  private formatAddresses(
    addresses: people_v1.Schema$Address[] | undefined,
  ): Record<string, string | undefined | null> {
    const result: Record<string, string | undefined | null> = {};
    for (const [i, address] of (addresses ?? []).entries()) {
      result[`Address ${i + 1} - Type`] = address.formattedType;
      result[`Address ${i + 1} - Formatted`] = address.formattedValue;
      result[`Address ${i + 1} - Street`] = address.streetAddress;
      result[`Address ${i + 1} - City`] = address.city;
      result[`Address ${i + 1} - PO Box`] = address.poBox;
      result[`Address ${i + 1} - Region`] = address.region;
      result[`Address ${i + 1} - Postal Code`] = address.postalCode;
      result[`Address ${i + 1} - Country`] = address.country;
      result[`Address ${i + 1} - Extended Address`] = address.extendedAddress;
    }
    return result;
  }

  private formatOrganizations(
    organizations: people_v1.Schema$Organization[] | undefined,
  ): Record<string, string | undefined | null> {
    const result: Record<string, string | undefined | null> = {};
    for (const [i, organization] of (organizations ?? []).entries()) {
      result[`Organization ${i + 1} - Type`] = organization.formattedType;
      result[`Organization ${i + 1} - Name`] = organization.name;
      result[`Organization ${i + 1} - Title`] = organization.title;
      result[`Organization ${i + 1} - Department`] = organization.department;
      result[`Organization ${i + 1} - Symbol`] = organization.symbol;
      result[`Organization ${i + 1} - Location`] = organization.location;
      result[`Organization ${i + 1} - Job Description`] = organization.jobDescription;
    }
    return result;
  }

  private formatRelations(
    relations: people_v1.Schema$Relation[] | undefined,
  ): Record<string, string | undefined | null> {
    const result: Record<string, string | undefined | null> = {};
    for (const [i, relation] of (relations ?? []).entries()) {
      result[`Relation ${i + 1} - Type`] = relation.formattedType;
      result[`Relation ${i + 1} - Value`] = relation.person;
    }
    return result;
  }

  private formatUrls(
    websites: people_v1.Schema$Url[] | undefined,
  ): Record<string, string | undefined | null> {
    const result: Record<string, string | undefined | null> = {};
    for (const [i, website] of (websites ?? []).entries()) {
      result[`Website ${i + 1} - Type`] = website.formattedType;
      result[`Website ${i + 1} - Value`] = website.value;
    }
    return result;
  }

  private formatEvents(
    events: people_v1.Schema$Event[] | undefined,
  ): Record<string, string | undefined | null> {
    const result: Record<string, string | undefined | null> = {};
    for (const [i, event] of (events ?? []).entries()) {
      result[`Event ${i + 1} - Type`] = event.formattedType;
      result[`Event ${i + 1} - Value`] = this.formatDate(event.date);
    }
    return result;
  }

  private postProcessRecords(headers: string[], records: Record<string, string | undefined | null>[]) {
    for (const record of records) {
      for (const [key, value] of Object.entries(record)) {
        // Replace undefined and null values with empty strings
        record[key as keyof typeof record] ??= "";

        if (!headers.includes(key)) {
          // We could also dynamically add the header, but this is an additional safeguard to get a consistent format
          throw new Error(`There is no matching CSV header for the key '${key}' (value: '${value}')!`);
        }
      }
    }
  }

  public async generateContactsCsv(
    contactGroups: people_v1.Schema$ContactGroup[],
    unsortedContacts: people_v1.Schema$Person[],
  ): Promise<string> {
    const contacts = this.sortContacts(unsortedContacts);

    // These could also be dynamically calculated from the records, but I want to be safe for now
    const headers =
      "Name,Given Name,Additional Name,Family Name,Yomi Name,Given Name Yomi,Additional Name Yomi,Family Name Yomi,Name Prefix,Name Suffix,Initials,Nickname,Short Name,Maiden Name,Birthday,Gender,Location,Billing Information,Directory Server,Mileage,Occupation,Hobby,Sensitivity,Priority,Subject,Notes,Language,Photo,Group Membership,E-mail 1 - Type,E-mail 1 - Value,E-mail 2 - Type,E-mail 2 - Value,E-mail 3 - Type,E-mail 3 - Value,E-mail 4 - Type,E-mail 4 - Value,E-mail 5 - Type,E-mail 5 - Value,E-mail 6 - Type,E-mail 6 - Value,Phone 1 - Type,Phone 1 - Value,Phone 2 - Type,Phone 2 - Value,Phone 3 - Type,Phone 3 - Value,Phone 4 - Type,Phone 4 - Value,Address 1 - Type,Address 1 - Formatted,Address 1 - Street,Address 1 - City,Address 1 - PO Box,Address 1 - Region,Address 1 - Postal Code,Address 1 - Country,Address 1 - Extended Address,Address 2 - Type,Address 2 - Formatted,Address 2 - Street,Address 2 - City,Address 2 - PO Box,Address 2 - Region,Address 2 - Postal Code,Address 2 - Country,Address 2 - Extended Address,Organization 1 - Type,Organization 1 - Name,Organization 1 - Yomi Name,Organization 1 - Title,Organization 1 - Department,Organization 1 - Symbol,Organization 1 - Location,Organization 1 - Job Description,Relation 1 - Type,Relation 1 - Value,Website 1 - Type,Website 1 - Value,Event 1 - Type,Event 1 - Value,Event 2 - Type,Event 2 - Value,Event 3 - Type,Event 3 - Value".split(
        ",",
      );

    const csvWriter = createObjectCsvStringifier({
      fieldDelimiter: ";", // Google uses "," and Excel uses ";"
      header: headers.map((header) => ({ id: header, title: header })),
    });

    const records = contacts.map((contact) => {
      if (
        (contact.names?.length ?? 0) > 1 ||
        (contact.birthdays?.length ?? 0) > 1 ||
        (contact.genders?.length ?? 0) > 1 ||
        (contact.biographies?.length ?? 0) > 1
        // I'm ignoring multiple photos
      ) {
        throw new Error(
          `The contact '${contact.names?.[0].displayName}' has more than one name, birthday, gender, or biography!`,
        );
      }

      return {
        Name: contact.names?.[0]?.displayName,
        "Given Name": contact.names?.[0]?.givenName,
        "Additional Name": contact.names?.[0]?.middleName,
        "Family Name": contact.names?.[0]?.familyName,
        "Name Prefix": contact.names?.[0]?.honorificPrefix,
        "Name Suffix": contact.names?.[0]?.honorificSuffix,
        Birthday: this.formatDate(contact.birthdays?.[0]?.date),
        Gender: contact.genders?.[0]?.formattedValue,
        Notes: contact.biographies?.[0].value,
        Photo: this.formatPhoto(contact.photos?.[0]),
        "Group Membership": this.formatGroupMemberships(contactGroups, contact.memberships),
        ...this.formatEmailAddresses(contact.emailAddresses),
        ...this.formatPhoneNumbers(contact.phoneNumbers),
        ...this.formatAddresses(contact.addresses),
        ...this.formatOrganizations(contact.organizations),
        ...this.formatRelations(contact.relations),
        ...this.formatUrls(contact.urls),
        ...this.formatEvents(contact.events),
      };
    });

    this.postProcessRecords(headers, records);

    return csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);
  }
}
