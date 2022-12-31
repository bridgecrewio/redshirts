import { LOGGER } from "../../common/utils";
import { BitbucketCommit } from "./bitbucket-types";

const RAW_EMAIL_REGEX = /.+<(.+)>/;

export const getBitbucketDateCompareFunction = (date: Date): (cs: BitbucketCommit) => boolean => {
    // returns a function that returns true if the commit's timestamp is older than
    // the date passed to this function

    // ISO string format:     2022-12-27T20:36:25.347Z
    // BB date string format: 2022-12-27T20:02:28+00:00 
    const dateString = date.toISOString().split('.')[0] + '+00:00';
    return (c: BitbucketCommit) => c.date < dateString;
};

export const extractEmailFromRawUser = (raw: string): string | null => {
    const match = raw.match(RAW_EMAIL_REGEX);
    if (!match) {
        LOGGER.debug(`Failed to extract email from raw user: ${raw}`);
        return null;
    }

    return match[1];
};
