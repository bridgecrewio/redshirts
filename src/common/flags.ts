import { Flags } from "@oclif/core";
import { HelpGroup, OutputFormat, SortField } from "./types";
import { DEFAULT_DAYS } from "./utils";

export const commonFlags = {
    output: Flags.enum({
        description: "Output format for displaying data. Defaults to 'summary', which is a console-friendly tabular output. To see full committer details, instead of just the unique count (total and per repo), use 'json'.",
        char: 'o',
        options: Object.values(OutputFormat),
        default: OutputFormat.Summary,
        helpGroup: HelpGroup.OUTPUT
    }),
    repos: Flags.string({
        description: 'Repository names to fetch, as a comma-separated list of fully qualified path (e.g., owner/repo, group/subgroup/project, etc). For systems where the repo display name can differ from the repo URL / slug (e.g., Gitlab), the repo slug must be used. Takes precedence over --repos-file. If no repo or org / group list is provided, then the script will run over all repos for the token provided. Note that for some systems, this is not equivalent to a list of all possible repos. See the notes for each VCS for more information. If used with --orgs, --groups, etc, then this is a list of *additional* repos to fetch beyond the repos associated with the specified org(s) / group(s).',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'repo-file': Flags.file({
        description: 'The name of a file containing a list of repositories to fetch, one per line. See the --repos option for more details.',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'skip-repos': Flags.string({
        description: 'Repository names to skip - used in conjunction with the VCS --orgs, --groups, etc options to skip specific repos within those groupings, or to filter out repos if no repo / org list is specified at all. If the same repo is included in --repos and --skip-repos, then the repo will be skipped. Takes precedence over --skip-repo-file.',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'skip-repo-file': Flags.file({
        description: 'The name of a file containing repository names to skip, one per line. See --skip-repos for more details.',
        required: false,
        helpGroup: HelpGroup.REPO_SPEC
    }),
    'ca-cert': Flags.file({
        description: "Path to certificate chain to use in HTTP requests. See https://www.baeldung.com/linux/ssl-certificates for more information on obtaining a certificate chain for your environment.",
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
    })
};
