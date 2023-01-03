import { AxiosError } from 'axios';
import { ApiManager } from './api-manager';
import { printSummary } from './output';
import { Commit, ContributorMap, Repo, RepoResponse, SourceInfo, VCSCommit, VcsSourceInfo } from './types';
import { DEFAULT_DAYS, getXDaysAgoDate, isSslError, logError, LOGGER } from './utils';

// TODO
// - all branches? (no?)
// - default to private only repos - should we explicitly check each repo for its visibility?
// - document specific permissions needed
// - public / private repos - include in output?
// - document getting a cert chain
// - some sort of errored repo list that is easy to review
// - author vs committer
// - rate limiting
// - clean up logging
// - test on windows

const EXCLUDED_EMAIL_REGEXES = [
    /noreply/,
    /no-reply/
];

export abstract class BaseRunner {
    sourceInfo: SourceInfo;
    excludedEmailRegexes: RegExp[];
    contributorsByEmail: ContributorMap;
    contributorsByRepo: Map<string, ContributorMap>;
    flags: any;
    apiManager: ApiManager;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: SourceInfo, excludedEmailRegexes: Array<string>, flags: any, apiManager: ApiManager) {
        this.sourceInfo = sourceInfo;
        this.excludedEmailRegexes = [...EXCLUDED_EMAIL_REGEXES, ...excludedEmailRegexes.map(s => new RegExp(s))];
        this.contributorsByEmail = new Map();
        this.contributorsByRepo = new Map();
        this.flags = flags;
        this.apiManager = apiManager; 
    }

    abstract aggregateCommitContributors(repo: Repo, commits: VCSCommit[]): void
    abstract convertRepos(reposResponse: RepoResponse[]): Repo[];
    abstract getRepoList(): Promise<Repo[]>;

    async execute(): Promise<void> {
        if (this.flags.days !== DEFAULT_DAYS) {
            LOGGER.warn(`Warning: you specified a --days value of ${this.flags.days}, which is different from the value used in the Prisma Cloud platform (${DEFAULT_DAYS}). Your results here will differ.`);
        }

        const sinceDate = getXDaysAgoDate(this.flags.days);

        // TODO better error handling

        try {
            const repos = await this.getRepoList();
            await this.processRepos(repos, sinceDate);
        } catch (error) {
            if (error instanceof AxiosError && isSslError(error)) {
                const sourceInfo = this.sourceInfo as VcsSourceInfo;
                logError(error, `Received an SSL error while connecting to the server at url ${sourceInfo.url}: ${error.code}: ${error.message}. This is usually caused by a VPN in your environment. Please try using the --ca-cert option to provide a valid certificate chain.`);
            }

            throw error;
        }

        printSummary(this, this.flags.output, this.flags.sort);
    }

    async processRepos(repos: Repo[], sinceDate: Date): Promise<void> {
        for (const repo of repos) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const commits: VCSCommit[] = await this.apiManager.getCommits(repo, sinceDate);
                if (commits.length > 0) {
                    this.aggregateCommitContributors(repo, commits);
                } else if (!this.flags['exclude-empty']) {
                    this.addEmptyRepo(repo);
                }
            } catch (error) {
                logError(error as Error, `Failed to get commits for ${this.sourceInfo.repoTerm} ${repo.owner}/${repo.name}`);
            }
        }
    }

    addEmptyRepo(repo: Repo): void {
        // Adds a repo that has no commits to the aggregation
        const repoPath = repo.owner + '/' + repo.name;
        this.contributorsByRepo.set(repoPath, new Map());
    }

    skipUser(email: string): boolean {
        return this.excludedEmailRegexes.some(re => re.exec(email) !== null);
    }

    addContributor(repoOwner: string, repoName: string, commit: Commit): void {
        // Adds a contributor for the repo and the global list, updating the contributor metadata if necessary (email and last commit)

        const repoPath = repoOwner + '/' + repoName;

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
        this.upsertContributor(repoContributors, username, email, commitDate);
        this.upsertContributor(this.contributorsByEmail, username, email, commitDate);
    }

    upsertContributor(contributorMap: ContributorMap, username: string, email: string, commitDate: string): void {
        const contributor = contributorMap.get(email);

        if (contributor) {
            contributor.usernames.add(email);
            if (contributor.lastCommitDate < commitDate) {
                contributor.lastCommitDate = commitDate;
            }
        } else {
            LOGGER.debug(`Found new contributor: ${email}, ${username}`);
            contributorMap.set(email, {
                email,
                usernames: new Set([username]),
                lastCommitDate: commitDate
            });
        }
    }
}
