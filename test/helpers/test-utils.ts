export const getDefaultFlags = (...flags: any[]): any => {
    const ret: any = {};

    for (const flagSet of flags) {
        for (const flag of Object.keys(flagSet)) {
            if (flagSet[flag].default) {
                ret[flag] = flagSet[flag].default;
            }
        }
    }

    return ret;
};
