import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path = require('path');
import { BaseRunner } from '../../common/base-runner';
import { Repo, SourceInfo } from '../../common/types';
import { fileToLines, LOGGER, stringToArr } from '../../common/utils';
import { LocalApiManager } from './local-api-manager';
import { LocalCommit, LocalRepoResponse } from './local-types';

export class LocalRunner extends BaseRunner {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: SourceInfo, flags: any, apiManager: LocalApiManager) {
        super(sourceInfo, [], flags, apiManager, path.sep);
        this.apiManager = apiManager;
    }

    aggregateCommitContributors(repo: Repo, commits: LocalCommit[]): void {
        LOGGER.debug(`Processing commits for repo ${repo.owner}/${repo.name}`);
        for (const commitObject of commits) {
            const newCommit = {
                username: commitObject.name,
                email: commitObject.email,
                commitDate: new Date(commitObject.timestamp).toISOString(),
            };

            this.addContributor(repo.owner, repo.name, newCommit);
        }
    }

    convertRepos(reposResponse: LocalRepoResponse[]): Repo[] {
        const filteredRepos: Repo[] = [];
        for (const repo of reposResponse) {
            filteredRepos.push({
                name: path.basename(repo.path),
                owner: path.dirname(repo.path),
            });
        }

        return filteredRepos;
    }

    async getRepoList(): Promise<Repo[]> {
        if (this.flags.directories && this.flags['directory-file']) {
            LOGGER.warn(
                'You specified both "--directories" and "--directory-file". "--directory-file" will be ignored.'
            );
        }

        if (this.flags['skip-directories'] && this.flags['skip-directory-file']) {
            LOGGER.warn(
                'You specified both "--skip-directories" and "--skip-directory-file". "--skip-directory-file" will be ignored.'
            );
        }

        const reposList: string | undefined = this.flags.directories;
        const reposFile: string | undefined = this.flags['directory-file'];
        const skipReposList: string | undefined = this.flags['skip-directories'];
        const skipReposFile: string | undefined = this.flags['skip-directory-file'];

        // we already checked for repos or file being present
        const directoriesToScan = reposList ? stringToArr(reposList) : fileToLines(reposFile!);
        const directoriesToSkip = skipReposList
            ? stringToArr(skipReposList)
            : skipReposFile
            ? fileToLines(skipReposFile)
            : [];

        const repos = this.findRepoDirectories(directoriesToScan, directoriesToSkip);

        LOGGER.debug(`Final repo list: ${repos.map((r) => r.path)}`);

        return this.convertRepos(repos);
    }

    findRepoDirectories(directoriesToScan: string[], directoriesToSkip: string[]): LocalRepoResponse[] {
        const scanAbsPaths = directoriesToScan
            .map((r) => path.resolve(r))
            .filter((p) => {
                if (existsSync(p)) {
                    return true;
                } else {
                    LOGGER.debug(`Skipping non-existent path ${p}`);
                    return false;
                }
            });
        const skipAbsPaths = directoriesToSkip.map((r) => path.resolve(r));

        LOGGER.debug(scanAbsPaths);
        LOGGER.debug(skipAbsPaths);

        const foundRepos: string[] = [];
        for (const p of scanAbsPaths) {
            LOGGER.debug(`Looking for .git in ${p} and subdirectories`);
            this.searchForGitRepos(p, skipAbsPaths, foundRepos);
        }

        return foundRepos.map((r) => {
            return { path: r };
        });
    }

    searchForGitRepos(start: string, skip: string[], foundRepos: string[]): void {
        // traverses the directory tree starting at `start`, looking for .git directories
        // once .git is found, that directory is not traversed deeper
        // appends all repo directories (the parent of the .git directory) to the specified array
        if (!lstatSync(start).isDirectory()) {
            LOGGER.debug(`searchForGitRepos called on non-directory: ${start} - skipping`);
            return;
        }

        if (skip.includes(start)) {
            LOGGER.debug(`searchForGitRepos called on directory in the skip list: ${start} - skipping`);
            return;
        }

        const dotGitPath = path.join(start, '.git');

        // base case
        if (existsSync(dotGitPath)) {
            LOGGER.debug(`Found ${dotGitPath}`);
            foundRepos.push(start);
            return;
        }

        try {
            for (const p of readdirSync(start)) {
                const absPath = path.join(start, p);
                if (lstatSync(absPath).isDirectory()) {
                    this.searchForGitRepos(absPath, skip, foundRepos);
                }
            }
        } catch (error) {
            LOGGER.debug(`Got error traversing directory: ${start}. Skipping. ${error}`);
        }
    }
}
