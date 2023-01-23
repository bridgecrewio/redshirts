import { expect } from 'chai';
import { GithubCommit, GithubRepoResponse } from '../../src/vcs/github/github-types';
import { GithubRunner } from '../../src/vcs/github/github-runner';
import { ContributorMap, Repo } from '../../src/common/types';

describe('github runner', () => {
    it('converts the repo response into generic repos', () => {
        const repos: GithubRepoResponse[] = [
            {
                name: 'repo1',
                owner: { login: 'owner1' },
                private: true,
            },
            {
                name: 'repo2',
                owner: { login: 'owner2' },
                private: true,
            },
            {
                name: 'repo3',
                owner: { login: 'owner3' },
                private: false,
            },
        ];

        expect(new GithubRunner(null!, null!, null!).convertRepos(repos))
            .to.have.length(3)
            .and.to.have.deep.members([
                {
                    name: 'repo1',
                    owner: 'owner1',
                    private: true,
                },
                {
                    name: 'repo2',
                    owner: 'owner2',
                    private: true,
                },
                {
                    name: 'repo3',
                    owner: 'owner3',
                    private: false,
                },
            ]);
    });

    it('aggregates contributors', () => {
        const repos: Repo[] = [
            {
                owner: 'org1',
                name: 'repo1',
            },
            {
                owner: 'org2',
                name: 'repo2',
            },
        ];

        // 2D array to match repo array
        const commits: GithubCommit[][] = [
            [
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'user1',
                            email: 'user1@email.com',
                            date: '2022-12-28T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user2' },
                    commit: {
                        author: {
                            name: 'user2',
                            email: 'user2@email.com',
                            date: '2022-12-27T12:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'user1',
                            email: 'user1@email.com',
                            date: '2022-12-27T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'noreply',
                            email: 'thiscounts@no-reply.com',
                            date: '2022-12-27T16:35:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'noreply',
                            email: 'thisalsocounts@noreply.com',
                            date: '2022-12-27T16:34:16.351Z',
                        },
                    },
                },
            ],
            [
                {
                    author: { login: 'user3' },
                    commit: {
                        author: {
                            name: 'user3',
                            email: 'user3@email.com',
                            date: '2022-12-30T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user1' },
                    commit: {
                        author: {
                            name: 'user1',
                            email: 'user1@email.com',
                            date: '2022-12-29T16:36:16.351Z',
                        },
                    },
                },
                {
                    author: { login: 'user2' },
                    commit: {
                        author: {
                            name: 'user2',
                            email: 'user2@email.com',
                            date: '2022-12-24T12:36:16.351Z',
                        },
                    },
                },
            ],
        ];

        const runner = new GithubRunner(null!, null!, null!);

        for (const [i, repo] of repos.entries()) {
            runner.aggregateCommitContributors(repo, commits[i]);
        }

        expect(runner.contributorsByEmail.size).to.equal(5);
        expect(runner.contributorsByEmail.get('user1@email.com')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
        expect(runner.contributorsByEmail.get('user2@email.com')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');
        expect(runner.contributorsByEmail.get('user3@email.com')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1.size).to.equal(4);
        expect(repo1.get('user1@email.com')?.lastCommitDate).to.equal('2022-12-28T16:36:16.351Z');
        expect(repo1.get('user2@email.com')?.lastCommitDate).to.equal('2022-12-27T12:36:16.351Z');

        const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
        expect(repo2.size).to.equal(3);
        expect(repo2.get('user1@email.com')?.lastCommitDate).to.equal('2022-12-29T16:36:16.351Z');
        expect(repo2.get('user2@email.com')?.lastCommitDate).to.equal('2022-12-24T12:36:16.351Z');
        expect(repo2.get('user3@email.com')?.lastCommitDate).to.equal('2022-12-30T16:36:16.351Z');
    });

    it('excludes specified emails', () => {
        const skippedEmails = [
            '41898282+github-actions[bot]@users.noreply.github.com',
            '49699333+dependabot[bot]@users.noreply.github.com',
            'action@github.com',
            '60663194+bridgecrew[bot]@users.noreply.github.com',
            '89982750+prisma-cloud-devsecops[bot]@users.noreply.github.com',
            'github-actions[bot]@users.noreply.github.com',
            'commits-noreply@bitbucket.org',
        ];

        const repo: Repo = {
            owner: 'org1',
            name: 'repo1',
        };

        const commits: GithubCommit[] = skippedEmails.map((email: string) => {
            return {
                author: { login: 'user1' },
                commit: {
                    author: {
                        name: 'user1',
                        email,
                        date: '2022-12-28T16:36:16.351Z',
                    },
                },
            };
        });

        const runner = new GithubRunner(null!, null!, null!);

        runner.aggregateCommitContributors(repo, commits);

        expect(runner.contributorsByEmail.size).to.equal(0);

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1).to.be.undefined;
    });
});
