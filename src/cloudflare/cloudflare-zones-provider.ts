import * as Cloudflare from "cloudflare";
import { Logger } from "../logger";

type ApiResponse = Promise<{ result?: object } | string>;

type ZoneData = {
  zone: { name: string } & unknown;
  dnsRecords?: { data: unknown; export: string | undefined };
  settings?: unknown;
  emails?: { routing: unknown; rules: unknown };
}[];

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

  private async postProcessDnsRecordsExport(
    stabilizeData: boolean,
    apiResponse: ApiResponse,
  ): Promise<string | undefined> {
    const dnsRecordsExport = (await this.getResult(apiResponse)) as string | undefined;
    if (stabilizeData) {
      // The timestamp documents when this file was exported, which is bad for incremental backups
      this.log.info("Removing timestamps and SOA serial numbers from DNS record exports");
      return dnsRecordsExport
        ?.replace(
          /Exported: {3}[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/g,
          "Exported:   2023-11-01 12:00:00",
        )
        ?.replace(/(SOA\Wjason\.ns\.cloudflare\.com\.\Wdns\.cloudflare\.com\.\W)[0-9]*/g, "$10000000000");
    }
    return dnsRecordsExport;
  }

  public async getZones(fetchDetails: boolean, stabilizeData: boolean): Promise<ZoneData> {
    const zones = (await this.getResult(this.authClient.zones.browse())) as { id: string; name: string }[];
    this.log.info("Fetched all zones");

    if (!fetchDetails) {
      return zones.map((zone) => ({ zone }));
    }

    const zoneDataPromises: Promise<ZoneData[number]>[] = [];

    for (const zone of zones ?? []) {
      // Parallelize zone details fetching
      zoneDataPromises.push(
        (async () => {
          const dnsRecordsResponse = this.authClient.dnsRecords.browse(zone.id);
          const dnsRecordsExportResponse = this.authClient.dnsRecords.export(zone.id);
          const emailsRoutingResponse = this.request(`/zones/${zone.id}/email/routing`);
          const emailsRoutingRulesResponse = this.request(`/zones/${zone.id}/email/routing/rules`);
          const settingsResponse = this.authClient.zoneSettings.browse(zone.id);
          this.log.info(`Fetched data for zone '${zone.name}'`);

          return {
            zone,
            dnsRecords: {
              data: await this.getResult(dnsRecordsResponse),
              export: await this.postProcessDnsRecordsExport(stabilizeData, dnsRecordsExportResponse),
            },
            settings: await this.getResult(settingsResponse),
            emails: {
              routing: await this.getResult(emailsRoutingResponse),
              rules: await this.getResult(emailsRoutingRulesResponse),
            },
          };
        })(),
      );
    }

    return Promise.all(zoneDataPromises);
  }
}
