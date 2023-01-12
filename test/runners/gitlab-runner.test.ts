/* eslint-disable camelcase */
import { expect } from 'chai';
import { GitlabCommit, GitlabRepoResponse } from '../../src/vcs/gitlab/gitlab-types';
import { GitlabRunner } from '../../src/vcs/gitlab/gitlab-runner';
import { ContributorMap, Repo } from '../../src/common/types';

describe('gitlab runner repo conversion', () => {
    it('converts the repo response into generic repos', () => {
        const repos: GitlabRepoResponse[] = [
            {
                name: 'repo1',
                path: 'repo1',
                namespace: { full_path: 'group1' },
                visibility: 'private',
            },
            {
                name: 'repo2',
                path: 'repo2',
                namespace: { full_path: 'group1/subgroup1' },
                visibility: 'private',
            },
            {
                name: 'repo3',
                path: 'repo3',
                namespace: { full_path: 'group1/subgroup1/anothersubgroup' },
                visibility: 'private',
            },
            {
                name: 'repo4',
                path: 'repo4',
                namespace: { full_path: 'group1' },
                visibility: 'public',
            },
        ];

        expect(new GitlabRunner(null!, null!, null!).convertRepos(repos))
            .to.have.length(4)
            .and.to.have.deep.members([
                {
                    name: 'repo1',
                    owner: 'group1',
                    private: true,
                },
                {
                    name: 'repo2',
                    owner: 'group1/subgroup1',
                    private: true,
                },
                {
                    name: 'repo3',
                    owner: 'group1/subgroup1/anothersubgroup',
                    private: true,
                },
                {
                    name: 'repo4',
                    owner: 'group1',
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
        const commits: GitlabCommit[][] = [
            [
                {
                    author_name: 'user1',
                    author_email: 'user1@email.com',
                    authored_date: '2022-12-28T12:36:16.351Z',
                },
                {
                    author_name: 'user2',
                    author_email: 'user2@email.com',
                    authored_date: '2022-12-27T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@email.com',
                    authored_date: '2022-12-26T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@no-reply.com',
                    authored_date: '2022-12-25T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@noreply.com',
                    authored_date: '2022-12-24T12:36:16.351Z',
                },
            ],
            [
                {
                    author_name: 'user3',
                    author_email: 'user3@email.com',
                    authored_date: '2022-12-28T12:36:16.351Z',
                },
                {
                    author_name: 'user1',
                    author_email: 'user1@email.com',
                    authored_date: '2022-12-27T12:36:16.351Z',
                },
                {
                    author_name: 'user2',
                    author_email: 'user2@email.com',
                    authored_date: '2022-12-26T12:36:16.351Z',
                },
            ],
        ];

        const runner = new GitlabRunner(null!, null!, null!);

        for (const [i, repo] of repos.entries()) {
            runner.aggregateCommitContributors(repo, commits[i]);
        }

        expect(runner.contributorsByEmail.size).to.equal(3);
        expect(runner.contributorsByEmail.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].authored_date);
        expect(runner.contributorsByEmail.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].authored_date);
        expect(runner.contributorsByEmail.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].authored_date);

        const repo1 = runner.contributorsByRepo.get('org1/repo1') as ContributorMap;
        expect(repo1.size).to.equal(2);
        expect(repo1.get('user1@email.com')?.lastCommitDate).to.equal(commits[0][0].authored_date);
        expect(repo1.get('user2@email.com')?.lastCommitDate).to.equal(commits[0][1].authored_date);

        const repo2 = runner.contributorsByRepo.get('org2/repo2') as ContributorMap;
        expect(repo2.size).to.equal(3);
        expect(repo2.get('user1@email.com')?.lastCommitDate).to.equal(commits[1][1].authored_date);
        expect(repo2.get('user2@email.com')?.lastCommitDate).to.equal(commits[1][2].authored_date);
        expect(repo2.get('user3@email.com')?.lastCommitDate).to.equal(commits[1][0].authored_date);
    });
});
