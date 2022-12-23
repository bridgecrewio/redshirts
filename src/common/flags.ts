import { Flags } from "@oclif/core";
import { OutputFormat } from "./types";

export const commonFlags = {
    output: Flags.enum({
       description: "Output format for displaying data. Defaults to 'summary'",
       char: 'o',
       options: Object.values(OutputFormat),
       required: true,
       default: OutputFormat.Summary,
    }),
    repos: Flags.string({
       description: 'Repository names to fetch, as a comma-separated list of fully qualified path (e.g., owner/repo, group/subgroup/project, etc). For systems where the repo display name can differ from the repo URL / slug (e.g., Gitlab), the repo slug must be used. If omitted, the tool will attempt to fetch contributor details for all repositories that the user has access to (all repos returned by the generic "get user repos" API call per VCS). Depending on the system and the nature of the user access, this may or may not work completely. It is recommended to always use either --repos or the VCS-specific organization / group option (--orgs, --groups, etc). Takes precedence over --reposFile.',
       required: false,
    }),
    repoFile: Flags.file({
        description: 'The name of a file containing a list of repositories to fetch, one per line. See the --repos option for more details.',
        required: false,
        aliases: ['repo-file']
     }),
    cert: Flags.file({
       description: "Path to certificate chain to use in HTTP requests",
       required: false,
       aliases: ['ca-cert']
    }),
    days: Flags.integer({
        description: "The number of days for which to fetch commit history. Defaults to 90, which is the value used in the Prisma Cloud platform. It is not recommended to change this except for experimentation purposes.",
        required: false,
        char: 'd',
        default: 90
    })
 };