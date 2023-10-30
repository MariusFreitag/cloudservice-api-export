# Cloud Service API Export

CLI tool to easily export and backup your data from different cloud services.

While the coverage of services and features is currently limited, the tool already supports some important functionalities that I use in my daily life.

It serves as a solid starting point for adding more capabilities in the future. To improve performance, exports are done in parallel.

## Currently Supported Services

- **Cloudflare**
  - Zones and their settings
  - DNS records and BIND zone files
  - Email routing configs and email routing rules
  - **Required:** [API Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- **GitHub**
  - Repository issues
  - Issue comments
  - **Required:** API URL (can point to the [public GitHub](https://api.github.com) or a GitHub Enterprise instance), Username, and [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- **Google**
  - OAuth flow
  - **Google Calendar**: All calendars, events, iCalendar export file
  - **Google Contacts**: All contact groups, contacts, and CSV export file
  - **Required:** [OAuth 2.0 Client ID and Secret](https://support.google.com/cloud/answer/6158849) with Google Calendar API, CalDAV API, and People API enabled

Most of these steps are configurable in one way or the other, please refer to the [`ExecutionStep` type in `executor.ts`](src/executor.ts) for more details.

After installing [Node.js](https://nodejs.org/en/download) and running `npm install`, you can use the tool by doing:

```sh
npm start -- my-config.json
```

The configuration file can also reference environment variables or make use of pre-defined defaults. For more information on how to consume this, refer to [main.ts](src/main.ts).

Here's a simple example of a configuration file that uses all the available steps:

```json
{
  "variables": {
    "OUTPUT_DIR": "/tmp/export-output",
    "CLOUDFLARE_TOKEN": "{your-token}",
    "GITHUB_API_URL": "https://api.github.com",
    "GITHUB_USERNAME": "{your-username}",
    "GITHUB_TOKEN": "$your_personal_access_token_as_env_var",
    "GITHUB_REPO": "MariusFreitag/cloudservice-api-export",
    "GOOGLE_CLIENT_ID": "{your-client-id}",
    "GOOGLE_CLIENT_SECRET": "{your-client-secret}"
  }
}
```

## Development

- Install dependencies using `npm install`
- Build the project using `npm run build`
- Format the source code with `npm run format`
- Execute the program using `npm start [-- {config-path}]`

Feel free to explore the code and make any necessary changes to modify its behavior, as well as enhancing existing or adding new features.
