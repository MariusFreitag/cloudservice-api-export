import { GaxiosResponse } from "gaxios";
import { Auth, calendar_v3, google } from "googleapis";
import { Logger } from "../logger";

export type GoogleCalendarsFeatures = {
  stabilizeData: boolean;
  eventDetails: boolean;
  calendarExport: boolean;
};

/**
 * Implements the exporting of all Google calendars and their events
 * of the authenticated user to JSON and iCalendar formats.
 */
export default class GoogleCalendarsProvider {
  private calendarClient?: calendar_v3.Calendar;
  public static readonly scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
  ];

  constructor(
    private readonly log: Logger,
    private readonly authClient: Auth.OAuth2Client,
    private readonly features: GoogleCalendarsFeatures,
  ) {}

  private async getClient(): Promise<calendar_v3.Calendar> {
    if (this.calendarClient) {
      return this.calendarClient;
    }

    this.calendarClient = google.calendar({
      version: "v3",
      auth: this.authClient,
    });

    return this.calendarClient;
  }

  public async getCalendarListEntries(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    const service = await this.getClient();

    const calendarListEntries = [];

    let nextPageToken = undefined;
    do {
      const response = (await service.calendarList.list({
        pageToken: nextPageToken,
        maxResults: 250,
      })) as GaxiosResponse<calendar_v3.Schema$CalendarList>;

      calendarListEntries.push(...(response.data.items ?? []));
      nextPageToken = response.data.nextPageToken;
      this.log.info(`Fetched ${response.data.items?.length ?? 0} calendar list entries`);
    } while (nextPageToken);

    return calendarListEntries;
  }

  public async getEvents(calendarId: string): Promise<calendar_v3.Schema$Event[]> {
    const service = await this.getClient();

    const events = [];

    let nextPageToken = undefined;
    do {
      const response = (await service.events.list({
        calendarId: calendarId,
        pageToken: nextPageToken,
        maxResults: 2500,
      })) as GaxiosResponse<calendar_v3.Schema$Events>;

      events.push(...(response.data.items ?? []));
      nextPageToken = response.data.nextPageToken;
      this.log.info(`Fetched ${response.data.items?.length ?? 0} events for calendar ${calendarId}`);
    } while (nextPageToken);

    if (this.features.stabilizeData) {
      for (const event of events) {
        // The event reminder sort order returned by Google seems to be random
        event.reminders?.overrides?.sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0));
        // The contact photo URL changes constantly
        if (event.gadget?.preferences?.["goo.contactsPhotoUrl"]) {
          event.gadget.preferences["goo.contactsPhotoUrl"] = "";
        }
      }
    }

    return events;
  }

  public async getCalDavExport(calendarId: string): Promise<string> {
    const response = await fetch(`https://apidata.googleusercontent.com/caldav/v2/${calendarId}/events`, {
      headers: {
        Authorization: `Bearer ${(await this.authClient.getAccessToken()).token}`,
      },
    });
    return await response.text();
  }

  public async getFullCalendarData(calendarInclusionList: string[] | null): Promise<
    {
      calendar: calendar_v3.Schema$CalendarListEntry;
      events: { data: calendar_v3.Schema$Event[] | null; export: string | null };
    }[]
  > {
    let calendars = await this.getCalendarListEntries();
    if (calendarInclusionList !== null) {
      calendars = calendars.filter((calendar) => calendar.id && calendarInclusionList.includes(calendar.id));
    }

    const result = [];

    for (const calendar of calendars ?? []) {
      result.push({
        calendar,
        events: {
          data: this.features.eventDetails ? await this.getEvents(calendar.id ?? "") : null,
          export: this.features.calendarExport ? await this.getCalDavExport(calendar.id ?? "") : null,
        },
      });
    }

    return result;
  }
}
