import { AxiosError } from 'axios';
import { ApiManager } from './api-manager';
import { printSummary } from './output';
import { Commit, ContributorMap, Repo, RepoResponse, SourceInfo } from './types';
import { DEFAULT_DAYS, filterRepoList, getExplicitRepoList, getRepoListFromParams, stringToArr } from './utils';

// TODO
// - get commits from all branches for all VCSes and git log
// - unique user identification per VCS
// - default to private only repos
// - document specific permissions needed
// - public / private repos

export abstract class BaseRunner {
    sourceInfo: SourceInfo;
    excludedUsers: string[];
    contributorsByUsername: ContributorMap;
    contributorsByRepo: Map<string, ContributorMap>;
    flags: any;
    apiManager: ApiManager;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(sourceInfo: SourceInfo, excludedUsers: Array<string>, flags: any, apiManager: ApiManager) {
        this.sourceInfo = sourceInfo;
        this.excludedUsers = excludedUsers;
        this.contributorsByUsername = new Map();
        this.contributorsByRepo = new Map();
        this.flags = flags;
        this.apiManager = apiManager;
    }

    abstract aggregateCommitContributors(repo: Repo, commits: Commit[]): void
    abstract convertRepos(reposResponse: RepoResponse[]): Repo[];

    async execute(): Promise<void> {
        if (this.flags.days !== DEFAULT_DAYS) {
            console.warn(`Warning: you specified a --days value of ${this.flags.days}, which is different from the value used in the Prisma Cloud platform (${DEFAULT_DAYS}). Your results here will differ.`);
        }

        const repos = await this.getRepoList();

        await this.processRepos(repos);

        printSummary(this, this.flags.output, this.flags.sort);
    }

    async getRepoList(): Promise<Repo[]> {

        const orgsString: string | undefined = this.flags[this.sourceInfo.orgFlagName];
        const reposList: string | undefined = this.flags.repos;
        const reposFile: string | undefined = this.flags['repo-file'];
        const skipReposList: string | undefined = this.flags['skip-repos'];
        const skipReposFile: string | undefined = this.flags['skip-repo-file'];

        let repos: Repo[] = [];

        if (orgsString) {
            repos = await this.getOrgRepos(orgsString);
            console.debug(`Got repos from org(s): ${repos.map(r => `${r.owner}/${r.name}`)}`);
        }

        const addedRepos = getExplicitRepoList(this.sourceInfo, repos, reposList, reposFile);

        if (addedRepos.length > 0) {
            console.debug(`Added repos from --repo list: ${addedRepos.map(r => `${r.owner}/${r.name}`)}`);
            repos.push(...addedRepos);
        }

        if (repos.length === 0) {
            console.debug('No explicitly specified repos - getting all user repos');
            repos = await this.getUserRepos();
        }

        const skipRepos = getRepoListFromParams(this.sourceInfo.minPathLength, this.sourceInfo.maxPathLength, skipReposList, skipReposFile);

        repos = filterRepoList(repos, skipRepos, this.sourceInfo.repoTerm);

        return repos;
    }

    async getOrgRepos(orgsString: string): Promise<Repo[]> {
        const repos: Repo[] = [];
        const orgs = stringToArr(orgsString);
        for (const org of orgs) {
            console.debug(`Getting ${this.sourceInfo.repoTerm}s for ${this.sourceInfo.orgTerm} ${org}`);
            try {
                // eslint-disable-next-line no-await-in-loop
                const orgRepos = (await this.apiManager.getOrgRepos(org));
                repos.push(...this.convertRepos(orgRepos));
            } catch (error) {
                if (error instanceof AxiosError) {
                    console.error(`Error getting ${this.sourceInfo.repoTerm}s for the ${this.sourceInfo.orgTerm} ${org}: ${error.message}`);
                } else {
                    console.error(`Error getting ${this.sourceInfo.repoTerm}s for the ${this.sourceInfo.orgTerm} ${org}:`);
                    console.error(error);
                }
            }
        }

        console.debug(`Found ${repos.length} ${this.sourceInfo.repoTerm}s for the specified ${this.sourceInfo.orgTerm}s`);
        return repos;
    }

    async getUserRepos(): Promise<Repo[]> {
        console.debug('No explicitly specified repos - getting all user repos');
        const userRepos = await this.apiManager.getUserRepos();
        console.debug(`Found ${userRepos.length} repos for the user`);
        const repos = this.convertRepos(userRepos);
        return repos;
    }

    async processRepos(repos: Repo[]): Promise<void> {
        for (const repo of repos) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const commits: Commit[] = await this.apiManager.getCommits(repo, this.flags.days);
                if (commits.length > 0) {
                    this.aggregateCommitContributors(repo, commits);
                } else {
                    this.addEmptyRepo(repo);
                }
            } catch (error) {
                if (error instanceof AxiosError) {
                    console.error(`Failed to get commits for ${this.sourceInfo.repoTerm} ${repo.owner}/${repo.name}. Reason: ${error.response?.data?.message}`);
                } else {
                    console.error(`Failed to get commits ${error}`);
                }
            }
        }
    }

    addEmptyRepo(repo: Repo): void {
        // Adds a repo that has no commits to the aggregation
        const repoPath = repo.owner + '/' + repo.name;
        this.contributorsByRepo.set(repoPath, new Map());
    }

    addContributor(repoOwner: string, repoName: string, commit: Commit): void {
        // Adds a contributor for the repo and the global list, updating the contributor metadata if necessary (email and last commit)

        const repoPath = repoOwner + '/' + repoName;

        let repoContributors = this.contributorsByRepo.get(repoPath);

        if (!repoContributors) {
            console.debug(`Creating new contributors map for repo ${repoPath}`);
            repoContributors = new Map();
            this.contributorsByRepo.set(repoPath, repoContributors);
        }

        const { username, email, commitDate } = commit;

        // handle the 2 maps separately so that we can track commit dates per repo and globally
        this.upsertContributor(repoContributors, username, email, commitDate);
        this.upsertContributor(this.contributorsByUsername, username, email, commitDate);
    }

    upsertContributor(contributorMap: ContributorMap, username: string, email: string, commitDate: string): void {
        const contributor = contributorMap.get(username);

        if (contributor) {
            contributor.emails.add(email);
            if (contributor.lastCommitDate < commitDate) {
                contributor.lastCommitDate = commitDate;
            }
        } else {
            console.debug(`Found new contributor: ${username}, ${email}`);
            contributorMap.set(username, {
                username,
                emails: new Set([email]),
                lastCommitDate: commitDate
            });
        }
    }
}