import * as Cloudflare from "cloudflare";
import { Logger } from "../logger";

type ApiResponse = Promise<{ result?: object } | string>;

/**
 * Implements the exporting of all Cloudflare zones,
 * their DNS record and corresponding BIND zone files,
 * email routing configs, email routing rules, and general settings.
 */
export default class CloudflareZoneProvider {
  constructor(
    private readonly log: Logger,
    private readonly authClient: Cloudflare,
  ) {}

  private request(path: string): ApiResponse {
    const extendedClient = this.authClient as unknown as {
      _client: {
        request(
          method: string,
          path: string,
          query: string,
          options: { auth: Record<string, never> },
        ): ApiResponse;
      };
    };
    return extendedClient._client.request("GET", path, "", { auth: {} });
  }

  private async getResult(
    apiResponse: ApiResponse | Promise<Cloudflare.DnsRecordsBrowseResponse<never>>,
  ): Promise<object | string | undefined | object[]> {
    const completedResponse = await (apiResponse as ApiResponse);
    return typeof completedResponse === "string" ? completedResponse : completedResponse.result;
  }

  public async getZones(fetchDetails: boolean): Promise<
    {
      zone: { name: string } & unknown;
      dnsRecords?: { data: unknown; export: string | undefined };
      settings?: unknown;
      emails?: { routing: unknown; rules: unknown };
    }[]
  > {
    const zones = (await this.getResult(this.authClient.zones.browse())) as { id: string; name: string }[];
    this.log.info("Fetched all zones");

    const result = [];

    if (!fetchDetails) {
      return zones.map((zone) => ({ zone }));
    }

    for (const zone of zones ?? []) {
      const dnsRecordsResponse = this.authClient.dnsRecords.browse(zone.id);
      const dnsRecordsExportResponse = this.authClient.dnsRecords.export(zone.id);
      const emailsRoutingResponse = this.request(`/zones/${zone.id}/email/routing`);
      const emailsRoutingRulesResponse = this.request(`/zones/${zone.id}/email/routing/rules`);
      const settingsResponse = this.authClient.zoneSettings.browse(zone.id);
      this.log.info(`Fetched data for zone '${zone.name}'`);

      result.push({
        zone,
        dnsRecords: {
          data: await this.getResult(dnsRecordsResponse),
          export: (await this.getResult(dnsRecordsExportResponse)) as string | undefined,
        },
        settings: await this.getResult(settingsResponse),
        emails: {
          routing: await this.getResult(emailsRoutingResponse),
          rules: await this.getResult(emailsRoutingRulesResponse),
        },
      });
    }

    return result;
  }
}
