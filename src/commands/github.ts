/* eslint-disable no-await-in-loop */
import { Command, Flags } from '@oclif/core';
import { AxiosError } from 'axios';
import { commonFlags } from '../common/flags';
import { printSummary } from '../common/output';
import { Repo, SourceInfo } from '../common/types';
import { readRepoFile, splitRepos, stringToArr } from '../common/utils';
import { GithubApiManager } from '../vcs/github/github-api-manager';
import { GithubCounter } from '../vcs/github/github-counter';
import { GithubRepoResponse } from '../vcs/github/github-types';

export default class Github extends Command {
   static description = 'Count active contributors for GitHub repos'

   static examples = [
      `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --repos bridgecrewio/checkov,try-bridgecrew/terragoat`,
      `$ <%= config.bin %> <%= command.id %> --token ghp_xxxx --orgs bridgecrewio,try-bridgecrew`,
   ]

   static flags = {
      token: Flags.string({
         char: 't',
         description: 'Github personal access token. This token must be tied to a user that has sufficient visibility of the repo(s) being counted.',
         required: true,
      }),
      orgs: Flags.string({
         description: 'Organization or user names for which to fetch repos. Takes precendence over the --repos option.',
         required: false,
      }),
      ...commonFlags,
   }

   async run(): Promise<void> {
      const { flags } = await this.parse(Github);
      let repos: Repo[] = [];
      const githubSourceInfo: SourceInfo = {
         url: 'https://api.github.com',
         token: flags.token,
      };
      const githubApi = new GithubApiManager(githubSourceInfo, flags.cert);
      const githubCounter = new GithubCounter();

      // fetch all repos for specified orgs
      if (flags.orgs) {
         const orgs = stringToArr(flags.orgs);
         for (const org of orgs) {
            try {
               console.debug(`Getting repos for org ${org}`);
               const orgRepos = (await githubApi.getOrgRepos(org));
               repos.push(...this.filterRepos(orgRepos));
            } catch (error) {
               if (error instanceof AxiosError) {
                  console.error(`Error getting repos for the org ${org}: ${error.message}`);
               } else {
                  console.error(`Error getting repos for the org ${org}:`);
                  console.error(error);
               }
             }
         }
      } else if (flags.repos) {
         repos = splitRepos(flags.repos);
      } else if (flags.repoFile) {
         repos = readRepoFile(flags.repoFile);
      } else {
         const userRepos = await githubApi.getUserRepos();
         repos = this.filterRepos(userRepos);
      }

      for (const repo of repos) {
         try {
            const commits = await githubApi.getCommits(repo, flags.days);
            githubCounter.aggregateCommitContributors(repo, commits);
         } catch (error) {
            if (error instanceof AxiosError) {
               console.error(`Failed to get commits for repo ${repo.owner}/${repo.name}. Reason: ${error.response?.data?.message}`);
            }
         }
      }

      printSummary(githubCounter, flags.output);
   }

   filterRepos(reposResponse: GithubRepoResponse[]): Repo[] {
      const filteredRepos: Repo[] = [];
      for (const repo of reposResponse) {
         filteredRepos.push({
            name: repo.name,
            owner: repo.owner.login,
            private: repo.private,
         });
      }

      return filteredRepos;
   }
}
