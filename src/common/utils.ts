import { Flags } from '@oclif/core'
import { readFileSync } from 'node:fs'
import { OutputFormat, Repo } from './types'

export const getXDaysAgoDate = (nDaysAgo: number): Date => {
   const xDaysAgo = new Date()
   xDaysAgo.setDate(xDaysAgo.getDate() - nDaysAgo)
   return xDaysAgo
}

export const stringToArr = (csv: string): string[] => {
   return csv.replace(/ /g, '').split(',')
}

export const commonFlags = {
   output: Flags.enum({
      description: "Output format for displaying data. Defaults to 'summary'",
      char: 'o',
      options: Object.values(OutputFormat),
      required: true,
      default: OutputFormat.Summary,
   }),
   repos: Flags.string({
      description: 'Repository names to fetch, as a comma-separated list of fully qualified path (e.g., owner/repo). If omitted, the tool will attempt to fetch contributor details for all repositories that the user has explicit access to (all repos returned by the generic "get user repos" API call per VCS).',
      required: false,
   }),
   cert: Flags.file({
      description: "Path to certificate chain to use in HTTP requests",
      required: false,
      aliases: ['ca-cert']
   })
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const jsonReportReplacer = (_key: any, value: any): any => {
   // serialization function for JSON report
   if (value instanceof Set) {
      return [...value];
   } else if (value instanceof Map) {
      return Object.fromEntries(value);
   }
   
   return value;
}

export const readFile = (path: string): Buffer => {
   return readFileSync(path);
};

export const splitRepos = (repoString: string): Repo[] => {
   return stringToArr(repoString).map(r => {
      const s = r.lastIndexOf('/');
      if (s === -1) {
         throw new Error(`Invalid repo name (must have at least one slash): ${r}`);
      }

      return {
         owner: r.slice(0, s),
         name: r.slice(s + 1)
      };
   });
}
