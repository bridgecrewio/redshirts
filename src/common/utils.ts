import { readFileSync } from 'node:fs';
import { Repo } from './types';

export const getXDaysAgoDate = (nDaysAgo: number): Date => {
   const xDaysAgo = new Date();
   xDaysAgo.setDate(xDaysAgo.getDate() - nDaysAgo);
   return xDaysAgo;
};

export const stringToArr = (csv: string): string[] => {
   return csv.replace(/ /g, '').split(',');
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const jsonReportReplacer = (_key: any, value: any): any => {
   // serialization function for JSON report
   if (value instanceof Set) {
      return [...value];
   } else if (value instanceof Map) {
      return Object.fromEntries(value);
   }
   
   return value;
};

export const getFileBuffer = (path: string): Buffer => {
   return readFileSync(path);
};

export const getFileContents = (path: string): string => {
   return getFileBuffer(path).toString();
};

export const getRepos = (repos: string[]): Repo[] => {
   // converts a string[] of repo names to Repo objects, validating that they have at least 1 slash
   return repos.filter(r => r.length).map(r => {
      const s = r.lastIndexOf('/');
      if (s === -1) {
         throw new Error(`Invalid repo name (must have at least one slash): ${r}`);
      }

      return {
         owner: r.slice(0, s),
         name: r.slice(s + 1)
      };
   });
};

export const splitRepos = (repoString: string): Repo[] => {
   return getRepos(stringToArr(repoString));
};

export const readRepoFile = (path: string): Repo[] => {
   return getRepos(getFileContents(path).split('\n').map(s => s.trim()));
};
