/* eslint-disable no-case-declarations */
import { BaseRunner } from './base-runner';
import { OutputFormat, OutputTableRow, Report, SortField, SummaryReport } from './types';
import { jsonReportReplacer, mapIterable } from './utils';
import { Table } from 'console-table-printer';

export const printSummary = (counter: BaseRunner, outputFormat: string, sortField: SortField): void => {
    switch (outputFormat) {
        case OutputFormat.JSON:
            console.log(JSON.stringify(generateReportObject(counter), jsonReportReplacer, 2));

            break;

        case OutputFormat.CSV:
            console.log('Repo,Unique contributors');

            const repos = mapIterable(counter.contributorsByRepo.entries(), (value): OutputTableRow => {
                return {
                    Repo: value[0],
                    Contributors: value[1].size,
                };
            });

            repos.sort(getSortFn(sortField));

            for (const repo of repos) {
                console.log(`${repo.Repo},${repo.Contributors}`);
            }

            console.log(`Total,${counter.contributorsByEmail.size}`);

            break;

        case OutputFormat.Summary:
            // TODO determine tabular output format (mainly the header with total)

            const table = new Table({
                title: 'Contributors per Repository',
                columns: [
                    {
                        name: 'Repo',
                        alignment: 'left',
                    },
                    {
                        name: 'Contributors',
                        alignment: 'left',
                    },
                ],
                sort: getSortFn(sortField),
            });

            for (const [repo, contributors] of counter.contributorsByRepo) {
                table.addRow({ Repo: repo, Contributors: contributors.size });
            }

            table.printTable();
            console.log(`Total unique contributors: ${counter.contributorsByEmail.size}`);

            break;
    }
};

const getSortFn = (sortField: SortField): ((repo1: OutputTableRow, repo2: OutputTableRow) => number) => {
    return (repo1: OutputTableRow, repo2: OutputTableRow): number => {
        return sortField === SortField.REPO
            ? repo1.Repo.localeCompare(repo2.Repo)
            : repo2.Contributors - repo1.Contributors;
    };
};

const generateReportObject = (counter: BaseRunner): SummaryReport => {
    const repos = new Map<string, Report>();

    for (const [repo, contributors] of counter.contributorsByRepo) {
        repos.set(repo, {
            totalContributors: contributors.size,
            contributors: [...contributors.values()],
        });
    }

    const report: SummaryReport = {
        totalContributors: counter.contributorsByEmail.size,
        contributors: [...counter.contributorsByEmail.values()],
        repos,
    };

    return report;
};
