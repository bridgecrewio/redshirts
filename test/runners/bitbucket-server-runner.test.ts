import { expect } from 'chai';
import {
    BitbucketServerCommit,
    BitbucketServerRepoResponse,
} from '../../src/vcs/bitbucketServer/bitbucket-server-types';
import { BitbucketServerRunner } from '../../src/vcs/bitbucketServer/bitbucket-server-runner';
import { ContributorMap, Repo } from '../../src/common/types';

// just covering the differences from github / generic VCS runners

describe('bitbucket server runner repo conversion', () => {
    it('converts the repo response into generic repos', () => {
        const repos: BitbucketServerRepoResponse[] = [
            {
                slug: 'repo1',
                project: { key: 'owner1' },
                public: false,
            },
            {
                slug: 'repo2',
                project: { key: 'owner2' },
                public: false,
            },
            {
                slug: 'repo3',
                project: { key: 'owner3' },
                public: true,
            },
        ] as BitbucketServerRepoResponse[];

        expect(new BitbucketServerRunner(null!, null!, null!).convertRepos(repos))
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

    // TODO filter emails
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
        const commits: BitbucketServerCommit[][] = [
            [
                {
                    author: {
                        emailAddress: 'user1@email.com',
                        name: 'user1',
                    },
                    authorTimestamp: 1673503200000,
                },
                {
                    author: {
                        emailAddress: 'user2@email.com',
                        name: 'user2',
                    },
                    authorTimestamp: 1673403200000,
                },
                {
                    author: {
                        emailAddress: 'user1@email.com',
                        name: 'user1',
                    },
                    authorTimestamp: 1673303200000,
                },
                {
                    author: {
                        emailAddress: 'user1@no-reply.com',
                        name: 'user1',
                    },
                    authorTimestamp: 1673203200000,
                },
                {
                    author: {
                        emailAddress: 'user1@noreply.com',
                        name: 'user1',
                    },
                    authorTimestamp: 1673103200000,
                },
            ],
            [
                {
                    author: {
                        emailAddress: 'user3@email.com',
                        name: 'user3',
                    },
                    authorTimestamp: 1673503200000,
                },
                {
                    author: {
                        emailAddress: 'user1@email.com',
                        name: 'user1',
                    },
                    authorTimestamp: 1673403200000,
                },
                {
                    author: {
                        emailAddress: 'user2@email.com',
                        name: 'user2',
                    },
                    authorTimestamp: 1673303200000,
                },
            ],
        ] as BitbucketServerCommit[][];

        const runner = new BitbucketServerRunner(null!, null!, null!);

        for (const [i, repo] of repos.entries()) {
            runner.aggregateCommitContributors(repo, commits[i]);
        }

        expect(runner.contributorsByEmail.size).to.equal(3);
        expect(runner.contributorsByEmail.get('user1@email.com')?.lastCommitDate).to.equal(
            new Date(commits[0][0].authorTimestamp).toISOString()
        );
        expect(runner.contributorsByEmail.get('user2@email.com')?.lastCommitDate).to.equal(
            new Date(commits[0][1].authorTimestamp).toISOString()
        );
        expect(runner.contributorsByEmail.get('user3@email.com')?.lastCommitDate).to.equal(
            new Date(commits[1][0].authorTimestamp).toISOString()
        );

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1.size).to.equal(2);
        expect(repo1.get('user1@email.com')?.lastCommitDate).to.equal(
            new Date(commits[0][0].authorTimestamp).toISOString()
        );
        expect(repo1.get('user2@email.com')?.lastCommitDate).to.equal(
            new Date(commits[0][1].authorTimestamp).toISOString()
        );

        const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
        expect(repo2.size).to.equal(3);
        expect(repo2.get('user1@email.com')?.lastCommitDate).to.equal(
            new Date(commits[1][1].authorTimestamp).toISOString()
        );
        expect(repo2.get('user2@email.com')?.lastCommitDate).to.equal(
            new Date(commits[1][2].authorTimestamp).toISOString()
        );
        expect(repo2.get('user3@email.com')?.lastCommitDate).to.equal(
            new Date(commits[1][0].authorTimestamp).toISOString()
        );
    });
});
