import { Flags } from "@oclif/core";
import { OutputFormat, SortField } from "./types";

export const commonFlags = {
   output: Flags.enum({
      description: "Output format for displaying data. Defaults to 'summary', which is a console-friendly tabular output. To see full committer details, instead of just the unique count (total and per repo), use 'json'.",
      char: 'o',
      options: Object.values(OutputFormat),
      default: OutputFormat.Summary,
   }),
   repos: Flags.string({
      description: 'Repository names to fetch, as a comma-separated list of fully qualified path (e.g., owner/repo, group/subgroup/project, etc). For systems where the repo display name can differ from the repo URL / slug (e.g., Gitlab), the repo slug must be used. Takes precedence over --reposFile. If no repo or org / group list is provided, then the script will run over all visible repos for the token provided.',
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
   }),
   sort: Flags.enum({
      description: 'The output field on which to sort for CSV or console output: alphabetically by repo fully qualified name, or by descending contributor count (ignored for JSON)',
      options: Object.values(SortField),
      default: SortField.REPO
   })
};
