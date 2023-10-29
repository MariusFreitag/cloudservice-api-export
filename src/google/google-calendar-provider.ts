import { GaxiosResponse } from "gaxios";
import { Auth, calendar_v3, google } from "googleapis";

export default class GoogleCalendarProvider {
  private calendarClient?: calendar_v3.Calendar;
  public static readonly scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
  ];

  constructor(private readonly authClient: Auth.OAuth2Client) {}

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
      })) as GaxiosResponse<calendar_v3.Schema$CalendarList>;

      calendarListEntries.push(...(response.data.items ?? []));
      nextPageToken = response.data.nextPageToken;
      console.log(`Fetched ${response.data.items?.length ?? 0} calendar list entries`);
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
      })) as GaxiosResponse<calendar_v3.Schema$Events>;

      events.push(...(response.data.items ?? []));
      nextPageToken = response.data.nextPageToken;
      console.log(`Fetched ${response.data.items?.length ?? 0} events for calendar ${calendarId}`);
    } while (nextPageToken);

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

  public async getCalendars(): Promise<
    {
      calendar: calendar_v3.Schema$CalendarListEntry;
      events: { data: calendar_v3.Schema$Event[]; export: string };
    }[]
  > {
    const calendars = await this.getCalendarListEntries();

    const result = [];

    for (const calendar of calendars ?? []) {
      result.push({
        calendar,
        events: {
          data: await this.getEvents(calendar.id ?? ""),
          export: await this.getCalDavExport(calendar.id ?? ""),
        },
      });
    }

    return result;
  }
}
