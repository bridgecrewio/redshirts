import { Flags } from "@oclif/core";
import { OptionFlag } from "@oclif/core/lib/interfaces";
import { LOG_API_RESPONSES_ENV } from "./api-manager";
import { HelpGroup, OutputFormat, Protocol, SortField } from "./types";
import { DEFAULT_DAYS, DEFAULT_LOG_LEVEL, DISABLE_LOG_ENV_VAR, LOG_LEVELS } from "./utils";

export const commonFlags = {
    output: Flags.enum({
        description: "Output format for displaying data. Defaults to 'summary', which is a console-friendly tabular output. To see full committer details, instead of just the unique count (total and per repo), use 'json'.",
        char: 'o',
        options: Object.values(OutputFormat),
        default: OutputFormat.Summary,
        helpGroup: HelpGroup.OUTPUT
    }),
    'ca-cert': Flags.file({
        description: "Path to certificate chain to use in HTTP requests. See https://www.baeldung.com/linux/ssl-certificates for more information on obtaining a certificate chain for your environment. Note that for some systems, the hostname for the API endpoint may be different from the hostname you visit in a browser (e.g., api.github.com vs. github.com). Be sure to obtain a certificate for the correct hostname.",
        required: false,
        helpGroup: HelpGroup.CONNECTION
    }),
    days: Flags.integer({
        description: "The number of days for which to fetch commit history. Defaults to 90, which is the value used in the Prisma Cloud platform. It is not recommended to change this except for experimentation purposes.",
        required: false,
        char: 'd',
        default: DEFAULT_DAYS,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    sort: Flags.enum({
        description: 'The output field on which to sort for CSV or console output: alphabetically by repo fully qualified name, or by descending contributor count (ignored for JSON)',
        options: Object.values(SortField),
        default: SortField.REPO,
        helpGroup: HelpGroup.OUTPUT
    }),
    'exclude-empty': Flags.boolean({
        description: 'Do not include repos with no commits in the output',
        helpGroup: HelpGroup.OUTPUT
    }),
    'include-public': Flags.boolean({
        description: 'The platform only counts contributors in private repos (and "internal" repos for some enterprise systems). If you wish to see contributors in public repos, for informational or other purposes, use this flag. This will also cause Redshirts to skip checking if a repo is public, so it can speed up the runtime if you know you are only supplying private repos, or mostly private repos, using --repos, --orgs, etc.',
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'log-level': Flags.enum({
        description: `Set the log level for the execution. Can also be set with the LOG_LEVEL environment variable. Use 'debug' for granular logging, which will be required for any support cases. You can log individual responses using the environment variable ${LOG_API_RESPONSES_ENV}=true. You can also disable all logging by setting ${DISABLE_LOG_ENV_VAR}=true as an environment variable. This is not recommended, as you may miss important processing messages. All logs will be written to the stderr stream.`,
        options: LOG_LEVELS,
        env: 'LOG_LEVEL',
        default: DEFAULT_LOG_LEVEL,
        helpGroup: HelpGroup.OUTPUT
    })
};

// these are common to all the VCSes but not to local, so keep them separate
export const repoFlags = {
    repos: Flags.string({
        description: 'A comma-separated list of repository names to fetch, as fully qualified paths (e.g., owner/repo, group/subgroup/project, etc). For systems where the repo display name can differ from the repo URL / slug (e.g., Gitlab), the repo slug must be used. Takes precedence over --repos-file. If no repo or org / group list is provided, then the script will run over all repos for the token provided. Note that for some systems, this is not equivalent to a list of all possible repos. See the notes for each VCS for more information. If used with --orgs, --groups, etc, then this is a list of *additional* repos to fetch beyond the repos associated with the specified org(s) / group(s).',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'repo-file': Flags.file({
        description: 'The name of a file containing a list of repositories to fetch, one per line. See the --repos option for more details.',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'skip-repos': Flags.string({
        description: 'A comma-separated list of repository names to skip - used in conjunction with the VCS --orgs, --groups, etc options to skip specific repos within those groupings, or to filter out repos if no repo / org list is specified at all. If the same repo is included in --repos and --skip-repos, then the repo will be skipped. Takes precedence over --skip-repo-file.',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'skip-repo-file': Flags.file({
        description: 'The name of a file containing repository names to skip, one per line. See --skip-repos for more details.',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    })
};

// ... but combine them for convenience
export const vcsFlags = {
    ...commonFlags,
    ...repoFlags
};

export const vcsServerFlags = {
    hostname: Flags.string({
        description: 'The hostname of your server, e.g. `git.mycompany.com`. Do not include the port and protocol here (see --port and --protocol).',
        char: 'h',
        required: true,
        helpGroup: HelpGroup.CONNECTION
    }),
    port: Flags.integer({
        description: 'The port of your server, if not a standard port (443 for https, or 80 for http).',
        char: 'p',
        required: false,
        helpGroup: HelpGroup.CONNECTION
    }),
    protocol: Flags.enum({
        description: 'Protocol for your server, https (default) or http. Affects the default port value if you do not specify a port. You must specify a protocol here, not in the hostname.',
        options: Object.values(Protocol),
        required: false,
        default: Protocol.HTTPS,
        helpGroup: HelpGroup.CONNECTION
    })
};

export const throttlingFlags = {
    'requests-per-hour': Flags.integer({
        description: 'The maximum number of requests to the server per hour. Requests will be throttled and spread to achieve this limit. For example, if you specify a value of 60 here, one request per minute will be submitted. Use this to adjust the throttling of the API calls in the event that the rate limit is being consumed by other sources simultaneously.',
        required: false,
        default: 1000,
        helpGroup: HelpGroup.CONNECTION
    }),
};

export const getThrottlingFlag = (defaultRequestsPerHour: number): { 'requests-per-hour': OptionFlag<number>; } => {
    return {
        'requests-per-hour': Flags.integer({
            description: 'The maximum number of requests to the server per hour. Requests will be throttled and spread to achieve this limit. For example, if you specify a value of 3600 here, approximately one request per second will be submitted. Use this to adjust the throttling of the API calls in the event that the rate limit is being consumed by other sources simultaneously. If you are running in a self-hosted server environment without API rate limits, you can also set this to a very high number to effectively disable throttling, but this may impact server performance.',
            required: false,
            default: defaultRequestsPerHour,
            helpGroup: HelpGroup.CONNECTION
        }),
    };
};
