import { readFileSync } from 'node:fs';
import { Repo, SourceInfo } from './types';

export const DEFAULT_DAYS = 90;

export const getXDaysAgoDate = (nDaysAgo: number, fromDate = new Date()): Date => {
    const xDaysAgo = new Date(fromDate);
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

export const getRepos = (repos: string[], minPathLength = 2, maxPathLength = 2): Repo[] => {
    // converts a string[] of repo names to Repo objects, validating that they have at least 1 slash
    return repos.filter(r => r.length).map(r => {
        const s = r.split('/');
        if (s.length < minPathLength || s.length > maxPathLength) {
            throw new Error(`Invalid repo name (must have ${minPathLength === maxPathLength ? `exactly ${minPathLength}` : `at least ${minPathLength} and max ${maxPathLength}`} parts): ${r}`);
        }

        return {
            owner: s.slice(0, -1).join('/'),
            name: s[s.length - 1]
        };
    });
};

export const splitRepos = (repoString: string, minPathLength = 2, maxPathLength = 2): Repo[] => {
    return getRepos(stringToArr(repoString), minPathLength, maxPathLength);
};

export const readRepoFile = (path: string, minPathLength = 2, maxPathLength = 2): Repo[] => {
    return getRepos(getFileContents(path).split('\n').map(s => s.trim()), minPathLength, maxPathLength);
};

export const mapIterable = <T, U>(it: Iterable<T>, callbackfn: (value: T, index: number, it: Iterable<T>) => U): U[] => {
    const arr = [];

    let i = 0;
    for (const e of it) {
        arr.push(callbackfn(e, i, it));
        i++;
    }

    return arr;
};

export const reduceIterable = <T, U>(it: Iterable<T>, callbackfn: (prev: U, next: T, index: number, it: Iterable<T>) => U, initial: U): U => {
    // simple 'reduce' implementation that requires an initial value (and thus removes a lot of the edge cases)
    let i = 0;
    for (const e of it) {
        initial = callbackfn(initial, e, i, it);
        i++;
    }

    return initial;
};

export const repoMatches = (repo1: Repo, repo2: Repo): boolean => {
    return repo1.owner === repo2.owner && repo1.name === repo2.name;
};

export const getRepoListFromParams = (minPathLength: number, maxPathLength: number, reposList?: string, reposFile?: string): Repo[] => {
    let repos: Repo[] = [];

    if (reposList) {
        repos = splitRepos(reposList, minPathLength, maxPathLength);
    } else if (reposFile) {
        repos = readRepoFile(reposFile, minPathLength, maxPathLength);
    }

    return repos;
};

export const getExplicitRepoList = (sourceInfo: SourceInfo, repos: Repo[], reposList?: string, reposFile?: string): Repo[] => {
    const explicitRepos = getRepoListFromParams(sourceInfo.minPathLength, sourceInfo.maxPathLength, reposList, reposFile);

    const addedRepos: Repo[] = [];

    for (const repo of explicitRepos) {
        if (repos.some(r => repoMatches(r, repo))) {
            console.debug(`Skipping adding ${sourceInfo.repoTerm} ${repo.owner}/${repo.name} as we already got it from the ${sourceInfo.orgTerm}`);
        } else {
            addedRepos.push(repo);
        }
    }

    return addedRepos;
};

export const filterRepoList = (
    repos: Repo[],
    filterList: { owner: string, name: string }[],
    objectType: string,
    filterfn: (repo: { owner: string, name: string }, filter: { owner: string, name: string }) => boolean = repoMatches
): Repo[] => {
    if (filterList.length > 0) {
        repos = repos.filter(r => {
            if (filterList.some(s => filterfn(r, s))) {
                console.debug(`Removing explicitly skipped ${objectType} ${r.owner}/${r.name}`);
                return false;
            } else {
                return true;
            }
        });
    }

    return repos;
};