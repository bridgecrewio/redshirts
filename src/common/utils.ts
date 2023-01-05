import { AxiosError } from 'axios';
import { readFileSync } from 'node:fs';
import { Protocol, Repo, VcsSourceInfo } from './types';
import * as winston from 'winston';
import { FlagBase } from '@oclif/core/lib/interfaces';
import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';

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

export const fileToLines = (path: string): string[] => {
    return getFileContents(path).split('\n').map(s => s.trim()).filter(s => s);
};

export const readRepoFile = (path: string, minPathLength = 2, maxPathLength = 2): Repo[] => {
    return getRepos(fileToLines(path), minPathLength, maxPathLength);
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

export const getExplicitRepoList = (sourceInfo: VcsSourceInfo, repos: Repo[], reposList?: string, reposFile?: string): Repo[] => {
    const explicitRepos = getRepoListFromParams(sourceInfo.minPathLength, sourceInfo.maxPathLength, reposList, reposFile);

    const addedRepos: Repo[] = [];

    for (const repo of explicitRepos) {
        if (repos.some(r => repoMatches(r, repo))) {
            LOGGER.debug(`Skipping adding ${sourceInfo.repoTerm} ${repo.owner}/${repo.name} as we already got it from the ${sourceInfo.orgTerm}`);
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
                LOGGER.debug(`Removing explicitly skipped ${objectType} ${r.owner}/${r.name}`);
                return false;
            } else {
                return true;
            }
        });
    }

    return repos;
};

export const getServerUrl = (hostname: string, port?: number, protocol = Protocol.HTTPS): string => {
    // builds a server URL from the parts, with some validation
    // it will strip off any leading protocol and rely on the passed protocol
    // it assumes any hostname specified with a protocol is a mistake

    if (hostname.startsWith('https://') || hostname.startsWith('http://')) {
        throw new Error('Hostname specified with a protocol. Use the --protocol option instead.');
    }

    let url = `${protocol}://${hostname}`;

    if (port) {
        url += `:${port}`;
    }

    return url;
};

export const isSslError = (error: AxiosError): boolean => {
    const keywords = ['CERT', 'SSL', 'VERIFY'];
    return keywords.some(k => error.code && error.code.includes(k));
};


const logFormat = winston.format.printf(({ level, message, timestamp, ...rest }) => {
    const error = rest.error && rest.error instanceof Error ? { error: { message: rest.error.message, stack: rest.error.stack}} : {};
    const argumentsString = JSON.stringify({ ...rest, ...error });
    return `${timestamp} [${level}]: ${message} ${argumentsString === '{}' ? '' : argumentsString}`;
});

const DEFAULT_LOG_LEVEL = 'warn';
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

const getLogLevel = (): string => {
    const envLevel = process.env.LOG_LEVEL;
    if (!envLevel) {
        return DEFAULT_LOG_LEVEL;
    } else if (LOG_LEVELS.includes(envLevel.toLowerCase())) {
        return envLevel.toLowerCase();
    } else {
        console.warn(`Found unknown LOG_LEVEL environment variable: ${envLevel}. Expected one of: ${LOG_LEVELS}. Reverting to "${DEFAULT_LOG_LEVEL}".`);
        return DEFAULT_LOG_LEVEL;
    }
};

export const LOGGER = winston.createLogger({
    level: getLogLevel(),
    transports: [
        new winston.transports.Console({
            stderrLevels: LOG_LEVELS,
            silent: process.env.DISABLE_LOGS === 'true'
        })
    ],
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.prettyPrint(),
        logFormat
    )
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const logError = (error: Error, message?: string, args?: any): void => {
    // if message exists, logs it at the error level along with any objects
    // (do not send the error as part of this)
    // then logs the error object at the debug level
    if (message) {
        LOGGER.error(message, args);
    }

    LOGGER.debug('', { error });
};

export const deleteFlagKey = (obj: {[key: string]: FlagBase<any, any>}, ...keys: string[]): {[key: string]: FlagBase<any, any>} => {
    for (const key of keys) {
        delete obj[key];
    }

    return obj;
};

export const splitAndCombine = (stringToSplit: string, delimiter: string, limit: number): string[] => {
    // splits a string and returns an array no longer than limit, but concatenates all remaining parts
    // of the string (inlike string.split with limit, which truncates the extra parts)
    let parts = stringToSplit.split(delimiter);
    if (parts.length >= limit) {
        parts = [...parts.slice(0, limit - 1), parts.slice(limit - 1).join(delimiter)];
    }

    return parts;
};

export const sleepUntilDateTime = async (until: Date): Promise<void> => {
    LOGGER.debug(`Sleeping until ${until.toLocaleString()}`);
    const now = new Date();
    const ms = until.getTime() - now.getTime();
    // eslint-disable-next-line no-promise-executor-return
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const sleepForDuration = async (ms: number): Promise<void> => {
    LOGGER.debug(`Sleeping for ${ms} ms`);
    // eslint-disable-next-line no-promise-executor-return
    return new Promise(resolve => setTimeout(resolve, ms));
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const objectToString = (obj: any): string => {
    return `{${Object.keys(obj).map(k => `${k}: ${obj[k]}`).join(', ')}}`;
};

export const exec = (command: string, args: string[], options: SpawnOptionsWithoutStdio): Promise<string> => {
    return new Promise((resolve, reject) => {        
        let stdout = '';
        let stderr = '';

        LOGGER.debug(`Executing command: ${command} ${args.join(' ')} with options ${objectToString(options)}`);

        const git = spawn(command, args, options);

        git.stdout.on('data', (data) => {
            stdout += data;
        });
        git.stderr.on('data', (data) => {
            stderr += data;
        });
        git.on('close', (code) => {
            LOGGER.debug(`${command} command exited with code ${code}`);
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr));
            }
        });

        git.on("error", (err) => {
            reject(err);
        });
    });
};
