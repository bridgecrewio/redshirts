import { AxiosError } from 'axios';
import * as Listr from 'listr';
import { ApiManager } from './api-manager';
import { printSummary } from './output';
import { Commit, ContributorMap, Repo, RepoResponse, SourceInfo, VCSCommit, VcsSourceInfo } from './types';
import { DEFAULT_DAYS, getXDaysAgoDate, isSslError, logError, LOGGER } from './utils';

// TODO
// - author vs committer - use author always (not committer)
// - test on windows

const EXCLUDED_EMAIL_REGEXES: RegExp[] = [/noreply/, /no-reply/];

export abstract class BaseRunner {
    sourceInfo: SourceInfo;
    excludedEmailRegexes: RegExp[];
    contributorsByEmail: ContributorMap;
    contributorsByRepo: Map<string, ContributorMap>;
    flags: any;
    apiManager: ApiManager;
    repoSeparator: string;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(
        sourceInfo: SourceInfo,
        excludedEmailRegexes: Array<string>,
        flags: any,
        apiManager: ApiManager,
        repoSeparator = '/'
    ) {
        this.sourceInfo = sourceInfo;
        this.excludedEmailRegexes = [...EXCLUDED_EMAIL_REGEXES, ...excludedEmailRegexes.map((s) => new RegExp(s))];
        this.contributorsByEmail = new Map();
        this.contributorsByRepo = new Map();
        this.flags = flags;
        this.apiManager = apiManager;
        this.repoSeparator = repoSeparator;
    }

    abstract aggregateCommitContributors(repo: Repo, commits: VCSCommit[]): void;
    abstract convertRepos(reposResponse: RepoResponse[]): Repo[];
    abstract getRepoList(): Promise<Repo[]>;

    async execute(): Promise<void> {
        if (this.flags.days !== DEFAULT_DAYS) {
            LOGGER.warn(
                `Warning: you specified a --days value of ${this.flags.days}, which is different from the value used in the Prisma Cloud platform (${DEFAULT_DAYS}). Your results here will differ.`
            );
        }

        const sinceDate = getXDaysAgoDate(this.flags.days);
        LOGGER.info(`${this.flags.days} days ago: ${sinceDate.toISOString()}`);

        const tasks = new Listr(
            [
                {
                    title: 'Fetch list of repositories',
                    task: async (ctx) => {
                        ctx.repos = await this.getRepoList();
                    },
                },
                {
                    title: 'Process repositories',
                    task: async (ctx, task) => {
                        const reposCount = ctx.repos.length;
                        let currentRepo = 1;
                        for (const repo of ctx.repos) {
                            task.title = `Processing repositories: ${currentRepo}/${reposCount}`;
                            await this.processRepo(repo, sinceDate);
                            currentRepo++;
                        }
                    },
                },
            ],
            {
                nonTTYRenderer: 'silent',
            }
        );

        try {
            await tasks.run();
        } catch (error) {
            if (error instanceof AxiosError && isSslError(error)) {
                // if we ever encounter an SSL error, we cannot continue. This method expects getRepoList to raise any SSL error it encounters, as soon as it encounters one
                const sourceInfo = this.sourceInfo as VcsSourceInfo;
                logError(
                    error,
                    `Received an SSL error while connecting to the server at url ${sourceInfo.url}: ${error.code}: ${error.message}. This is usually caused by a VPN in your environment. Please try using the --ca-cert option to provide a valid certificate chain.`
                );
            }

            throw error;
        }

        printSummary(this, this.flags.output, this.flags.sort);
    }

    async processRepo(repo: Repo, sinceDate: Date): Promise<void> {
        try {
            LOGGER.debug(`Getting commits for ${this.sourceInfo.repoTerm}s ${repo.owner}/${repo.name}`);
            const commits: VCSCommit[] = await this.apiManager.getCommits(repo, sinceDate);
            LOGGER.debug(`Found ${commits.length} commits`);
            if (commits.length > 0) {
                this.aggregateCommitContributors(repo, commits);
            } else if (!this.flags['exclude-empty']) {
                this.addEmptyRepo(repo);
            }
        } catch (error) {
            if (error instanceof AxiosError && isSslError(error)) {
                throw error;
            }

            let message = `Failed to get commits for ${this.sourceInfo.repoTerm} ${repo.owner}/${repo.name}`;
            if (error instanceof AxiosError) {
                message += ` - the API returned an error: ${error.message}`;
            }

            logError(error as Error, message);
        }
    }

    addEmptyRepo(repo: Repo): void {
        // Adds a repo that has no commits to the aggregation
        const repoPath = repo.owner + '/' + repo.name;
        this.contributorsByRepo.set(repoPath, new Map());
    }

    skipUser(email: string): boolean {
        return this.excludedEmailRegexes.some((re) => re.exec(email) !== null);
    }

    addContributor(repoOwner: string, repoName: string, commit: Commit): void {
        // Adds a contributor for the repo and the global list, updating the contributor metadata if necessary (email and last commit)

        const repoPath = repoOwner + this.repoSeparator + repoName;

        if (this.skipUser(commit.email)) {
            LOGGER.debug(`Skipping email ${commit.email} for repo ${repoPath}`);
            return;
        }

        let repoContributors = this.contributorsByRepo.get(repoPath);

        if (!repoContributors) {
            LOGGER.debug(`Creating new contributors map for repo ${repoPath}`);
            repoContributors = new Map();
            this.contributorsByRepo.set(repoPath, repoContributors);
        }

        const { username, email, commitDate } = commit;

        // handle the 2 maps separately so that we can track commit dates per repo and globally
        this.upsertContributor(repoContributors, username, email, commitDate, true);
        this.upsertContributor(this.contributorsByEmail, username, email, commitDate);
    }

    upsertContributor(
        contributorMap: ContributorMap,
        username: string,
        email: string,
        commitDate: string,
        logNew = false
    ): void {
        const contributor = contributorMap.get(email);

        if (contributor) {
            contributor.usernames.add(email);
            if (contributor.lastCommitDate < commitDate) {
                contributor.lastCommitDate = commitDate;
            }
        } else {
            if (logNew) {
                LOGGER.debug(`Found new contributor: ${email}, ${username}`);
            }

            contributorMap.set(email, {
                email,
                usernames: new Set([username]),
                lastCommitDate: commitDate,
            });
        }
    }
}
