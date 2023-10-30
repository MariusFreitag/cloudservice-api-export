import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import CloudflareAuthProvider, { CloudflareAuthCredentials } from "./cloudflare/cloudflare-auth-provider";
import CloudflareZoneProvider from "./cloudflare/cloudflare-zones-provider";
import GitHubIssuesProvider, { GitHubCredentials } from "./github/github-issues-provider";
import GoogleAuthProvider, { GoogleAuthCredentials } from "./google/google-auth-provider";
import GoogleCalendarsProvider from "./google/google-calendars-provider";
import GoogleContactsProvider from "./google/google-contacts-provider";
import GoogleContactsTransformer from "./google/google-contacts-transformer";
import { Logger } from "./logger";

export type ExecutionConfig = {
  steps: ExecutionStep[];
};

export type ExecutionStep =
  | {
      type: "Cloudflare";
      id: string;
      credentials: CloudflareAuthCredentials;
      features: {
        details: boolean;
      };
      target: {
        overview?: string;
        details?: string;
      };
    }
  | {
      type: "GitHub";
      id: string;
      credentials: GitHubCredentials;
      repositories: string[];
      features: {
        issueComments: boolean;
      };
      target: {
        issues?: string;
      };
    }
  | {
      type: "Google";
      id: string;
      credentials: GoogleAuthCredentials;
      tokenCachePath: string;
      authPort: string;
      features: {
        contacts: boolean;
        calendars: boolean;
      };
      target: {
        calendars?: string;
        contacts?: string;
      };
    };

/**
 * Handles the successive execution of export steps.
 */
export default class Executor {
  public constructor(
    private readonly log: Logger,
    private readonly config: ExecutionConfig,
  ) {}

  private async writeFile(path: string, data: string | object) {
    await mkdir(dirname(path), { recursive: true }).catch(() => {});
    await writeFile(path, typeof data === "string" ? data : JSON.stringify(data, null, 2));
    this.log.info(`Wrote to ${path}`);
  }

  private async executeCloudflare(
    step: Extract<ExecutionStep, { type: "Cloudflare" }>,
  ): ReturnType<CloudflareZoneProvider["getZones"]> {
    this.log.normal(`Starting to export ${step.id}`);
    const cloudflareAuth = await new CloudflareAuthProvider(step.credentials).getClient();

    const zoneProvider = new CloudflareZoneProvider(this.log.createLogger(step.id), cloudflareAuth);
    const zones = await zoneProvider.getZones(step.features.details);

    if (step.target.overview) {
      await this.writeFile(join(step.target.overview, "zones.json"), JSON.stringify(zones, null, 2));
    }
    if (step.features.details && step.target.details) {
      for (const zone of zones) {
        const outputPath = `${step.target.details}/${zone.zone.name}.txt`;
        await this.writeFile(outputPath, zone.dnsRecords?.export ?? "");
      }
    }

    return zones;
  }

  private async executeGitHub(step: Extract<ExecutionStep, { type: "GitHub" }>) {
    this.log.normal(`Starting to export ${step.id}`);

    const issuesProvider = new GitHubIssuesProvider(this.log.createLogger(step.id), step.credentials);

    const result: Record<string, unknown> = {};
    for (const repository of step.repositories) {
      const issues = await issuesProvider.getIssues(repository, step.features.issueComments);
      result[repository] = issues;

      if (step.target.issues) {
        const outputPath = `${step.target.issues}/${repository.replace("/", "-")}.ghissues.json`;
        await this.writeFile(outputPath, JSON.stringify(issues, null, 2));
      }
    }

    return result;
  }

  private async executeGoogle(step: Extract<ExecutionStep, { type: "Google" }>): Promise<{
    contacts?: {
      contactGroups: Awaited<ReturnType<GoogleContactsProvider["getContactGroups"]>>;
      contacts: Awaited<ReturnType<GoogleContactsProvider["getContacts"]>>;
      csv: string;
    };
    calendars?: Awaited<ReturnType<GoogleCalendarsProvider["getCalendars"]>>;
  }> {
    this.log.normal(`Starting to authorize ${step.id}`);
    await mkdir(dirname(step.tokenCachePath), { recursive: true }).catch(() => {});
    const googleAuth = await new GoogleAuthProvider(
      this.log.createLogger(step.id + "-Auth"),
      step.credentials,
      step.tokenCachePath,
      step.authPort,
      [
        ...(step.features.calendars ? GoogleCalendarsProvider.scopes : []),
        ...(step.features.contacts ? GoogleContactsProvider.scopes : []),
      ],
    ).getClient();

    const result: Awaited<ReturnType<Executor["executeGoogle"]>> = {};

    if (step.features.calendars) {
      this.log.normal(`Starting to export Calendars of ${step.id}`);
      const calendarsProvider = new GoogleCalendarsProvider(
        this.log.createLogger(step.id + "-Calendars"),
        googleAuth,
      );
      const calendars = await calendarsProvider.getCalendars();

      result.calendars = calendars;

      if (step.target.calendars) {
        const jsonOutputPath = join(step.target.calendars, "calendar.json");
        await this.writeFile(jsonOutputPath, JSON.stringify(calendars, null, 2));

        for (const calendar of calendars) {
          const outputPath = join(step.target.calendars, `${calendar.calendar.id}.ics`);
          await this.writeFile(outputPath, calendar.events.export);
        }
      }
    }

    if (step.features.contacts) {
      this.log.normal(`Starting to export Contacts of ${step.id}`);
      const peopleProvider = new GoogleContactsProvider(
        this.log.createLogger(step.id + "-Contacts"),
        googleAuth,
      );
      const contactGroups = await peopleProvider.getContactGroups();
      const contacts = await peopleProvider.getContacts();

      this.log.normal(`Starting to transform Contacts of ${step.id} to CSV`);
      const contactsCsv = await new GoogleContactsTransformer().generateContactsCsv(contactGroups, contacts);

      result.contacts = { contactGroups, contacts, csv: contactsCsv };

      if (step.target.contacts) {
        const jsonOutputPath = join(step.target.contacts, "contacts.json");
        await this.writeFile(jsonOutputPath, JSON.stringify({ contactGroups, contacts }, null, 2));

        const csvOutputPath = join(step.target.contacts, "contacts.csv");
        await this.writeFile(csvOutputPath, contactsCsv);
      }
    }

    return result;
  }

  public async execute() {
    this.log.normal("Executing");
    for (const step of this.config.steps) {
      switch (step.type) {
        case "Cloudflare":
          await this.executeCloudflare(step);
          break;
        case "GitHub":
          await this.executeGitHub(step);
          break;
        case "Google":
          await this.executeGoogle(step);
          break;
      }
    }
    this.log.success("Done");
  }
}
