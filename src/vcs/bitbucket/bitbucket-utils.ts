import { BitbucketCommit } from "./bitbucket-types";


const RAW_EMAIL_REGEX = /.+<(.+)>/;

export const getBitbucketDateCompareFunction = (date: Date): (cs: BitbucketCommit) => boolean => {
    // returns a function that returns true if the specified date string is older than
    // the date passed to this function

    // ISO string format:     2022-12-27T20:36:25.347Z
    // BB date string format: 2022-12-27T20:02:28+00:00 
    // (the BB format is expected in the param for the returned function)

    const dateString = date.toISOString().split('.')[0] + '+00:00';
    return (c: BitbucketCommit) => c.date < dateString;
};

export const extractEmailFromRawUser = (raw: string): string | null => {
    const match = raw.match(RAW_EMAIL_REGEX);
    return match ? match[1] : null;
};
